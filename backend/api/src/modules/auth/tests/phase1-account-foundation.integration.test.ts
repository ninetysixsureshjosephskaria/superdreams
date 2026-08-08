import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, roles as rolesTable, users } from '@/database/schema';
import { EmailService, MockEmailProvider } from '@/email';
import { createIdentityModule } from '@/modules/identity';
import { createMembersModule, type MembersModule } from '@/modules/members';
import { createRbacModule, type RbacModule } from '@/modules/rbac';
import { syncRbacCatalog } from '@/modules/rbac/seed';

import { createAuthModule, type AuthModule } from '..';
import { AuthEventBus } from '../events';

const CTX = { ipAddress: '127.0.0.1', userAgent: 'vitest' };

/**
 * Phase 1 — authentication & account foundation, end-to-end against PGlite,
 * with the SAME cross-module wiring as the composition root (routes/index.ts):
 * default member role, linked member profile, /me authorization, account-status
 * lifecycle + login enforcement + audit, and activation-token invalidation.
 */
describe('phase 1 account foundation (PGlite) — roles, profile, status, audit', () => {
  let client: PGlite;
  let db: Database;
  let mock: MockEmailProvider;
  let auth: AuthModule;
  let members: MembersModule;
  let rbac: RbacModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    // Seed the RBAC catalog (roles + permissions) — Phase 1 depends on the roles.
    await syncRbacCatalog(db);

    mock = new MockEmailProvider();
    auth = createAuthModule(
      db,
      createIdentityModule(db),
      new AuthEventBus(),
      new EmailService(mock, 'http://localhost:5173'),
    );
    members = createMembersModule(db);
    rbac = createRbacModule(db, {});

    // Wire the auth ports exactly as the composition root does.
    const memberProvisioner = {
      ensureForUser: (input: {
        userId: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
      }) => members.service.provisionForUser(input),
      activateForUser: (userId: string) => members.service.activateByUserId(userId),
    };
    const roleAssigner = {
      assignRoleByKey: async (userId: string, roleKey: string): Promise<void> => {
        const role = await rbac.repositories.roles.findByKey(roleKey);
        if (role) {
          await rbac.roles.assignRoleToUser(role.id, userId, null);
        }
      },
    };
    const authorizationReader = {
      resolve: async (userId: string) => {
        const resolved = await rbac.resolver.resolve(userId);
        return { roleKeys: [...resolved.roleKeys], permissionKeys: [...resolved.permissionKeys] };
      },
    };
    auth.registration.setCollaborators({ roleAssigner, memberProvisioner });
    auth.emailVerification.setMemberProvisioner(memberProvisioner);
    auth.auth.setAuthorizationReader(authorizationReader);
  });

  afterAll(async () => {
    await client.close();
  });

  async function userIdOf(email: string): Promise<string> {
    const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    return row!.id;
  }

  it('seeds exactly the four system roles, and re-seeding is idempotent', async () => {
    await syncRbacCatalog(db); // second run — must be a no-op
    const rows = await db.select({ key: rolesTable.key }).from(rolesTable);
    const keys = rows.map((r) => r.key).sort();
    expect(keys).toEqual(['admin', 'member', 'partner', 'super-admin']);
  });

  it('sign-up assigns the member role, creates a linked PENDING member profile', async () => {
    // A client-supplied role must be ignored (D8: never client-selectable).
    await auth.registration.register({
      email: 'nova@phase1.test',
      password: 'Member123!',
      firstName: 'Nova',
      lastName: 'Reyes',
      role: 'super-admin',
    });

    const userId = await userIdOf('nova@phase1.test');

    // Auth account is PENDING.
    const [u] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId));
    expect(u!.status).toBe('PENDING');

    // Only the member role is granted (not the attempted super-admin).
    const me = await auth.auth.me(userId);
    expect(me?.roles).toEqual(['member']);
    expect(me?.permissions).toEqual([]);

    // A linked member profile exists, in PENDING state.
    const profile = await members.service.getByUserId(userId);
    expect(profile).not.toBeNull();
    expect(profile?.status).toBe('PENDING');
  });

  it('activation promotes both the auth account and the member profile to ACTIVE', async () => {
    const token = mock.lastTo('nova@phase1.test')!.html.match(/\/activate\?token=([^"'&]+)/)![1]!;
    await auth.emailVerification.verifyEmail(decodeURIComponent(token));

    const userId = await userIdOf('nova@phase1.test');
    const [u] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId));
    expect(u!.status).toBe('ACTIVE');
    const profile = await members.service.getByUserId(userId);
    expect(profile?.status).toBe('ACTIVE');
  });

  it('login works after activation; suspend blocks it server-side + is audited', async () => {
    await expect(
      auth.auth.login({ email: 'nova@phase1.test', password: 'Member123!' }, CTX),
    ).resolves.toBeTruthy();

    const userId = await userIdOf('nova@phase1.test');
    const profile = await members.service.getByUserId(userId);
    const actor = { userId, ipAddress: '10.0.0.1', userAgent: 'admin', correlationId: null };

    const suspended = await members.accountService.changeStatus(
      profile!.id,
      { status: 'SUSPENDED', reason: 'policy review' },
      actor,
    );
    expect(suspended.accountStatus).toBe('SUSPENDED');

    // Server-side login enforcement (D7): safe message, no account detail leaked.
    await expect(
      auth.auth.login({ email: 'nova@phase1.test', password: 'Member123!' }, CTX),
    ).rejects.toThrow(/not active/i);

    // The security-sensitive change is written to the shared audit log.
    const audit = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'user_account'), eq(auditLogs.entityId, userId)));
    expect(audit.length).toBeGreaterThanOrEqual(1);
    expect(audit[0]!.module).toBe('members');
  });

  it('reactivate restores login; deactivate blocks it again', async () => {
    const userId = await userIdOf('nova@phase1.test');
    const profile = await members.service.getByUserId(userId);
    const actor = { userId, ipAddress: null, userAgent: null, correlationId: null };

    await members.accountService.changeStatus(profile!.id, { status: 'ACTIVE' }, actor);
    await expect(
      auth.auth.login({ email: 'nova@phase1.test', password: 'Member123!' }, CTX),
    ).resolves.toBeTruthy();

    await members.accountService.changeStatus(profile!.id, { status: 'DEACTIVATED' }, actor);
    await expect(
      auth.auth.login({ email: 'nova@phase1.test', password: 'Member123!' }, CTX),
    ).rejects.toThrow(/not active/i);
  });

  it('resend activation invalidates the previous activation token (D3)', async () => {
    // A fresh, still-pending account.
    const first = await auth.registration.register({
      email: 'lee@phase1.test',
      password: 'Member123!',
      firstName: 'Lee',
      lastName: 'Park',
    });
    const firstToken = first.verificationToken;

    const secondToken = await auth.registration.resendVerification({ email: 'lee@phase1.test' });
    expect(secondToken).toBeTruthy();
    expect(secondToken).not.toBe(firstToken);

    // The superseded first token must be rejected; the new one works.
    await expect(auth.emailVerification.verifyEmail(firstToken)).rejects.toThrow(
      /invalid|expired/i,
    );
    await expect(auth.emailVerification.verifyEmail(secondToken!)).resolves.toBeUndefined();
  });

  it('suspending a logged-in member kills the existing session; reactivation restores login', async () => {
    // Fresh, activated member with a live session.
    const reg = await auth.registration.register({
      email: 'sam@phase1.test',
      password: 'Member123!',
      firstName: 'Sam',
      lastName: 'Lee',
    });
    await auth.emailVerification.verifyEmail(reg.verificationToken);
    const loggedIn = await auth.auth.login(
      { email: 'sam@phase1.test', password: 'Member123!' },
      CTX,
    );
    const sessionId = loggedIn.session.id;

    // The session backing the access token is active (authenticate would allow it).
    expect(await auth.sessions.validateSession(sessionId)).not.toBeNull();

    const userId = await userIdOf('sam@phase1.test');
    const profile = await members.service.getByUserId(userId);
    const actor = { userId, ipAddress: null, userAgent: null, correlationId: null };

    // Suspend → all sessions/refresh tokens revoked.
    await members.accountService.changeStatus(
      profile!.id,
      { status: 'SUSPENDED', reason: 'security' },
      actor,
    );

    // The existing session is now invalid — authenticate rejects the access token
    // on its next request (it validates the session server-side).
    expect(await auth.sessions.validateSession(sessionId)).toBeNull();
    // The refresh token can no longer rotate.
    await expect(auth.sessions.rotateRefreshToken(loggedIn.tokens.refreshToken)).rejects.toThrow();
    // A brand-new login is rejected while suspended.
    await expect(
      auth.auth.login({ email: 'sam@phase1.test', password: 'Member123!' }, CTX),
    ).rejects.toThrow(/not active/i);

    // Reactivate → the user can authenticate again, with a fresh valid session.
    await members.accountService.changeStatus(profile!.id, { status: 'ACTIVE' }, actor);
    const relogin = await auth.auth.login(
      { email: 'sam@phase1.test', password: 'Member123!' },
      CTX,
    );
    expect(await auth.sessions.validateSession(relogin.session.id)).not.toBeNull();
  });
});
