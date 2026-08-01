import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { jobStatus } from './enums';

/** Queued/scheduled units of work processed by the worker. */
export const jobs = pgTable(
  'jobs',
  {
    ...baseColumns(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    status: jobStatus('status').notNull().default('PENDING'),
    payload: jsonb('payload'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    lastError: text('last_error'),
  },
  (table) => [
    index('jobs_status_idx').on(table.status),
    index('jobs_type_idx').on(table.type),
    index('jobs_scheduled_at_idx').on(table.scheduledAt),
    index('jobs_deleted_at_idx').on(table.deletedAt),
  ],
);

/** Progress tracking for long-running background tasks. */
export const backgroundTasks = pgTable(
  'background_tasks',
  {
    ...baseColumns(),
    name: text('name').notNull(),
    status: jobStatus('status').notNull().default('PENDING'),
    progress: integer('progress').notNull().default(0),
    total: integer('total'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    metadata: jsonb('metadata'),
    lastError: text('last_error'),
  },
  (table) => [
    index('background_tasks_status_idx').on(table.status),
    index('background_tasks_created_at_idx').on(table.createdAt),
  ],
);
