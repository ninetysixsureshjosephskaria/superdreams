import { eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { roles, userRoles, users } from '@/database/schema';
import { hashPassword } from '@/modules/identity/services';
import { syncRbacCatalog } from '@/modules/rbac/seed';

import { registerSeed } from './index';

/**
 * Bootstrap administrator. Created in every environment so a fresh deployment
 * has exactly one way in. The seeded credential should still be rotated after
 * first sign-in (via Settings → change password), but it is NOT force-flagged,
 * so the account logs straight in without a mandatory change-password redirect.
 *
 * Idempotent AND self-healing: it never resets an operator's changed password,
 * but it ALWAYS re-asserts the super-admin role assignment. That guards against
 * a database left in a bad state — e.g. an admin created before the RBAC catalog
 * was fully in place — which otherwise resolves to zero permissions and gets a
 * 403 on every page. Combined with the `rbac-catalog` seed (which resyncs the
 * role's permissions on every deploy), a redeploy restores full admin access.
 */
export const ADMIN_EMAIL = 'admin@superdreams.com';
export const ADMIN_INITIAL_PASSWORD = 'ChangeMe123!';

async function seedProductionAdmin(db: Database): Promise<void> {
  // Ensure the RBAC catalog (permissions + super-admin role) exists first.
  await syncRbacCatalog(db);

  // Find the admin, or create it (only sets the initial password on creation).
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  let adminId = existing[0]?.id;
  if (!adminId) {
    const passwordHash = await hashPassword(ADMIN_INITIAL_PASSWORD);
    const inserted = await db
      .insert(users)
      .values({
        email: ADMIN_EMAIL,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        displayName: 'Super Admin',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        mustChangePassword: false,
      })
      .returning({ id: users.id });
    adminId = inserted[0]?.id;
  }
  if (!adminId) {
    return;
  }

  // Always (re-)assert the super-admin role link — self-heals an unlinked admin.
  const superAdminRole = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.key, 'super-admin'))
    .limit(1);
  if (superAdminRole[0]) {
    await db
      .insert(userRoles)
      .values({ userId: adminId, roleId: superAdminRole[0].id, createdBy: adminId })
      .onConflictDoNothing();
  }
}

registerSeed({
  name: 'production-admin',
  environments: ['development', 'staging', 'production'],
  run: seedProductionAdmin,
});
