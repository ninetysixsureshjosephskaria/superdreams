import { z } from 'zod';

export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL', 'SMS', 'PUSH'] as const;
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);

export const NOTIFICATION_STATUSES = [
  'DRAFT',
  'QUEUED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
] as const;
export const notificationStatusSchema = z.enum(NOTIFICATION_STATUSES);

export const TEMPLATE_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE'] as const;
export const templateStatusSchema = z.enum(TEMPLATE_STATUSES);

const codeSchema = z
  .string()
  .trim()
  .min(2, 'At least 2 characters.')
  .max(80)
  .regex(/^[A-Za-z0-9_.-]+$/, 'Letters, numbers, dashes, dots or underscores only.')
  .transform((value) => value.toUpperCase());

const nameSchema = z.string().trim().min(1, 'Required.').max(150);
const isoDate = z.string().datetime({ message: 'Use an ISO 8601 timestamp.' });
const variablesRecord = z.record(z.union([z.string(), z.number(), z.boolean()]));

export const createTemplateSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  channel: notificationChannelSchema,
  groupCode: z.string().trim().max(50).optional(),
  subject: z.string().trim().max(300).optional(),
  body: z.string().trim().min(1, 'A body is required.').max(10_000),
  locale: z.string().trim().max(10).optional(),
  status: templateStatusSchema.optional(),
});

export const updateTemplateSchema = z.object({
  name: nameSchema.optional(),
  groupCode: z.string().trim().max(50).nullable().optional(),
  subject: z.string().trim().max(300).nullable().optional(),
  body: z.string().trim().min(1).max(10_000).optional(),
  locale: z.string().trim().max(10).optional(),
  status: templateStatusSchema.optional(),
});

export const previewTemplateSchema = z.object({
  variables: variablesRecord.optional(),
});

export const listTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  channel: notificationChannelSchema.optional(),
  status: templateStatusSchema.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'code']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const createNotificationSchema = z
  .object({
    templateCode: z.string().trim().max(80).optional(),
    channel: notificationChannelSchema.optional(),
    subject: z.string().trim().max(300).optional(),
    body: z.string().trim().max(10_000).optional(),
    variables: variablesRecord.optional(),
    groupCode: z.string().trim().max(50).optional(),
    recipientUserId: z.string().uuid().optional(),
    recipientMemberId: z.string().uuid().optional(),
    scheduledAt: isoDate.optional(),
  })
  .refine((value) => value.recipientUserId != null || value.recipientMemberId != null, {
    message: 'Provide a recipient user or member.',
    path: ['recipientUserId'],
  })
  .refine((value) => value.templateCode != null || (value.channel != null && value.body != null), {
    message: 'Provide a templateCode, or a channel and body.',
    path: ['templateCode'],
  });

export const scheduleNotificationSchema = createNotificationSchema;

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  channel: notificationChannelSchema.optional(),
  status: notificationStatusSchema.optional(),
  recipientUserId: z.string().uuid().optional(),
  recipientMemberId: z.string().uuid().optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  sortBy: z.enum(['createdAt', 'scheduledAt', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const inboxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['ALL', 'UNREAD', 'READ', 'ARCHIVED']).default('ALL'),
});

const preferenceItemSchema = z.object({
  channel: notificationChannelSchema,
  groupCode: z.string().trim().max(50).nullable().optional(),
  enabled: z.boolean(),
});

export const updatePreferencesSchema = z.object({
  preferences: z.array(preferenceItemSchema).max(50),
});

export const processQueueSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  asOf: isoDate.optional(),
});

export const templateIdParamsSchema = z.object({ id: z.string().uuid() });
export const notificationIdParamsSchema = z.object({ id: z.string().uuid() });
