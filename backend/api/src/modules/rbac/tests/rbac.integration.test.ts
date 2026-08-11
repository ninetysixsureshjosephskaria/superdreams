import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { withTransaction } from '@/database/helpers/transaction';
import { roles as rolesTable, userRoles } from '@/database/schema';
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

  // --- P1.2 partner ownership authorization (RBAC layer) ------------------------

  it('P1.2 Req6: a Member holds neither partner.network.read nor network.read', async () => {
    const userId = await createUser('p12-member@authz.test');
    await rbac.roles.assignRoleToUser(await roleId(ROLES.MEMBER), userId, null);
    expect(await rbac.authorization.hasPermission(userId, PERMISSIONS.PARTNER_NETWORK_READ)).toBe(
      false,
    );
    expect(await rbac.authorization.hasPermission(userId, PERMISSIONS.NETWORK_READ)).toBe(false);
  });

  it('P1.2 Req12: a Partner holds partner.network.read but NOT network.read (denied the admin cross-member endpoint) and cannot self-approve', async () => {
    const userId = await createUser('p12-partner@authz.test');
    await rbac.roles.assignRoleToUser(await roleId(ROLES.PARTNER), userId, null);
    expect(await rbac.authorization.hasPermission(userId, PERMISSIONS.PARTNER_NETWORK_READ)).toBe(
      true,
    );
    // network.read gates GET /network/members/:id and /network/partners → a Partner is denied.
    expect(await rbac.authorization.hasPermission(userId, PERMISSIONS.NETWORK_READ)).toBe(false);
    // A Partner cannot grant themselves the Partner role (no request-management power).
    expect(
      await rbac.authorization.hasPermission(userId, PERMISSIONS.PARTNER_REQUEST_APPROVE),
    ).toBe(false);
  });

  it('P1.2 Req7/8: Admin retains network.read; Super-admin holds both network.read and partner.network.read', async () => {
    const adminUser = await createUser('p12-admin@authz.test');
    await rbac.roles.assignRoleToUser(await roleId(ROLES.ADMIN), adminUser, null);
    expect(await rbac.authorization.hasPermission(adminUser, PERMISSIONS.NETWORK_READ)).toBe(true);
    expect(
      await rbac.authorization.hasPermission(adminUser, PERMISSIONS.PARTNER_REQUEST_APPROVE),
    ).toBe(true);
    // Admin manages partner requests but does not itself hold the partner-scoped read.
    expect(
      await rbac.authorization.hasPermission(adminUser, PERMISSIONS.PARTNER_NETWORK_READ),
    ).toBe(false);

    const superUser = await createUser('p12-super@authz.test');
    await rbac.roles.assignRoleToUser(await roleId(ROLES.SUPER_ADMIN), superUser, null);
    expect(await rbac.authorization.hasPermission(superUser, PERMISSIONS.NETWORK_READ)).toBe(true);
    expect(
      await rbac.authorization.hasPermission(superUser, PERMISSIONS.PARTNER_NETWORK_READ),
    ).toBe(true);
  });

  it('P1.2 Req11: a Member + Partner dual role resolves the union (partner.network.read, still not network.read)', async () => {
    const userId = await createUser('p12-dual@authz.test');
    await rbac.roles.assignRoleToUser(await roleId(ROLES.MEMBER), userId, null);
    await rbac.roles.assignRoleToUser(await roleId(ROLES.PARTNER), userId, null);
    const resolved = await rbac.authorization.getEffective(userId);
    expect(resolved.roleKeys).toEqual(expect.arrayContaining([ROLES.MEMBER, ROLES.PARTNER]));
    expect(resolved.permissionKeys).toContain(PERMISSIONS.PARTNER_NETWORK_READ);
    expect(resolved.permissionKeys).not.toContain(PERMISSIONS.NETWORK_READ);
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

  it('assignRoleToUserWithin: grants through a caller transaction and is idempotent', async () => {
    const userId = await createUser('within-ok@rbac.test');
    const memberRole = await roleId(ROLES.MEMBER);

    await withTransaction(db, async (tx) => {
      await rbac.roles.assignRoleToUserWithin(tx, memberRole, userId, null);
    });
    const afterFirst = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, memberRole)));
    expect(afterFirst).toHaveLength(1); // grant committed with the transaction

    // Idempotent: a repeat is a no-op (no ConflictError, no duplicate row).
    await withTransaction(db, async (tx) => {
      await rbac.roles.assignRoleToUserWithin(tx, memberRole, userId, null);
    });
    const afterSecond = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, memberRole)));
    expect(afterSecond).toHaveLength(1);
  });

  it('assignRoleToUserWithin: rolls back with the enclosing transaction on later failure', async () => {
    const userId = await createUser('within-rollback@rbac.test');
    const memberRole = await roleId(ROLES.MEMBER);

    await expect(
      withTransaction(db, async (tx) => {
        await rbac.roles.assignRoleToUserWithin(tx, memberRole, userId, null);
        throw new Error('boom after grant');
      }),
    ).rejects.toThrow('boom after grant');

    const rows = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, memberRole)));
    expect(rows).toHaveLength(0); // the in-tx grant rolled back with the transaction
  });

  it('assignRoleToUserWithin: an unknown role id fails (FK) and grants nothing', async () => {
    const userId = await createUser('within-unknown@rbac.test');
    await expect(
      withTransaction(db, (tx) =>
        rbac.roles.assignRoleToUserWithin(tx, '00000000-0000-0000-0000-000000000000', userId, null),
      ),
    ).rejects.toThrow(); // FK violation on user_roles.role_id → transaction aborts
    const rows = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    expect(rows).toHaveLength(0);
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
