import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { recordStatus } from './enums';

/** User lifecycle status (identity-specific). */
export const userStatus = pgEnum('user_status', [
  'PENDING',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
]);

/** Organizations (tenants). */
export const organizations = pgTable(
  'organizations',
  {
    ...baseColumns(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    status: recordStatus('status').notNull().default('ACTIVE'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('organizations_slug_uq').on(table.slug),
    index('organizations_status_idx').on(table.status),
    index('organizations_deleted_at_idx').on(table.deletedAt),
  ],
);

/** Platform users. Authentication (login/JWT/sessions) is added in a later phase. */
export const users = pgTable(
  'users',
  {
    ...baseColumns(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    email: text('email').notNull(),
    username: text('username'),
    passwordHash: text('password_hash'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    displayName: text('display_name'),
    status: userStatus('status').notNull().default('PENDING'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    /** Forces a password change on next sign-in (e.g. seeded/admin-reset accounts). */
    mustChangePassword: boolean('must_change_password').notNull().default(false),
  },
  (table) => [
    uniqueIndex('users_email_uq').on(table.email),
    uniqueIndex('users_username_uq').on(table.username),
    index('users_organization_id_idx').on(table.organizationId),
    index('users_status_idx').on(table.status),
    index('users_deleted_at_idx').on(table.deletedAt),
  ],
);
