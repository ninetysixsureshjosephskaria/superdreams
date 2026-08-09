import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { config } from '@/config';
import type { Database } from '@/database/client';
import { roles, userRoles, users } from '@/database/schema';
import { createAuthModule, type AuthModule } from '@/modules/auth';
import { hashPassword, verifyPassword } from '@/modules/identity/services';

import { ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD, seedProductionAdmin } from '../production-admin';

/** Phase 2H — bootstrap-admin seed + env-gated break-glass password recovery. */
describe('production-admin seed + recovery (PGlite)', () => {
  let client: PGlite;
  let db: Database;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
  });

  afterAll(async () => {
    await client.close();
  });

  async function admin(): Promise<typeof users.$inferSelect> {
    const [row] = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
    return row!;
  }

  async function hasSuperAdmin(userId: string): Promise<boolean> {
    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, 'super-admin'));
    if (!role) {
      return false;
    }
    const links = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    return links.some((link) => link.roleId === role.id);
  }

  it('creates an ACTIVE, email-verified admin with the default password + super-admin role', async () => {
    await seedProductionAdmin(db);
    const a = await admin();
    expect(a.status).toBe('ACTIVE');
    expect(a.emailVerifiedAt).not.toBeNull();
    expect(await verifyPassword(a.passwordHash!, ADMIN_INITIAL_PASSWORD)).toBe(true);
    expect(await hasSuperAdmin(a.id)).toBe(true);
  });

  it('a normal re-run NEVER overwrites an existing admin password/status (only re-asserts role)', async () => {
    const current = await admin();
    // Simulate a diverged production state: changed password + suspended + unverified.
    await db
      .update(users)
      .set({
        passwordHash: await hashPassword('SomethingElse1'),
        status: 'SUSPENDED',
        emailVerifiedAt: null,
      })
      .where(eq(users.id, current.id));

    await seedProductionAdmin(db); // no resetPassword → credentials/status untouched

    const a = await admin();
    expect(a.status).toBe('SUSPENDED'); // unchanged
    expect(a.emailVerifiedAt).toBeNull(); // unchanged
    expect(await verifyPassword(a.passwordHash!, ADMIN_INITIAL_PASSWORD)).toBe(false);
    expect(await verifyPassword(a.passwordHash!, 'SomethingElse1')).toBe(true);
    expect(await hasSuperAdmin(a.id)).toBe(true); // role still re-asserted
  });

  it('break-glass recovery resets the password + reactivates when resetPassword is supplied', async () => {
    await seedProductionAdmin(db, { resetPassword: 'RecoverPass9' });

    const a = await admin();
    expect(a.status).toBe('ACTIVE');
    expect(a.emailVerifiedAt).not.toBeNull();
    expect(a.mustChangePassword).toBe(false);
    expect(await verifyPassword(a.passwordHash!, 'RecoverPass9')).toBe(true);
    expect(await hasSuperAdmin(a.id)).toBe(true);
  });
});

/**
 * Lockout recovery, exercised through the REAL login flow. Lockout is derived
 * (no user column): `AuthService.login` counts recent failed `login_history`
 * rows for the email and rejects once they cross the threshold. These tests
 * prove that break-glass — and only break-glass — clears that lock.
 */
describe('production-admin break-glass clears the login lockout (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let auth: AuthModule;
  const CONTEXT = { ipAddress: '127.0.0.1', userAgent: 'vitest' };

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    auth = createAuthModule(db);
    // ACTIVE, email-verified bootstrap admin with the initial password.
    await seedProductionAdmin(db);
  });

  afterAll(async () => {
    await client.close();
  });

  /** Drive enough failed logins to trip (or keep) the derived lockout. */
  async function tripLockout(): Promise<void> {
    for (let attempt = 0; attempt < config.auth.lockout.maxAttempts; attempt += 1) {
      await expect(
        auth.auth.login({ email: ADMIN_EMAIL, password: 'wrong-password' }, CONTEXT),
      ).rejects.toThrow();
    }
  }

  it('a normal seed (no ADMIN_PASSWORD_RESET) does NOT unlock a locked admin', async () => {
    await tripLockout();
    // The correct password is rejected purely because of the lockout.
    await expect(
      auth.auth.login({ email: ADMIN_EMAIL, password: ADMIN_INITIAL_PASSWORD }, CONTEXT),
    ).rejects.toThrow(/locked/i);

    await seedProductionAdmin(db); // no resetPassword → lockout must remain
    await expect(
      auth.auth.login({ email: ADMIN_EMAIL, password: ADMIN_INITIAL_PASSWORD }, CONTEXT),
    ).rejects.toThrow(/locked/i);
  });

  it('failed attempts -> locked -> ADMIN_PASSWORD_RESET -> unlocked -> login succeeds', async () => {
    await tripLockout();
    // Locked before recovery, even with a correct password.
    await expect(
      auth.auth.login({ email: ADMIN_EMAIL, password: ADMIN_INITIAL_PASSWORD }, CONTEXT),
    ).rejects.toThrow(/locked/i);

    await seedProductionAdmin(db, { resetPassword: 'RecoverPass9' });

    // Recovery cleared the lockout AND set the new password: login now succeeds.
    const result = await auth.auth.login({ email: ADMIN_EMAIL, password: 'RecoverPass9' }, CONTEXT);
    expect(result.user.email).toBe(ADMIN_EMAIL);
    expect(result.tokens.accessToken.split('.')).toHaveLength(3);
  });
});
