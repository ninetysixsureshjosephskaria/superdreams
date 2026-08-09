import { z } from 'zod';

/** Financial request types / statuses (mirror the DB enums). */
export const FINANCIAL_REQUEST_TYPES = ['DEPOSIT', 'WITHDRAW'] as const;
export const FINANCIAL_REQUEST_STATUSES = ['PENDING', 'HOLD', 'APPROVED', 'REJECTED'] as const;

/**
 * A whole number of units. The unit economy is 1 unit = $30 (reference-defined),
 * so a positive-integer unit count also enforces the reference minimums
 * (min deposit / min withdrawal = 1 unit = $30). Capped to keep `units * 3000`
 * inside the JS safe-integer range.
 */
export const unitsSchema = z.coerce
  .number()
  .int('Units must be a whole number.')
  .positive('Units must be greater than zero.')
  .max(1_000_000, 'Units exceed the maximum per request.');

const reasonSchema = z.string().trim().max(500);

export const createDepositSchema = z.object({
  units: unitsSchema,
  reason: reasonSchema.optional(),
});

export const createWithdrawalSchema = z.object({
  units: unitsSchema,
  /** Request an early (pre-maturity) withdrawal. Fee handling arrives in a later 2 subsection. */
  early: z.boolean().optional(),
  reason: reasonSchema.optional(),
});

/** Approve / hold carry an optional note; reject requires a reason. */
export const decisionSchema = z.object({
  reason: reasonSchema.optional(),
});

export const rejectSchema = z.object({
  reason: reasonSchema.min(1, 'A reason is required to reject a request.'),
});

export const listRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  type: z.enum(FINANCIAL_REQUEST_TYPES).optional(),
  status: z.enum(FINANCIAL_REQUEST_STATUSES).optional(),
  memberId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'amountCents']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const requestIdParamsSchema = z.object({ id: z.string().uuid() });

/**
 * Update the system-wide limits policy. All fields optional (partial update);
 * cross-field rules (max ≥ min) are enforced in the service against the merged
 * row so a partial update can't produce an inconsistent policy.
 */
export const updateLimitsSchema = z
  .object({
    minDepositUnits: z.coerce.number().int().min(1).optional(),
    maxDepositUnits: z.coerce.number().int().min(1).optional(),
    minWithdrawCents: z.coerce.number().int().min(0).optional(),
    earlyWithdrawAllowed: z.boolean().optional(),
    earlyWithdrawFeeBps: z.coerce
      .number()
      .int()
      .min(0, 'Enter a processing fee between 0 and 100%.')
      .max(10_000, 'Enter a processing fee between 0 and 100%.')
      .optional(),
    processingMinDays: z.coerce.number().int().min(0).optional(),
    processingMaxDays: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type CreateDepositInput = z.infer<typeof createDepositSchema>;
export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
export type UpdateLimitsInput = z.infer<typeof updateLimitsSchema>;
