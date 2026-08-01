import { and, asc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { permissions, rolePermissions, userRoles } from '@/database/schema';

export type PermissionRow = InferSelectModel<typeof permissions>;

export class PermissionRepository extends BaseRepository<typeof permissions> {
  public constructor(db: Database) {
    super(db, permissions);
  }

  public async findByKey(key: string): Promise<PermissionRow | null> {
    const rows = await this.db
      .select()
      .from(permissions)
      .where(and(eq(permissions.key, key), notDeleted(permissions.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async listAll(): Promise<PermissionRow[]> {
    return this.db
      .select()
      .from(permissions)
      .where(notDeleted(permissions.deletedAt))
      .orderBy(asc(permissions.key));
  }

  /** Distinct permission keys a user effectively holds (user → roles → permissions). */
  public async listKeysForUser(userId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ key: permissions.key })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(eq(userRoles.userId, userId), notDeleted(permissions.deletedAt)));
    return rows.map((row) => row.key);
  }
}
