import type { AxiosInstance } from 'axios';

/**
 * Notification Center API resource — the single, shared definition of the
 * notification HTTP contract used by every application (no duplicated API
 * logic). JSON dates are strings over the wire.
 */

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
export type NotificationStatus =
  'DRAFT' | 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type NotificationQueueStatus =
  'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'DEAD' | 'CANCELLED';
export type NotificationDeliveryResult = 'SENT' | 'DELIVERED' | 'FAILED';
export type TemplateStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type InboxFilter = 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED';

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
  createdAt: string;
  updatedAt: string;
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
  scheduledAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  archivedAt: string | null;
  failedReason: string | null;
  createdAt: string;
}

export interface QueueItemData {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationQueueStatus;
  scheduledAt: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  processedAt: string | null;
  createdAt: string;
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
  createdAt: string;
}

export interface NotificationLogData {
  id: string;
  action: string;
  fromStatus: NotificationStatus | null;
  toStatus: NotificationStatus | null;
  detail: string | null;
  actorId: string | null;
  createdAt: string;
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

export interface PaginatedTemplates {
  items: TemplateData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedNotifications {
  items: NotificationData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type TemplateSortField = 'createdAt' | 'updatedAt' | 'name' | 'code';

export interface ListTemplatesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  channel?: NotificationChannel;
  status?: TemplateStatus;
  sortBy?: TemplateSortField;
  order?: 'asc' | 'desc';
}

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  recipientUserId?: string;
  recipientMemberId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'scheduledAt' | 'status';
  order?: 'asc' | 'desc';
}

export interface InboxParams {
  page?: number;
  pageSize?: number;
  status?: InboxFilter;
}

export interface CreateTemplateInput {
  code: string;
  name: string;
  channel: NotificationChannel;
  groupCode?: string;
  subject?: string;
  body: string;
  locale?: string;
  status?: TemplateStatus;
}

export interface UpdateTemplateInput {
  name?: string;
  groupCode?: string | null;
  subject?: string | null;
  body?: string;
  locale?: string;
  status?: TemplateStatus;
}

export type TemplateVariables = Record<string, string | number | boolean>;

export interface SendNotificationInput {
  templateCode?: string;
  channel?: NotificationChannel;
  subject?: string;
  body?: string;
  variables?: TemplateVariables;
  groupCode?: string;
  recipientUserId?: string;
  recipientMemberId?: string;
  scheduledAt?: string;
}

export interface PreferenceInput {
  channel: NotificationChannel;
  groupCode?: string | null;
  enabled: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface NotificationsApi {
  listTemplates(params?: ListTemplatesParams): Promise<PaginatedTemplates>;
  getTemplate(id: string): Promise<TemplateData>;
  createTemplate(input: CreateTemplateInput): Promise<TemplateData>;
  updateTemplate(id: string, input: UpdateTemplateInput): Promise<TemplateData>;
  previewTemplate(id: string, variables: TemplateVariables): Promise<TemplatePreview>;
  list(params?: ListNotificationsParams): Promise<PaginatedNotifications>;
  get(id: string): Promise<NotificationData>;
  create(input: SendNotificationInput): Promise<NotificationData>;
  send(input: SendNotificationInput): Promise<NotificationData>;
  schedule(input: SendNotificationInput): Promise<NotificationData>;
  retry(id: string): Promise<NotificationData>;
  cancel(id: string): Promise<NotificationData>;
  process(input?: { limit?: number; asOf?: string }): Promise<QueueRunResult>;
  queue(
    status?: NotificationQueueStatus,
  ): Promise<{ items: QueueItemData[]; counts: Record<string, number> }>;
  deliveries(id: string): Promise<DeliveryData[]>;
  logs(id: string): Promise<NotificationLogData[]>;
  inbox(params?: InboxParams): Promise<PaginatedNotifications>;
  unreadCount(): Promise<number>;
  markRead(id: string): Promise<NotificationData>;
  markUnread(id: string): Promise<NotificationData>;
  archive(id: string): Promise<NotificationData>;
  getPreferences(): Promise<PreferenceData[]>;
  updatePreferences(preferences: PreferenceInput[]): Promise<PreferenceData[]>;
}

/** Binds the notifications resource to a configured API client. */
export function createNotificationsApi(client: AxiosInstance): NotificationsApi {
  const base = '/api/v1';
  return {
    async listTemplates(params) {
      const response = await client.get<Envelope<PaginatedTemplates>>(
        `${base}/notification-templates`,
        { params },
      );
      return response.data.data;
    },
    async getTemplate(id) {
      const response = await client.get<Envelope<TemplateData>>(
        `${base}/notification-templates/${id}`,
      );
      return response.data.data;
    },
    async createTemplate(input) {
      const response = await client.post<Envelope<TemplateData>>(
        `${base}/notification-templates`,
        input,
      );
      return response.data.data;
    },
    async updateTemplate(id, input) {
      const response = await client.put<Envelope<TemplateData>>(
        `${base}/notification-templates/${id}`,
        input,
      );
      return response.data.data;
    },
    async previewTemplate(id, variables) {
      const response = await client.post<Envelope<TemplatePreview>>(
        `${base}/notification-templates/${id}/preview`,
        { variables },
      );
      return response.data.data;
    },
    async list(params) {
      const response = await client.get<Envelope<PaginatedNotifications>>(`${base}/notifications`, {
        params,
      });
      return response.data.data;
    },
    async get(id) {
      const response = await client.get<Envelope<NotificationData>>(`${base}/notifications/${id}`);
      return response.data.data;
    },
    async create(input) {
      const response = await client.post<Envelope<NotificationData>>(
        `${base}/notifications`,
        input,
      );
      return response.data.data;
    },
    async send(input) {
      const response = await client.post<Envelope<NotificationData>>(
        `${base}/notifications/send`,
        input,
      );
      return response.data.data;
    },
    async schedule(input) {
      const response = await client.post<Envelope<NotificationData>>(
        `${base}/notifications/schedule`,
        input,
      );
      return response.data.data;
    },
    async retry(id) {
      const response = await client.post<Envelope<NotificationData>>(
        `${base}/notifications/${id}/retry`,
      );
      return response.data.data;
    },
    async cancel(id) {
      const response = await client.post<Envelope<NotificationData>>(
        `${base}/notifications/${id}/cancel`,
      );
      return response.data.data;
    },
    async process(input) {
      const response = await client.post<Envelope<QueueRunResult>>(
        `${base}/notifications/process`,
        input ?? {},
      );
      return response.data.data;
    },
    async queue(status) {
      const response = await client.get<
        Envelope<{ items: QueueItemData[]; counts: Record<string, number> }>
      >(`${base}/notifications/queue`, { params: status ? { status } : undefined });
      return response.data.data;
    },
    async deliveries(id) {
      const response = await client.get<ItemsEnvelope<DeliveryData>>(
        `${base}/notifications/${id}/deliveries`,
      );
      return response.data.data.items;
    },
    async logs(id) {
      const response = await client.get<ItemsEnvelope<NotificationLogData>>(
        `${base}/notifications/${id}/logs`,
      );
      return response.data.data.items;
    },
    async inbox(params) {
      const response = await client.get<Envelope<PaginatedNotifications>>(
        `${base}/notifications/me`,
        { params },
      );
      return response.data.data;
    },
    async unreadCount() {
      const response = await client.get<Envelope<{ unread: number }>>(
        `${base}/notifications/me/unread-count`,
      );
      return response.data.data.unread;
    },
    async markRead(id) {
      const response = await client.patch<Envelope<NotificationData>>(
        `${base}/notifications/${id}/read`,
      );
      return response.data.data;
    },
    async markUnread(id) {
      const response = await client.patch<Envelope<NotificationData>>(
        `${base}/notifications/${id}/unread`,
      );
      return response.data.data;
    },
    async archive(id) {
      const response = await client.patch<Envelope<NotificationData>>(
        `${base}/notifications/${id}/archive`,
      );
      return response.data.data;
    },
    async getPreferences() {
      const response = await client.get<ItemsEnvelope<PreferenceData>>(
        `${base}/notifications/preferences`,
      );
      return response.data.data.items;
    },
    async updatePreferences(preferences) {
      const response = await client.put<ItemsEnvelope<PreferenceData>>(
        `${base}/notifications/preferences`,
        {
          preferences,
        },
      );
      return response.data.data.items;
    },
  };
}
