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
 * Idempotent: does nothing if the account already exists (never resets an
 * operator's changed password).
 */
export const ADMIN_EMAIL = 'admin@superdreams.com';
export const ADMIN_INITIAL_PASSWORD = 'ChangeMe123!';

async function seedProductionAdmin(db: Database): Promise<void> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);
  if (existing[0]) {
    return;
  }

  // Ensure the RBAC catalog (permissions + super-admin role) exists first.
  await syncRbacCatalog(db);

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
  const admin = inserted[0];
  if (!admin) {
    return;
  }

  const superAdminRole = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.key, 'super-admin'))
    .limit(1);
  if (superAdminRole[0]) {
    await db
      .insert(userRoles)
      .values({ userId: admin.id, roleId: superAdminRole[0].id, createdBy: admin.id })
      .onConflictDoNothing();
  }
}

registerSeed({
  name: 'production-admin',
  environments: ['development', 'staging', 'production'],
  run: seedProductionAdmin,
});
