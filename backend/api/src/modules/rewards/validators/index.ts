import { z } from 'zod';

export const REWARD_PROGRAM_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export const rewardProgramStatusSchema = z.enum(REWARD_PROGRAM_STATUSES);

export const REWARD_RULE_TYPES = [
  'FIXED',
  'PERCENTAGE',
  'TIER',
  'EVENT',
  'MANUAL',
  'PROMOTIONAL',
] as const;
export const rewardRuleTypeSchema = z.enum(REWARD_RULE_TYPES);

export const REWARD_TRANSACTION_TYPES = [
  'EARN',
  'REDEEM',
  'ADJUSTMENT',
  'EXPIRE',
  'REVERSAL',
] as const;
export const rewardTransactionTypeSchema = z.enum(REWARD_TRANSACTION_TYPES);

export const REWARD_DIRECTIONS = ['CREDIT', 'DEBIT'] as const;
export const rewardDirectionSchema = z.enum(REWARD_DIRECTIONS);

export const REWARD_EXPIRY_POLICIES = ['FIXED_DATE', 'ROLLING', 'NEVER'] as const;

/** A positive whole number of points. */
export const pointsSchema = z.coerce
  .number()
  .int('Points must be a whole number.')
  .positive('Points must be greater than zero.')
  .max(Number.MAX_SAFE_INTEGER);

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, dashes or underscores.')
  .transform((value) => value.toUpperCase());

const nameSchema = z.string().trim().min(1, 'Required.').max(150);
const isoDate = z.string().datetime({ message: 'Use an ISO 8601 timestamp.' });

const ruleInputSchema = z.object({
  name: z.string().trim().min(1).max(150),
  type: rewardRuleTypeSchema,
  points: z.coerce.number().int().positive().optional(),
  rateBasisPoints: z.coerce.number().int().positive().max(1_000_000).optional(),
  priority: z.coerce.number().int().min(0).optional(),
});

const expiryInputSchema = z.object({
  policy: z.enum(REWARD_EXPIRY_POLICIES),
  fixedDate: isoDate.optional(),
  rollingDays: z.coerce.number().int().positive().max(3650).optional(),
});

export const createProgramSchema = z
  .object({
    code: codeSchema,
    name: nameSchema,
    description: z.string().trim().max(2000).optional(),
    type: rewardRuleTypeSchema,
    categoryCode: z.string().trim().max(50).optional(),
    status: rewardProgramStatusSchema.optional(),
    startsAt: isoDate.optional(),
    endsAt: isoDate.optional(),
    pointsPerUnit: z.coerce.number().int().positive().optional(),
    rules: z.array(ruleInputSchema).max(20).optional(),
    expiry: expiryInputSchema.optional(),
  })
  .refine((value) => !value.startsAt || !value.endsAt || value.startsAt <= value.endsAt, {
    message: 'Program start must be before its end.',
    path: ['endsAt'],
  });

export const updateProgramSchema = z.object({
  name: nameSchema.optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  categoryCode: z.string().trim().max(50).nullable().optional(),
  startsAt: isoDate.nullable().optional(),
  endsAt: isoDate.nullable().optional(),
  pointsPerUnit: z.coerce.number().int().positive().nullable().optional(),
});

export const changeProgramStatusSchema = z.object({
  status: rewardProgramStatusSchema,
  reason: z.string().trim().max(500).optional(),
});

export const allocateSchema = z
  .object({
    programId: z.string().uuid().optional(),
    ruleId: z.string().uuid().optional(),
    points: pointsSchema.optional(),
    baseValue: z.coerce.number().int().positive().optional(),
    description: z.string().trim().max(500).optional(),
    reference: z.string().trim().min(1).max(100).optional(),
    expiresInDays: z.coerce.number().int().positive().max(3650).optional(),
  })
  .refine((value) => value.points != null || value.ruleId != null, {
    message: 'Provide either points or a ruleId to allocate.',
    path: ['points'],
  });

export const redeemSchema = z.object({
  points: pointsSchema,
  note: z.string().trim().max(500).optional(),
  reference: z.string().trim().min(1).max(100).optional(),
  /** Optional wallet credit (minor units) produced by this redemption. */
  walletCreditMinor: z.coerce.number().int().positive().optional(),
});

export const adjustSchema = z.object({
  direction: rewardDirectionSchema,
  points: pointsSchema,
  reason: z.string().trim().min(1, 'A reason is required for adjustments.').max(500),
  reference: z.string().trim().min(1).max(100).optional(),
});

export const expireSchema = z.object({
  asOf: isoDate.optional(),
});

export const listProgramsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  status: rewardProgramStatusSchema.optional(),
  type: rewardRuleTypeSchema.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'status', 'code']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  memberId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  type: rewardTransactionTypeSchema.optional(),
  direction: rewardDirectionSchema.optional(),
  status: z.enum(['POSTED', 'REVERSED']).optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  sortBy: z.enum(['createdAt', 'points']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const memberHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  type: rewardTransactionTypeSchema.optional(),
  direction: rewardDirectionSchema.optional(),
  status: z.enum(['POSTED', 'REVERSED']).optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const programIdParamsSchema = z.object({ id: z.string().uuid() });
export const memberIdParamsSchema = z.object({ memberId: z.string().uuid() });
export const memberTxnParamsSchema = z.object({
  memberId: z.string().uuid(),
  transactionId: z.string().uuid(),
});
