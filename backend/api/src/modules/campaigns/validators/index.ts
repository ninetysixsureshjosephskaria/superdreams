import { z } from 'zod';

export const CAMPAIGN_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED',
] as const;
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);

export const CAMPAIGN_TYPES = [
  'PROMOTIONAL',
  'REWARD',
  'REFERRAL',
  'SEASONAL',
  'ENGAGEMENT',
] as const;
export const campaignTypeSchema = z.enum(CAMPAIGN_TYPES);

export const CAMPAIGN_AUDIENCE_TYPES = [
  'ALL_MEMBERS',
  'SEGMENT',
  'MANUAL',
  'STATUS',
  'JOIN_DATE',
] as const;
export const campaignAudienceTypeSchema = z.enum(CAMPAIGN_AUDIENCE_TYPES);

export const CAMPAIGN_RULE_TYPES = [
  'MEMBER_STATUS',
  'JOIN_DATE_AFTER',
  'JOIN_DATE_BEFORE',
  'REWARD_ELIGIBILITY',
  'SEGMENT',
] as const;
export const campaignRuleTypeSchema = z.enum(CAMPAIGN_RULE_TYPES);

export const CAMPAIGN_SCHEDULE_TYPES = ['IMMEDIATE', 'SCHEDULED', 'RECURRING'] as const;
export const campaignScheduleTypeSchema = z.enum(CAMPAIGN_SCHEDULE_TYPES);

const codeSchema = z
  .string()
  .trim()
  .min(2, 'At least 2 characters.')
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, dashes or underscores.')
  .transform((value) => value.toUpperCase());

const nameSchema = z.string().trim().min(1, 'Required.').max(150);
const isoDate = z.string().datetime({ message: 'Use an ISO 8601 timestamp.' });
const points = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

const ruleInputSchema = z.object({
  type: campaignRuleTypeSchema,
  value: z.string().trim().max(200).optional(),
});

const rewardInputSchema = z.object({
  rewardProgramId: z.string().uuid().optional(),
  points,
  description: z.string().trim().max(500).optional(),
});

export const createCampaignSchema = z
  .object({
    code: codeSchema,
    name: nameSchema,
    description: z.string().trim().max(2000).optional(),
    type: campaignTypeSchema,
    audienceType: campaignAudienceTypeSchema.optional(),
    status: z.enum(['DRAFT', 'ACTIVE']).optional(),
    startsAt: isoDate.optional(),
    endsAt: isoDate.optional(),
    rules: z.array(ruleInputSchema).max(20).optional(),
    reward: rewardInputSchema.optional(),
  })
  .refine((value) => !value.startsAt || !value.endsAt || value.startsAt <= value.endsAt, {
    message: 'Campaign start must be before its end.',
    path: ['endsAt'],
  });

export const updateCampaignSchema = z.object({
  name: nameSchema.optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  audienceType: campaignAudienceTypeSchema.optional(),
  startsAt: isoDate.nullable().optional(),
  endsAt: isoDate.nullable().optional(),
  rules: z.array(ruleInputSchema).max(20).optional(),
  reward: rewardInputSchema.nullable().optional(),
});

export const changeCampaignStatusSchema = z.object({
  status: campaignStatusSchema,
  reason: z.string().trim().max(500).optional(),
});

export const scheduleCampaignSchema = z
  .object({
    scheduleType: campaignScheduleTypeSchema,
    startAt: isoDate.optional(),
    endAt: isoDate.optional(),
    recurrenceCron: z.string().trim().max(120).optional(),
    timezone: z.string().trim().max(60).optional(),
  })
  .refine((value) => value.scheduleType !== 'SCHEDULED' || value.startAt != null, {
    message: 'A scheduled campaign requires a start time.',
    path: ['startAt'],
  })
  .refine((value) => value.scheduleType !== 'RECURRING' || value.recurrenceCron != null, {
    message: 'A recurring campaign requires a recurrence expression.',
    path: ['recurrenceCron'],
  });

export const addTargetsSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1, 'Add at least one member.').max(1000),
});

export const executeCampaignSchema = z.object({
  dryRun: z.boolean().optional(),
});

export const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  status: campaignStatusSchema.optional(),
  type: campaignTypeSchema.optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'status', 'startsAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const listEnrollmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['ELIGIBLE', 'ENROLLED', 'REWARDED', 'EXCLUDED']).optional(),
});

export const campaignIdParamsSchema = z.object({ id: z.string().uuid() });
export const memberIdParamsSchema = z.object({ memberId: z.string().uuid() });
