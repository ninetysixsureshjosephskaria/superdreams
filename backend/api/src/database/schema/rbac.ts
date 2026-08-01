import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { users } from './identity';

/** A single, atomic permission (e.g. `roles.assign`). */
export const permissions = pgTable(
  'permissions',
  {
    ...baseColumns(),
    key: text('key').notNull(),
    name: text('name'),
    description: text('description'),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
  },
  (table) => [
    uniqueIndex('permissions_key_uq').on(table.key),
    index('permissions_resource_idx').on(table.resource),
  ],
);

/** A named collection of permissions assignable to users. */
export const roles = pgTable(
  'roles',
  {
    ...baseColumns(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
  },
  (table) => [uniqueIndex('roles_key_uq').on(table.key)],
);

/** Role → Permission assignments (join table). */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (table) => [
    uniqueIndex('role_permissions_role_permission_uq').on(table.roleId, table.permissionId),
    index('role_permissions_role_id_idx').on(table.roleId),
    index('role_permissions_permission_id_idx').on(table.permissionId),
  ],
);

/** User → Role assignments (join table). Multiple roles per user are supported. */
export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (table) => [
    uniqueIndex('user_roles_user_role_uq').on(table.userId, table.roleId),
    index('user_roles_user_id_idx').on(table.userId),
    index('user_roles_role_id_idx').on(table.roleId),
  ],
);
