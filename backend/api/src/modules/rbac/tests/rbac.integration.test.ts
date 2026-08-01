import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { roles as rolesTable } from '@/database/schema';
import { ConflictError, ForbiddenError, NotFoundError } from '@/errors';
import { createIdentityModule, type IdentityModule } from '@/modules/identity';

import {
  PERMISSIONS,
  ROLES,
  authorizePolicy,
  createRbacModule,
  definePolicy,
  isOwner,
  requirePermission,
  syncRbacCatalog,
  toAuthorizationContext,
  type RbacModule,
} from '../index';

function fakeRequest(userId: string): FastifyRequest {
  return { auth: { userId, sessionId: 'test-session' }, authz: null } as unknown as FastifyRequest;
}

const NOOP_REPLY = {} as unknown as FastifyReply;

describe('rbac module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let identity: IdentityModule;
  let rbac: RbacModule;

  beforeAll(async () => {
    client = new PGlite();
    const pgliteDb = drizzle(client);
    await migrate(pgliteDb, { migrationsFolder: 'drizzle' });
    db = pgliteDb as unknown as Database;
    identity = createIdentityModule(db);
    rbac = createRbacModule(db, { identity });
    await syncRbacCatalog(db);
  });

  afterAll(async () => {
    await client.close();
  });

  async function createUser(email: string): Promise<string> {
    const user = await identity.users.createUser({ email, password: 'Str0ngPass1' });
    return user.id;
  }

  async function roleId(key: string): Promise<string> {
    const rows = await db
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .where(eq(rolesTable.key, key));
    const id = rows[0]?.id;
    if (!id) {
      throw new Error(`Role ${key} not seeded`);
    }
    return id;
  }

  it('seeds the catalog (all permissions + super-admin system role)', async () => {
    const permissions = await rbac.permissions.listPermissions();
    expect(permissions.map((permission) => permission.key)).toEqual(
      expect.arrayContaining(Object.values(PERMISSIONS)),
    );
    const roleList = await rbac.roles.listRoles();
    const superAdmin = roleList.find((role) => role.key === ROLES.SUPER_ADMIN);
    expect(superAdmin?.isSystem).toBe(true);
  });

  it('assigns a role and resolves effective permissions (super-admin has all)', async () => {
    const userId = await createUser('admin@rbac.test');
    await rbac.roles.assignRoleToUser(await roleId(ROLES.SUPER_ADMIN), userId, null);

    const resolved = await rbac.authorization.getEffective(userId);
    expect(resolved.roleKeys).toContain(ROLES.SUPER_ADMIN);
    expect(resolved.permissionKeys).toEqual(expect.arrayContaining(Object.values(PERMISSIONS)));
    expect(await rbac.authorization.hasPermission(userId, PERMISSIONS.ROLES_ASSIGN)).toBe(true);
    expect(await rbac.authorization.hasRole(userId, ROLES.SUPER_ADMIN)).toBe(true);
  });

  it('rejects duplicate role assignment and unknown role/user', async () => {
    const userId = await createUser('dup@rbac.test');
    const superAdminId = await roleId(ROLES.SUPER_ADMIN);
    await rbac.roles.assignRoleToUser(superAdminId, userId, null);
    await expect(rbac.roles.assignRoleToUser(superAdminId, userId, null)).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(
      rbac.roles.assignRoleToUser('00000000-0000-0000-0000-000000000000', userId, null),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('removes a role and reflects the change; removing again is NotFound', async () => {
    const userId = await createUser('remove@rbac.test');
    const superAdminId = await roleId(ROLES.SUPER_ADMIN);
    await rbac.roles.assignRoleToUser(superAdminId, userId, null);
    await rbac.roles.removeRoleFromUser(superAdminId, userId, null);

    const resolved = await rbac.authorization.getEffective(userId);
    expect(resolved.roleKeys).not.toContain(ROLES.SUPER_ADMIN);
    expect(await rbac.authorization.hasPermission(userId, PERMISSIONS.ROLES_ASSIGN)).toBe(false);
    await expect(rbac.roles.removeRoleFromUser(superAdminId, userId, null)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('assigns and removes a single permission on a custom role', async () => {
    const inserted = await db
      .insert(rolesTable)
      .values({ key: 'reader', name: 'Reader' })
      .returning({ id: rolesTable.id });
    const readerId = inserted[0]?.id ?? '';
    const userId = await createUser('reader@rbac.test');
    await rbac.roles.assignRoleToUser(readerId, userId, null);

    const permission = (await rbac.permissions.listPermissions()).find(
      (candidate) => candidate.key === PERMISSIONS.ROLES_READ,
    );
    await rbac.roles.assignPermissionToRole(readerId, permission?.id ?? '', null);

    let resolved = await rbac.authorization.getEffective(userId);
    expect(resolved.permissionKeys).toEqual([PERMISSIONS.ROLES_READ]);

    await rbac.roles.removePermissionFromRole(readerId, permission?.id ?? '', null);
    resolved = await rbac.authorization.getEffective(userId);
    expect(resolved.permissionKeys).toEqual([]);
  });

  it('guards allow when permitted and deny (ForbiddenError + AuthorizationDenied) otherwise', async () => {
    const seen: string[] = [];
    rbac.events.subscribe((event) => {
      seen.push(event.type);
    });

    const permittedUser = await createUser('guard-ok@rbac.test');
    await rbac.roles.assignRoleToUser(await roleId(ROLES.SUPER_ADMIN), permittedUser, null);
    const deniedUser = await createUser('guard-deny@rbac.test');

    const guard = requirePermission(
      { authorization: rbac.authorization, events: rbac.events },
      PERMISSIONS.ROLES_READ,
    ) as unknown as (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    await expect(guard(fakeRequest(permittedUser), NOOP_REPLY)).resolves.toBeUndefined();
    await expect(guard(fakeRequest(deniedUser), NOOP_REPLY)).rejects.toBeInstanceOf(ForbiddenError);
    expect(seen).toContain('AuthorizationDenied');
  });

  it('policy framework enforces ownership', async () => {
    const context = toAuthorizationContext('user-1', {
      roleKeys: [],
      permissionKeys: [PERMISSIONS.ROLES_READ],
    });
    const ownershipPolicy = definePolicy<{ ownerId: string }>('own-resource', (ctx, resource) =>
      isOwner(ctx, resource.ownerId),
    );

    await expect(
      authorizePolicy(ownershipPolicy, context, { ownerId: 'user-1' }),
    ).resolves.toBeUndefined();
    await expect(
      authorizePolicy(ownershipPolicy, context, { ownerId: 'user-2' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
