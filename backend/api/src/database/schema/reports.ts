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
import { jobStatus, reportExportFormat, reportScheduleFrequency, reportWidgetType } from './enums';
import { users } from './identity';

/**
 * Reports & Analytics. A **read-only** reporting layer over the platform's
 * business modules. These tables store report *metadata*, execution history and
 * per-user preferences only — never operational data. Report generation reads
 * the business modules' own tables (their maintained projections for derived
 * values), so no business calculation is duplicated and no business table is
 * ever written by this module.
 */

/** Seeded lookup grouping report definitions into categories (operational, financial, …). */
export const reportCategories = pgTable(
  'report_categories',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    label: text('label').notNull(),
    description: text('description'),
  },
  (table) => [uniqueIndex('report_categories_code_uq').on(table.code)],
);

/**
 * Catalog of available reports (seeded, one row per registered generator). The
 * `code` links a definition to its in-code generator; `source` names the module
 * it reads. Adding a report = register a generator + seed a definition row; the
 * reporting framework itself does not change.
 */
export const reportDefinitions = pgTable(
  'report_definitions',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: uuid('category_id').references(() => reportCategories.id),
    /** Source module the generator reads (MEMBERS, WALLET, REWARDS, …). */
    source: text('source').notNull(),
    /** Whether the report can be run (soft toggle independent of soft-delete). */
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('report_definitions_code_uq').on(table.code),
    index('report_definitions_category_id_idx').on(table.categoryId),
    index('report_definitions_source_idx').on(table.source),
  ],
);

/** A user-saved report: a definition bound to a name and a stored filter set. */
export const reports = pgTable(
  'reports',
  {
    ...baseColumns(),
    name: text('name').notNull(),
    definitionId: uuid('definition_id')
      .notNull()
      .references(() => reportDefinitions.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    filters: jsonb('filters'),
    /** Visible to all report readers when true; owner-only otherwise. */
    isShared: boolean('is_shared').notNull().default(false),
  },
  (table) => [
    index('reports_owner_id_idx').on(table.ownerId),
    index('reports_definition_id_idx').on(table.definitionId),
  ],
);

/**
 * An export job. Created PENDING and processed (synchronously for small runs,
 * or through the scheduler for large/scheduled ones) into COMPLETED with the
 * generated content stored inline. Mirrors the platform job-status lifecycle.
 */
export const reportExports = pgTable(
  'report_exports',
  {
    ...baseColumns(),
    reportCode: text('report_code').notNull(),
    format: reportExportFormat('format').notNull().default('CSV'),
    status: jobStatus('status').notNull().default('PENDING'),
    filters: jsonb('filters'),
    rowCount: integer('row_count').notNull().default(0),
    /** Generated export content (CSV text; xlsx/pdf via a pluggable exporter). */
    content: text('content'),
    contentType: text('content_type'),
    fileName: text('file_name'),
    error: text('error'),
    requestedBy: uuid('requested_by').references(() => users.id),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('report_exports_report_code_idx').on(table.reportCode),
    index('report_exports_status_idx').on(table.status),
    index('report_exports_requested_by_idx').on(table.requestedBy),
  ],
);

/** A scheduled report: cadence + stored filters, advanced on each run. */
export const reportSchedules = pgTable(
  'report_schedules',
  {
    ...baseColumns(),
    reportCode: text('report_code').notNull(),
    name: text('name').notNull(),
    frequency: reportScheduleFrequency('frequency').notNull().default('DAILY'),
    /** Cron expression when frequency is CUSTOM (validated on write). */
    cron: text('cron'),
    filters: jsonb('filters'),
    format: reportExportFormat('format').notNull().default('CSV'),
    isActive: boolean('is_active').notNull().default(true),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  },
  (table) => [
    index('report_schedules_report_code_idx').on(table.reportCode),
    index('report_schedules_next_run_idx').on(table.nextRunAt),
    index('report_schedules_active_idx').on(table.isActive),
  ],
);

/** Append-only record of each report execution (run-now, scheduled or export). */
export const reportExecutionHistory = pgTable(
  'report_execution_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportCode: text('report_code').notNull(),
    /** RUN | EXPORT | SCHEDULE — how the execution was triggered. */
    trigger: text('trigger').notNull().default('RUN'),
    status: jobStatus('status').notNull().default('COMPLETED'),
    filters: jsonb('filters'),
    rowCount: integer('row_count').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    error: text('error'),
    runBy: uuid('run_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('report_execution_history_report_code_idx').on(table.reportCode),
    index('report_execution_history_created_at_idx').on(table.createdAt),
    index('report_execution_history_status_idx').on(table.status),
  ],
);

/** Seeded lookup of available dashboard widgets (data providers). */
export const dashboardWidgets = pgTable(
  'dashboard_widgets',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    type: reportWidgetType('type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    /** Widget data configuration (e.g. which KPI or report code it renders). */
    config: jsonb('config'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('dashboard_widgets_code_uq').on(table.code)],
);

/** A user's configurable dashboard layout (ordered widget placements). */
export const dashboardLayouts = pgTable(
  'dashboard_layouts',
  {
    ...baseColumns(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    /** Ordered array of { widgetCode, position, size }. */
    layout: jsonb('layout'),
  },
  (table) => [uniqueIndex('dashboard_layouts_user_id_uq').on(table.userId)],
);

/** A user's reusable, named filter set for a report. */
export const savedFilters = pgTable(
  'saved_filters',
  {
    ...baseColumns(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    reportCode: text('report_code').notNull(),
    name: text('name').notNull(),
    filters: jsonb('filters'),
  },
  (table) => [
    index('saved_filters_user_id_idx').on(table.userId),
    index('saved_filters_report_code_idx').on(table.reportCode),
  ],
);

/** A user's favorite report definitions (quick access). */
export const favoriteReports = pgTable(
  'favorite_reports',
  {
    ...baseColumns(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    definitionId: uuid('definition_id')
      .notNull()
      .references(() => reportDefinitions.id),
  },
  (table) => [
    uniqueIndex('favorite_reports_user_definition_uq').on(table.userId, table.definitionId),
    index('favorite_reports_user_id_idx').on(table.userId),
  ],
);
