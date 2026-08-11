import { z } from 'zod';

export const PARTNER_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

/** Member self-submit body: an optional free-text note. No member id — the member is derived from the token. */
export const submitPartnerRequestSchema = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .strict();

/** Admin rejection body: an optional decision reason. */
export const rejectPartnerRequestSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

/** Admin list query (filter by status). */
export const listPartnerRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(PARTNER_REQUEST_STATUSES).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const partnerRequestIdParamsSchema = z.object({ id: z.string().uuid() });

export type SubmitPartnerRequestInput = z.infer<typeof submitPartnerRequestSchema>;
export type RejectPartnerRequestInput = z.infer<typeof rejectPartnerRequestSchema>;
export type ListPartnerRequestsQuery = z.infer<typeof listPartnerRequestsQuerySchema>;
