import { z } from 'zod';

export const REPORT_FORMATS = ['CSV', 'XLSX', 'PDF'] as const;
export const reportFormatSchema = z.enum(REPORT_FORMATS);

export const SCHEDULE_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] as const;
export const scheduleFrequencySchema = z.enum(SCHEDULE_FREQUENCIES);

const isoDate = z.string().datetime({ message: 'Use an ISO 8601 timestamp.' });
const uuid = z.string().uuid();

const reportCodeSchema = z
  .string()
  .trim()
  .min(2, 'At least 2 characters.')
  .max(80)
  .regex(/^[A-Za-z0-9_]+$/, 'Letters, numbers or underscores only.')
  .transform((value) => value.toUpperCase());

/**
 * A single 5-field cron expression. Deliberately permissive (numbers, ranges,
 * lists, steps and `*`) — enough to reject malformed input without embedding a
 * full cron engine. Full evaluation is a pluggable scheduler concern.
 */
const cronFieldPattern = /^(\*|(\*\/\d+)|(\d+(-\d+)?)(,\d+(-\d+)?)*(\/\d+)?)$/;
const cronExpressionSchema = z
  .string()
  .trim()
  .refine((value) => {
    const fields = value.split(/\s+/);
    return fields.length === 5 && fields.every((field) => cronFieldPattern.test(field));
  }, 'Provide a valid 5-field cron expression.');

/** Report filter inputs. All optional; each generator reads what it needs. */
export const reportFiltersSchema = z
  .object({
    dateFrom: isoDate.optional(),
    dateTo: isoDate.optional(),
    status: z.string().trim().max(50).optional(),
    memberId: uuid.optional(),
    campaignId: uuid.optional(),
    rewardProgramId: uuid.optional(),
    walletId: uuid.optional(),
    channel: z.string().trim().max(20).optional(),
  })
  .refine(
    (value) =>
      !value.dateFrom || !value.dateTo || new Date(value.dateFrom) <= new Date(value.dateTo),
    { message: 'dateFrom must be on or before dateTo.', path: ['dateFrom'] },
  );

export const runReportSchema = z.object({
  code: reportCodeSchema,
  filters: reportFiltersSchema.optional(),
});

export const listReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(50).optional(),
  source: z.string().trim().max(50).optional(),
  sortBy: z.enum(['createdAt', 'name', 'code']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const createExportSchema = z.object({
  code: reportCodeSchema,
  format: reportFormatSchema.default('CSV'),
  filters: reportFiltersSchema.optional(),
});

export const listExportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  code: reportCodeSchema.optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  format: reportFormatSchema.optional(),
});

export const createScheduleSchema = z
  .object({
    code: reportCodeSchema,
    name: z.string().trim().min(1, 'Required.').max(150),
    frequency: scheduleFrequencySchema.default('DAILY'),
    cron: cronExpressionSchema.optional(),
    filters: reportFiltersSchema.optional(),
    format: reportFormatSchema.default('CSV'),
  })
  .refine((value) => value.frequency !== 'CUSTOM' || value.cron != null, {
    message: 'A CUSTOM schedule requires a cron expression.',
    path: ['cron'],
  });

export const updateScheduleSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  frequency: scheduleFrequencySchema.optional(),
  cron: cronExpressionSchema.nullable().optional(),
  filters: reportFiltersSchema.optional(),
  format: reportFormatSchema.optional(),
  isActive: z.boolean().optional(),
});

export const listHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  code: reportCodeSchema.optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  trigger: z.enum(['RUN', 'EXPORT', 'SCHEDULE']).optional(),
});

export const saveReportSchema = z.object({
  name: z.string().trim().min(1, 'Required.').max(150),
  code: reportCodeSchema,
  filters: reportFiltersSchema.optional(),
  isShared: z.boolean().optional(),
});

export const savedFilterSchema = z.object({
  reportCode: reportCodeSchema,
  name: z.string().trim().min(1, 'Required.').max(150),
  filters: reportFiltersSchema,
});

export const dashboardLayoutSchema = z.object({
  layout: z
    .array(
      z.object({
        widgetCode: z.string().trim().min(1).max(80),
        position: z.coerce.number().int().min(0).max(1000),
        size: z.enum(['sm', 'md', 'lg', 'full']).optional(),
      }),
    )
    .max(50),
});

export const favoriteSchema = z.object({
  definitionCode: reportCodeSchema,
});

export const reportIdParamsSchema = z.object({ id: z.string().uuid() });
