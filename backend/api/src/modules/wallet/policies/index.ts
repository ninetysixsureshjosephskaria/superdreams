import { ForbiddenError } from '@/errors';

/** The subset of a member needed to check wallet ownership. */
export interface WalletOwnerContext {
  /** The identity user id linked to the member that owns the wallet. */
  ownerUserId: string | null;
}

/** True when the acting user owns the wallet (via the linked member account). */
export function isWalletOwner(actingUserId: string, context: WalletOwnerContext): boolean {
  return context.ownerUserId !== null && context.ownerUserId === actingUserId;
}

/**
 * Ownership guard for member-portal (self-service) wallet access. Admin access
 * is enforced separately by RBAC permissions on the route; this policy enforces
 * "members may only access their own wallet".
 */
export function assertWalletOwner(actingUserId: string, context: WalletOwnerContext): void {
  if (!isWalletOwner(actingUserId, context)) {
    throw new ForbiddenError('You may only access your own wallet.');
  }
}
