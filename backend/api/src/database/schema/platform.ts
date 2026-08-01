import { boolean, index, integer, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';

/** Platform-level key/value configuration. */
export const systemConfig = pgTable(
  'system_config',
  {
    ...baseColumns(),
    key: text('key').notNull(),
    value: jsonb('value'),
    description: text('description'),
    isSecret: boolean('is_secret').notNull().default(false),
  },
  (table) => [
    uniqueIndex('system_config_key_uq').on(table.key),
    index('system_config_deleted_at_idx').on(table.deletedAt),
  ],
);

/** Application settings, scoped (e.g. `global`, or a future organization id). */
export const applicationSettings = pgTable(
  'application_settings',
  {
    ...baseColumns(),
    scope: text('scope').notNull().default('global'),
    key: text('key').notNull(),
    value: jsonb('value'),
    description: text('description'),
  },
  (table) => [uniqueIndex('application_settings_scope_key_uq').on(table.scope, table.key)],
);

/** Feature flags for progressive enablement. */
export const featureFlags = pgTable(
  'feature_flags',
  {
    ...baseColumns(),
    key: text('key').notNull(),
    description: text('description'),
    isEnabled: boolean('is_enabled').notNull().default(false),
    rolloutPercentage: integer('rollout_percentage').notNull().default(0),
  },
  (table) => [uniqueIndex('feature_flags_key_uq').on(table.key)],
);
