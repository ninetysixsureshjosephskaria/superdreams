import type { InferSelectModel } from 'drizzle-orm';

import type {
  notificationDeliveries,
  notificationLogs,
  notificationQueue,
  notificationTemplates,
  notifications,
} from '@/database/schema';

import type {
  DeliveryData,
  NotificationData,
  NotificationLogData,
  QueueItemData,
  TemplateData,
} from '../dto';
import { extractVariables } from '../templates/render';

export type TemplateRow = InferSelectModel<typeof notificationTemplates>;
export type NotificationRow = InferSelectModel<typeof notifications>;
export type QueueRow = InferSelectModel<typeof notificationQueue>;
export type DeliveryRow = InferSelectModel<typeof notificationDeliveries>;
export type NotificationLogRow = InferSelectModel<typeof notificationLogs>;

export function toTemplate(row: TemplateRow, groupCode: string | null): TemplateData {
  const declared = Array.isArray(row.variables)
    ? (row.variables as string[])
    : extractVariables(`${row.subject ?? ''} ${row.body}`);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    groupCode,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    variables: declared,
    locale: row.locale,
    revision: row.revision,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toNotification(row: NotificationRow, groupCode: string | null): NotificationData {
  return {
    id: row.id,
    recipientUserId: row.recipientUserId,
    recipientMemberId: row.recipientMemberId,
    templateId: row.templateId,
    groupCode,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    status: row.status,
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt,
    deliveredAt: row.deliveredAt,
    readAt: row.readAt,
    archivedAt: row.archivedAt,
    failedReason: row.failedReason,
    createdAt: row.createdAt,
  };
}

export function toQueueItem(row: QueueRow): QueueItemData {
  return {
    id: row.id,
    notificationId: row.notificationId,
    channel: row.channel,
    status: row.status,
    scheduledAt: row.scheduledAt,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lastError: row.lastError,
    nextAttemptAt: row.nextAttemptAt,
    processedAt: row.processedAt,
    createdAt: row.createdAt,
  };
}

export function toDelivery(row: DeliveryRow): DeliveryData {
  return {
    id: row.id,
    notificationId: row.notificationId,
    channel: row.channel,
    result: row.result,
    provider: row.provider,
    providerMessageId: row.providerMessageId,
    error: row.error,
    attempt: row.attempt,
    createdAt: row.createdAt,
  };
}

export function toNotificationLog(row: NotificationLogRow): NotificationLogData {
  return {
    id: row.id,
    action: row.action,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    detail: row.detail,
    actorId: row.actorId,
    createdAt: row.createdAt,
  };
}
