import { ForbiddenError } from '@/errors';

/** The subset of a member needed to check reward ownership. */
export interface RewardOwnerContext {
  /** The identity user id linked to the member that owns the rewards. */
  ownerUserId: string | null;
}

/** True when the acting user owns the member's rewards (via the linked account). */
export function isRewardOwner(actingUserId: string, context: RewardOwnerContext): boolean {
  return context.ownerUserId !== null && context.ownerUserId === actingUserId;
}

/**
 * Ownership guard for member-portal (self-service) reward access. Admin access
 * is enforced by RBAC permissions on the route; this policy enforces
 * "no member may access another member's rewards".
 */
export function assertRewardOwner(actingUserId: string, context: RewardOwnerContext): void {
  if (!isRewardOwner(actingUserId, context)) {
    throw new ForbiddenError('You may only access your own rewards.');
  }
}
