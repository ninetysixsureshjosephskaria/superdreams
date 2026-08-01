import { ForbiddenError } from '@/errors';

/** The subset of a member needed to check campaign participation ownership. */
export interface CampaignOwnerContext {
  /** The identity user id linked to the member. */
  ownerUserId: string | null;
}

/** True when the acting user owns the member's campaign participation. */
export function isCampaignOwner(actingUserId: string, context: CampaignOwnerContext): boolean {
  return context.ownerUserId !== null && context.ownerUserId === actingUserId;
}

/**
 * Ownership guard for member-portal campaign access. Admin access is enforced by
 * RBAC permissions on the route; this policy enforces "members must only access
 * campaigns intended for them".
 */
export function assertCampaignOwner(actingUserId: string, context: CampaignOwnerContext): void {
  if (!isCampaignOwner(actingUserId, context)) {
    throw new ForbiddenError('You may only access your own campaign participation.');
  }
}
