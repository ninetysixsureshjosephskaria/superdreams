import { ForbiddenError } from '@/errors';

/** The subset of a notification needed to check inbox ownership. */
export interface NotificationOwnerContext {
  recipientUserId: string | null;
}

/** True when the acting user owns the notification (its recipient). */
export function isNotificationOwner(
  actingUserId: string,
  context: NotificationOwnerContext,
): boolean {
  return context.recipientUserId !== null && context.recipientUserId === actingUserId;
}

/**
 * Ownership guard for member-inbox access. Admin access is enforced by RBAC
 * permissions on the route; this policy enforces "a member may only act on their
 * own notifications".
 */
export function assertNotificationOwner(
  actingUserId: string,
  context: NotificationOwnerContext,
): void {
  if (!isNotificationOwner(actingUserId, context)) {
    throw new ForbiddenError('You may only access your own notifications.');
  }
}
