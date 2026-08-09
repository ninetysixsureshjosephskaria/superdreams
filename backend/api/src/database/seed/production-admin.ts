import { and, eq, or } from 'drizzle-orm';

import { config } from '@/config';
import type { Database } from '@/database/client';
import { loginHistory, roles, userRoles, users } from '@/database/schema';
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

/**
 * Seeds/repairs the bootstrap administrator.
 *
 * Normal deploy (`resetPassword` undefined): create-if-missing with the default
 * initial password, and always re-assert the super-admin role. An EXISTING
 * admin's password/status/verification are NEVER touched — deploys don't
 * overwrite credentials.
 *
 * Break-glass recovery (`resetPassword` set, from `ADMIN_PASSWORD_RESET`):
 * additionally reset the admin to a known-good login state — password =
 * `resetPassword`, status ACTIVE, email verified, `mustChangePassword` false —
 * AND clear the login lockout. Lockout is not a user column: `login()` rejects
 * once the recent failed `login_history` rows for the email cross the threshold
 * within a rolling window (see auth.service `assertNotLockedOut`). A password
 * reset alone therefore leaves a locked-out admin still locked, so recovery also
 * deletes that account's failed login-history rows (scoped to the admin only).
 * This is the only path that overwrites an existing admin password or clears its
 * lockout, and it runs only while the env var is present (operator sets it,
 * redeploys once, then removes it). It is not a backdoor and does not weaken auth
 * or RBAC — normal login lockout for every account, admin included, is untouched.
 */
export async function seedProductionAdmin(
  db: Database,
  options: { resetPassword?: string | undefined } = {},
): Promise<void> {
  // Ensure the RBAC catalog (permissions + super-admin role) exists first.
  await syncRbacCatalog(db);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  let adminId = existing[0]?.id;
  if (!adminId) {
    // Fresh install: seed with the recovery password when supplied, else default.
    const initialPassword = options.resetPassword ?? ADMIN_INITIAL_PASSWORD;
    const passwordHash = await hashPassword(initialPassword);
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
  } else if (options.resetPassword) {
    // Break-glass recovery of an EXISTING admin — never runs on a normal deploy.
    const passwordHash = await hashPassword(options.resetPassword);
    await db
      .update(users)
      .set({
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        mustChangePassword: false,
      })
      .where(eq(users.id, adminId));

    // Clear the login lockout. It is DERIVED — login() counts recent failed
    // `login_history` rows for the email and rejects once they cross the
    // threshold — so resetting the password is not enough; the failed rows must
    // be removed too. Scoped strictly to the bootstrap admin (its email and its
    // user id) so no other account's history or lock state is affected. Only
    // failures are deleted; the account's successful-login audit trail is kept.
    await db
      .delete(loginHistory)
      .where(
        and(
          eq(loginHistory.success, false),
          or(eq(loginHistory.email, ADMIN_EMAIL), eq(loginHistory.userId, adminId)),
        ),
      );

    process.stdout.write(
      '[seed] production-admin: ADMIN_PASSWORD_RESET applied — password reset, account ' +
        'reactivated, and login lockout cleared. Remove ADMIN_PASSWORD_RESET now to prevent ' +
        're-applying.\n',
    );
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
  run: (db) =>
    seedProductionAdmin(db, {
      resetPassword: config.admin.passwordReset ?? undefined,
    }),
});
