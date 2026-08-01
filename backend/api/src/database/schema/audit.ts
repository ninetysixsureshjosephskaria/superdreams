import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { auditAction } from './enums';

/**
 * Append-only audit log. Records are never updated or deleted, so this table
 * intentionally omits `updated_at`, `deleted_at`, and `version`.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    action: auditAction('action').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    userId: uuid('user_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    module: text('module'),
    correlationId: uuid('correlation_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_created_at_idx').on(table.createdAt),
    index('audit_logs_correlation_id_idx').on(table.correlationId),
  ],
);
