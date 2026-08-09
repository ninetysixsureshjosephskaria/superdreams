import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { roles, userRoles, users } from '@/database/schema';
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
