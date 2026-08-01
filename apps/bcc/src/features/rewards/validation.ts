import { z } from 'zod';

const positivePoints = z
  .number({ invalid_type_error: 'Enter a whole number of points.' })
  .int('Points must be a whole number.')
  .positive('Points must be greater than zero.');

/** Create / edit reward program form. */
export const programFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'At least 2 characters.')
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, dashes or underscores only.'),
  name: z.string().trim().min(1, 'Required.').max(150),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(['FIXED', 'PERCENTAGE', 'TIER', 'EVENT', 'MANUAL', 'PROMOTIONAL']),
  categoryCode: z.enum(['GENERAL', 'PROMOTIONAL', 'SEASONAL', 'LOYALTY']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
});
export type ProgramFormValues = z.infer<typeof programFormSchema>;

/** Earn / allocate points form. */
export const allocateFormSchema = z.object({
  points: positivePoints,
  description: z.string().trim().max(500).optional(),
});
export type AllocateFormValues = z.infer<typeof allocateFormSchema>;

/** Redeem points form. */
export const redeemFormSchema = z.object({
  points: positivePoints,
  note: z.string().trim().max(500).optional(),
});
export type RedeemFormValues = z.infer<typeof redeemFormSchema>;

/** Manual adjustment form. */
export const rewardAdjustFormSchema = z.object({
  direction: z.enum(['CREDIT', 'DEBIT']),
  points: positivePoints,
  reason: z.string().trim().min(1, 'A reason is required.').max(500),
});
export type RewardAdjustFormValues = z.infer<typeof rewardAdjustFormSchema>;
