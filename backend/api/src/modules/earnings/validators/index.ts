import { z } from 'zod';

import { tiersOverlap } from '../domain/tiers';

const COMMISSION_RANGE_MSG = 'Enter a commission between 0 and 100%.';
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.');

export const rateBpsSchema = z.coerce
  .number()
  .int(COMMISSION_RANGE_MSG)
  .min(0, COMMISSION_RANGE_MSG)
  .max(10_000, COMMISSION_RANGE_MSG);

export const tierSchema = z
  .object({
    fromUnits: z.coerce.number().int().min(0),
    toUnits: z.coerce.number().int().min(0).nullable().optional(),
    rateBps: rateBpsSchema,
  })
  .refine((t) => t.toUnits === null || t.toUnits === undefined || t.toUnits >= t.fromUnits, {
    message: 'A tier upper bound must be greater than or equal to its lower bound.',
    path: ['toUnits'],
  });

const tiersArray = z.array(tierSchema).refine(
  (tiers) =>
    !tiersOverlap(
      tiers.map((t) => ({
        fromUnits: t.fromUnits,
        toUnits: t.toUnits ?? null,
        rateBps: t.rateBps,
      })),
    ),
  { message: 'This range overlaps a tier you already added.' },
);

export const setDefaultTiersSchema = z.object({ tiers: tiersArray });

export const updateReferralRateSchema = z.object({ rateBps: rateBpsSchema });

export const createTargetSchema = z
  .object({
    startDate: dateStr,
    endDate: dateStr,
    tiers: tiersArray,
  })
  .refine((t) => t.endDate >= t.startDate, {
    message: 'The end date must be on or after the start date.',
    path: ['endDate'],
  });

export const processDepositSchema = z.object({ depositRequestId: z.string().uuid() });
export const targetIdParamsSchema = z.object({ id: z.string().uuid() });

// --- Daily profit ----------------------------------------------------------

const monthStr = z.string().regex(/^\d{4}-\d{2}$/, 'Use a YYYY-MM month.');
const dayStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.');
/** Rate in basis points; monthly targets may exceed 100% across many days. */
const profitBpsSchema = z.coerce.number().int().min(0).max(1_000_000);

export const planMonthSchema = z.object({
  month: monthStr,
  memberMonthlyBps: profitBpsSchema,
  partnerMonthlyBps: profitBpsSchema,
});

export const setDaySchema = z.object({
  day: dayStr,
  memberBps: profitBpsSchema.optional(),
  partnerBps: profitBpsSchema.optional(),
  off: z.boolean().optional(),
});

export const distributeSchema = z.object({
  day: dayStr,
  memberBps: profitBpsSchema.optional(),
  partnerBps: profitBpsSchema.optional(),
});

export const monthParamsSchema = z.object({ month: monthStr });
export const historyQuerySchema = z.object({ from: dayStr, to: dayStr });

// --- Bonus campaigns -------------------------------------------------------

export const BONUS_SCOPES = ['FIRST_DEPOSIT', 'ALL_DEPOSITS'] as const;
export const BONUS_FREQUENCIES = ['SINGLE', 'MULTI'] as const;
const bonusRateBps = z.coerce
  .number()
  .int('Enter a bonus rate between 0 and 100%.')
  .min(0, 'Enter a bonus rate between 0 and 100%.')
  .max(10_000, 'Enter a bonus rate between 0 and 100%.');

export const createBonusCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    icon: z.string().trim().max(64).optional(),
    scope: z.enum(BONUS_SCOPES),
    frequency: z.enum(BONUS_FREQUENCIES),
    rateBps: bonusRateBps,
    lockDays: z.coerce.number().int().min(0).max(3650).default(30),
    minUnits: z.coerce.number().int().min(0).default(0),
    permanent: z.boolean().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    enabled: z.boolean().optional(),
  })
  .refine((c) => c.permanent || !c.startAt || !c.endAt || c.endAt >= c.startAt, {
    message: 'The end date must be on or after the start date.',
    path: ['endAt'],
  });

export const updateBonusCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    icon: z.string().trim().max(64).nullable().optional(),
    scope: z.enum(BONUS_SCOPES).optional(),
    frequency: z.enum(BONUS_FREQUENCIES).optional(),
    rateBps: bonusRateBps.optional(),
    lockDays: z.coerce.number().int().min(0).max(3650).optional(),
    minUnits: z.coerce.number().int().min(0).optional(),
    permanent: z.boolean().optional(),
    startAt: z.string().datetime().nullable().optional(),
    endAt: z.string().datetime().nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export const applyBonusSchema = z.object({ depositRequestId: z.string().uuid() });
export const campaignIdParamsSchema = z.object({ id: z.string().uuid() });

// --- Activation bonus ------------------------------------------------------

export const ACTIVATION_REWARD_TYPES = ['PERCENT', 'FIXED'] as const;

export const updateActivationConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    rewardType: z.enum(ACTIVATION_REWARD_TYPES).optional(),
    /** Basis points (PERCENT, 0–100%) or minor units (FIXED). */
    value: z.coerce.number().int().min(0).max(10_000_000).optional(),
    lockDays: z.coerce.number().int().min(0).max(3650).optional(),
  })
  .strict();

export const processActivationSchema = z.object({ memberId: z.string().uuid() });

export type TierInput = z.infer<typeof tierSchema>;
export type CreateTargetInput = z.infer<typeof createTargetSchema>;
