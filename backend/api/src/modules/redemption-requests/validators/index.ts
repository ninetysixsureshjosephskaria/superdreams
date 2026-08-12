import { z } from 'zod';

import { pointsSchema } from '@/modules/rewards/validators';

export const REDEMPTION_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

/**
 * Member self-submit body: the points to redeem (reuses the existing rewards
 * `pointsSchema` — a positive integer, so effectively `>= 1`) and an optional
 * note. No member id — the member is derived from the authenticated token.
 */
export const submitRedemptionRequestSchema = z
  .object({
    pointsRequested: pointsSchema,
    note: z.string().trim().max(500).optional(),
  })
  .strict();

/** Admin rejection body: an optional decision reason. */
export const rejectRedemptionRequestSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

/** Admin list query (filter by status). */
export const listRedemptionRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(REDEMPTION_REQUEST_STATUSES).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const redemptionRequestIdParamsSchema = z.object({ id: z.string().uuid() });

export type SubmitRedemptionRequestInput = z.infer<typeof submitRedemptionRequestSchema>;
export type RejectRedemptionRequestInput = z.infer<typeof rejectRedemptionRequestSchema>;
export type ListRedemptionRequestsQuery = z.infer<typeof listRedemptionRequestsQuerySchema>;
