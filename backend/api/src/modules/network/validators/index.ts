import { z } from 'zod';

export const INVITE_ROLES = ['PARTNER', 'MEMBER'] as const;
export const INVITE_STATUSES = ['PENDING', 'USED', 'EXPIRED', 'REVOKED'] as const;

/**
 * Create an invite. Assignment is optional per the reference ("optionally assign
 * to a specific Admin/Partner"): a PARTNER invite may carry an `assignedAdminId`,
 * a MEMBER invite an `assignedPartnerId`. Expiry is optional — the reference does
 * not define a default TTL, so an invite without `expiresInDays` never expires.
 */
export const createInviteSchema = z
  .object({
    role: z.enum(INVITE_ROLES),
    assignedAdminId: z.string().uuid().optional(),
    assignedPartnerId: z.string().uuid().optional(),
    expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
  })
  .strict();

export const listInvitesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  role: z.enum(INVITE_ROLES).optional(),
  status: z.enum(INVITE_STATUSES).optional(),
  sortBy: z.enum(['createdAt', 'expiresAt', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const inviteCodeParamsSchema = z.object({ code: z.string().trim().min(1).max(200) });
export const memberIdParamsSchema = z.object({ id: z.string().uuid() });

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type ListInvitesQuery = z.infer<typeof listInvitesQuerySchema>;
