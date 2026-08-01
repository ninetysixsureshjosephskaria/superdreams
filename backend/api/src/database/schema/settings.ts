import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { settingValueType } from './enums';
import { users } from './identity';

/**
 * Settings & Administration. The central configuration store for the platform.
 * These tables hold **configuration only** — never operational business data.
 *
 * Per-domain settings (branding, email, security, localization, …) are modelled
 * as typed key-value entries in {@link systemSettings} grouped by
 * {@link settingCategories}, rather than one sparse table per domain. This
 * maximizes reuse (one BaseRepository, one validation path) and keeps the API
 * category-driven. Structured concerns get dedicated tables:
 * {@link featureToggles} and {@link maintenanceWindows}. Every change is
 * versioned in {@link settingHistory} and audited via the shared audit log.
 */

/** Seeded lookup grouping settings into administrative categories. */
export const settingCategories = pgTable(
  'setting_categories',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    /** Display order in the settings dashboard. */
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('setting_categories_code_uq').on(table.code)],
);

/**
 * The canonical typed key-value configuration store. One row per setting key.
 * `value` is JSONB so any type is representable; `valueType` drives validation
 * and UI rendering. `isSecret` values are redacted in non-privileged reads;
 * `isPublic` values may be exposed to authenticated clients for display
 * (branding, localization, maintenance banner).
 */
export const systemSettings = pgTable(
  'system_settings',
  {
    ...baseColumns(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => settingCategories.id),
    categoryCode: text('category_code').notNull(),
    key: text('key').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    value: jsonb('value'),
    valueType: settingValueType('value_type').notNull().default('STRING'),
    /** Redacted from non-privileged reads (e.g. API keys, SMTP passwords). */
    isSecret: boolean('is_secret').notNull().default(false),
    /** Exposed to authenticated clients via the public settings read. */
    isPublic: boolean('is_public').notNull().default(false),
    /** System-managed keys cannot be deleted (only their value changes). */
    isSystem: boolean('is_system').notNull().default(true),
  },
  (table) => [
    uniqueIndex('system_settings_key_uq').on(table.key),
    index('system_settings_category_idx').on(table.categoryCode),
  ],
);

/** Append-only version history: one row per value change of a setting. */
export const settingHistory = pgTable(
  'setting_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    settingId: uuid('setting_id').references(() => systemSettings.id),
    key: text('key').notNull(),
    categoryCode: text('category_code').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    version: integer('version').notNull().default(1),
    changedBy: uuid('changed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('setting_history_key_idx').on(table.key),
    index('setting_history_category_idx').on(table.categoryCode),
    index('setting_history_created_at_idx').on(table.createdAt),
  ],
);

/**
 * Feature toggle definitions. `enabled` is the master switch; `strategy` holds
 * optional structured rollout/targeting hooks (environment overrides, user/role
 * targeting) for future rollout support — evaluated by consumers, not here.
 */
export const featureToggles = pgTable(
  'feature_toggles',
  {
    ...baseColumns(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    enabled: boolean('enabled').notNull().default(false),
    /** e.g. { environments: {...}, roles: [...], users: [...], percentage: n }. */
    strategy: jsonb('strategy'),
  },
  (table) => [
    uniqueIndex('feature_toggles_key_uq').on(table.key),
    index('feature_toggles_enabled_idx').on(table.enabled),
  ],
);

/**
 * Maintenance windows. A window is active when `isActive` and (now within
 * [startsAt, endsAt] or those are null). `allowAdminBypass` lets privileged
 * users through while maintenance is on. Enforcement is a consumer concern; this
 * table stores the configuration and message only.
 */
export const maintenanceWindows = pgTable(
  'maintenance_windows',
  {
    ...baseColumns(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    isActive: boolean('is_active').notNull().default(false),
    allowAdminBypass: boolean('allow_admin_bypass').notNull().default(true),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    activatedBy: uuid('activated_by').references(() => users.id),
  },
  (table) => [index('maintenance_windows_active_idx').on(table.isActive)],
);
