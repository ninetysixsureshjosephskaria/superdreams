import type { z } from 'zod';

import type { PaginatedResult } from '@/database/types';

import type {
  createNotificationSchema,
  createTemplateSchema,
  inboxQuerySchema,
  listNotificationsQuerySchema,
  listTemplatesQuerySchema,
  previewTemplateSchema,
  processQueueSchema,
  updatePreferencesSchema,
  updateTemplateSchema,
} from '../validators';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
export type NotificationStatus =
  'DRAFT' | 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type NotificationQueueStatus =
  'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'DEAD' | 'CANCELLED';
export type NotificationDeliveryResult = 'SENT' | 'DELIVERED' | 'FAILED';
export type TemplateStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface TemplateData {
  id: string;
  code: string;
  name: string;
  groupCode: string | null;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  variables: string[];
  locale: string;
  revision: number;
  status: TemplateStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplatePreview {
  subject: string | null;
  body: string;
  missingVariables: string[];
}

export interface NotificationData {
  id: string;
  recipientUserId: string | null;
  recipientMemberId: string | null;
  templateId: string | null;
  groupCode: string | null;
  channel: NotificationChannel;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  scheduledAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  archivedAt: Date | null;
  failedReason: string | null;
  createdAt: Date;
}

export interface QueueItemData {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationQueueStatus;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextAttemptAt: Date | null;
  processedAt: Date | null;
  createdAt: Date;
}

export interface DeliveryData {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  result: NotificationDeliveryResult;
  provider: string;
  providerMessageId: string | null;
  error: string | null;
  attempt: number;
  createdAt: Date;
}

export interface NotificationLogData {
  id: string;
  action: string;
  fromStatus: NotificationStatus | null;
  toStatus: NotificationStatus | null;
  detail: string | null;
  actorId: string | null;
  createdAt: Date;
}

export interface PreferenceData {
  channel: NotificationChannel;
  groupCode: string | null;
  enabled: boolean;
}

export interface QueueRunResult {
  processed: number;
  sent: number;
  failed: number;
  dead: number;
}

export type PaginatedTemplates = PaginatedResult<TemplateData>;
export type PaginatedNotifications = PaginatedResult<NotificationData>;

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type PreviewTemplateInput = z.infer<typeof previewTemplateSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type InboxQuery = z.infer<typeof inboxQuerySchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type ProcessQueueInput = z.infer<typeof processQueueSchema>;

/** Actor + request context for auditing and authorship. */
export interface NotificationActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
