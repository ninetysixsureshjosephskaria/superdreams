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
import {
  notificationChannel,
  notificationDeliveryResult,
  notificationQueueStatus,
  notificationStatus,
  notificationTemplateStatus,
} from './enums';
import { users } from './identity';
import { members } from './members';

/**
 * Notification Center. A centralized system: reusable templates, a
 * provider-based delivery pipeline (in-app real; email/sms/push mocked), an
 * idempotent queue with retry + dead-letter, an immutable lifecycle log, a
 * member inbox, and per-user preferences. Notifications are event *consumers*
 * of the other business modules (mapped via `notification_events`).
 */

/** Seeded lookup of delivery channels. */
export const notificationChannels = pgTable(
  'notification_channels',
  {
    ...baseColumns(),
    code: notificationChannel('code').notNull(),
    label: text('label').notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('notification_channels_code_uq').on(table.code)],
);

/** Seeded lookup grouping notifications into categories. */
export const notificationGroups = pgTable(
  'notification_groups',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    label: text('label').notNull(),
    description: text('description'),
  },
  (table) => [uniqueIndex('notification_groups_code_uq').on(table.code)],
);

/** Reusable, versioned notification template with variable placeholders. */
export const notificationTemplates = pgTable(
  'notification_templates',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    groupId: uuid('group_id').references(() => notificationGroups.id),
    channel: notificationChannel('channel').notNull(),
    subject: text('subject'),
    body: text('body').notNull(),
    /** Declared variable names (for validation + preview). */
    variables: jsonb('variables'),
    locale: text('locale').notNull().default('en'),
    revision: integer('revision').notNull().default(1),
    status: notificationTemplateStatus('status').notNull().default('DRAFT'),
  },
  (table) => [
    uniqueIndex('notification_templates_code_uq').on(table.code),
    index('notification_templates_channel_idx').on(table.channel),
    index('notification_templates_status_idx').on(table.status),
  ],
);

/** Per-user delivery preferences (per channel, optionally per group). */
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    ...baseColumns(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    channel: notificationChannel('channel').notNull(),
    groupId: uuid('group_id').references(() => notificationGroups.id),
    enabled: boolean('enabled').notNull().default(true),
  },
  (table) => [
    uniqueIndex('notification_preferences_uq').on(table.userId, table.channel, table.groupId),
    index('notification_preferences_user_id_idx').on(table.userId),
  ],
);

/** A notification record (also the member inbox row for IN_APP). */
export const notifications = pgTable(
  'notifications',
  {
    ...baseColumns(),
    recipientUserId: uuid('recipient_user_id').references(() => users.id),
    recipientMemberId: uuid('recipient_member_id').references(() => members.id),
    templateId: uuid('template_id').references(() => notificationTemplates.id),
    groupId: uuid('group_id').references(() => notificationGroups.id),
    channel: notificationChannel('channel').notNull(),
    subject: text('subject'),
    body: text('body').notNull(),
    /** Rendering variables + arbitrary metadata. */
    data: jsonb('data'),
    status: notificationStatus('status').notNull().default('DRAFT'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    failedReason: text('failed_reason'),
  },
  (table) => [
    index('notifications_recipient_user_idx').on(table.recipientUserId),
    index('notifications_status_idx').on(table.status),
    index('notifications_channel_idx').on(table.channel),
    index('notifications_created_at_idx').on(table.createdAt),
  ],
);

/** Idempotent delivery queue with retry + dead-letter support. */
export const notificationQueue = pgTable(
  'notification_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id),
    channel: notificationChannel('channel').notNull(),
    status: notificationQueueStatus('status').notNull().default('PENDING'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull().defaultNow(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    lastError: text('last_error'),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('notification_queue_notification_id_uq').on(table.notificationId),
    index('notification_queue_status_idx').on(table.status),
    index('notification_queue_scheduled_idx').on(table.scheduledAt),
  ],
);

/** Append-only record of each delivery attempt's result. */
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id),
    channel: notificationChannel('channel').notNull(),
    result: notificationDeliveryResult('result').notNull(),
    provider: text('provider').notNull(),
    providerMessageId: text('provider_message_id'),
    error: text('error'),
    attempt: integer('attempt').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notification_deliveries_notification_id_idx').on(table.notificationId)],
);

/** Append-only, immutable notification lifecycle history. */
export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id),
    action: text('action').notNull(),
    fromStatus: notificationStatus('from_status'),
    toStatus: notificationStatus('to_status'),
    detail: text('detail'),
    actorId: uuid('actor_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notification_logs_notification_id_idx').on(table.notificationId)],
);

/** Maps a domain event type to a template + channel (consumer configuration). */
export const notificationEvents = pgTable(
  'notification_events',
  {
    ...baseColumns(),
    eventType: text('event_type').notNull(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => notificationTemplates.id),
    channel: notificationChannel('channel').notNull(),
    groupId: uuid('group_id').references(() => notificationGroups.id),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('notification_events_event_type_uq').on(table.eventType)],
);

/** A user's opt-in subscription to a notification group. */
export const notificationSubscriptions = pgTable(
  'notification_subscriptions',
  {
    ...baseColumns(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    groupId: uuid('group_id')
      .notNull()
      .references(() => notificationGroups.id),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('notification_subscriptions_uq').on(table.userId, table.groupId),
    index('notification_subscriptions_user_id_idx').on(table.userId),
  ],
);
