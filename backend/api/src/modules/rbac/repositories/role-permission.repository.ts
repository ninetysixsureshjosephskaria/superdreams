import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { permissions, rolePermissions } from '@/database/schema';

import type { PermissionRow } from './permission.repository';

/** Persistence for Role → Permission assignments. */
export class RolePermissionRepository {
  public constructor(private readonly db: Database) {}

  public async exists(roleId: string, permissionId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: rolePermissions.id })
      .from(rolePermissions)
      .where(
        and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)),
      )
      .limit(1);
    return rows[0] !== undefined;
  }

  public async assign(
    roleId: string,
    permissionId: string,
    createdBy: string | null,
  ): Promise<void> {
    await this.db
      .insert(rolePermissions)
      .values({ roleId, permissionId, createdBy })
      .onConflictDoNothing();
  }

  public async remove(roleId: string, permissionId: string): Promise<boolean> {
    const rows = await this.db
      .delete(rolePermissions)
      .where(
        and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)),
      )
      .returning({ id: rolePermissions.id });
    return rows.length > 0;
  }

  public async listPermissionsForRole(roleId: string): Promise<PermissionRow[]> {
    return this.db
      .select()
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(eq(rolePermissions.roleId, roleId), notDeleted(permissions.deletedAt)))
      .orderBy(asc(permissions.key))
      .then((rows) => rows.map((row) => row.permissions));
  }
}
