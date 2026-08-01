import { eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { permissions, rolePermissions, roles } from '@/database/schema';
import { registerSeed } from '@/database/seed';

import { PERMISSION_DEFINITIONS, SYSTEM_ROLE_DEFINITIONS } from './catalog';

/**
 * Idempotently syncs the code-defined RBAC catalog (permissions + system roles
 * and their grants) into the database. Structural, not sample data — safe for
 * every environment. Re-runnable.
 */
export async function syncRbacCatalog(db: Database): Promise<void> {
  const permissionIdByKey = new Map<string, string>();

  for (const definition of PERMISSION_DEFINITIONS) {
    const existing = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.key, definition.key))
      .limit(1);
    const current = existing[0];
    if (current) {
      await db
        .update(permissions)
        .set({
          description: definition.description,
          resource: definition.resource,
          action: definition.action,
          updatedAt: new Date(),
        })
        .where(eq(permissions.id, current.id));
      permissionIdByKey.set(definition.key, current.id);
    } else {
      const inserted = await db
        .insert(permissions)
        .values({
          key: definition.key,
          description: definition.description,
          resource: definition.resource,
          action: definition.action,
        })
        .returning({ id: permissions.id });
      const row = inserted[0];
      if (row) {
        permissionIdByKey.set(definition.key, row.id);
      }
    }
  }

  for (const roleDefinition of SYSTEM_ROLE_DEFINITIONS) {
    const existingRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, roleDefinition.key))
      .limit(1);

    let roleId: string;
    const current = existingRole[0];
    if (current) {
      roleId = current.id;
      await db
        .update(roles)
        .set({
          name: roleDefinition.name,
          description: roleDefinition.description,
          isSystem: true,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, roleId));
    } else {
      const inserted = await db
        .insert(roles)
        .values({
          key: roleDefinition.key,
          name: roleDefinition.name,
          description: roleDefinition.description,
          isSystem: true,
        })
        .returning({ id: roles.id });
      const row = inserted[0];
      if (!row) {
        continue;
      }
      roleId = row.id;
    }

    const grantKeys =
      roleDefinition.permissions === '*'
        ? PERMISSION_DEFINITIONS.map((definition) => definition.key)
        : roleDefinition.permissions;

    for (const key of grantKeys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) {
        continue;
      }
      await db.insert(rolePermissions).values({ roleId, permissionId }).onConflictDoNothing();
    }
  }
}

registerSeed({
  name: 'rbac-catalog',
  environments: ['development', 'test', 'staging', 'production'],
  run: syncRbacCatalog,
});
