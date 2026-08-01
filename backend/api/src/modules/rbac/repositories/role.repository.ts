import { and, asc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { roles, userRoles } from '@/database/schema';

export type RoleRow = InferSelectModel<typeof roles>;

export class RoleRepository extends BaseRepository<typeof roles> {
  public constructor(db: Database) {
    super(db, roles);
  }

  public async findByKey(key: string): Promise<RoleRow | null> {
    const rows = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.key, key), notDeleted(roles.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async listAll(): Promise<RoleRow[]> {
    return this.db.select().from(roles).where(notDeleted(roles.deletedAt)).orderBy(asc(roles.key));
  }

  /** Role keys currently assigned to a user (via `user_roles`). */
  public async listKeysForUser(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ key: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.userId, userId), notDeleted(roles.deletedAt)));
    return rows.map((row) => row.key);
  }
}
