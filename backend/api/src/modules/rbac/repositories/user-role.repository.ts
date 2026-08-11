import { and, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { userRoles } from '@/database/schema';
import type { Executor } from '@/database/types';

/** Persistence for User → Role assignments (multiple roles per user). */
export class UserRoleRepository {
  public constructor(private readonly db: Database) {}

  public async exists(userId: string, roleId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
      .limit(1);
    return rows[0] !== undefined;
  }

  /**
   * Inserts a user→role assignment, idempotent via `user_roles_user_role_uq`
   * (`onConflictDoNothing`). Accepts an optional `executor` so the insert can
   * participate in a caller's transaction; defaults to the base connection, so
   * existing callers are behaviourally unchanged.
   */
  public async assign(
    userId: string,
    roleId: string,
    createdBy: string | null,
    executor: Executor = this.db,
  ): Promise<void> {
    await executor.insert(userRoles).values({ userId, roleId, createdBy }).onConflictDoNothing();
  }

  public async remove(userId: string, roleId: string): Promise<boolean> {
    const rows = await this.db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
      .returning({ id: userRoles.id });
    return rows.length > 0;
  }

  /** User ids assigned a given role (used for cache invalidation). */
  public async listUserIdsForRole(roleId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));
    return rows.map((row) => row.userId);
  }
}
