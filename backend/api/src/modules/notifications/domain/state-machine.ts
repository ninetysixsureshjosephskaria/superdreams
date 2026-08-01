import type { NotificationStatus } from '../dto';

/**
 * Delivery-status state machine (framework-independent). Read/archive are
 * orthogonal inbox flags (readAt/archivedAt) and are not part of this machine.
 *
 *   DRAFT ─▶ QUEUED ─▶ SENDING ─▶ SENT ─▶ DELIVERED
 *              │          │         │
 *              │          └─▶ FAILED ◀┘ ─▶ QUEUED (retry) / CANCELLED
 *              └─▶ CANCELLED
 */
export const NOTIFICATION_TRANSITIONS: Record<NotificationStatus, readonly NotificationStatus[]> = {
  DRAFT: ['QUEUED', 'CANCELLED'],
  QUEUED: ['SENDING', 'CANCELLED'],
  SENDING: ['SENT', 'FAILED'],
  SENT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: ['QUEUED', 'CANCELLED'],
  CANCELLED: [],
};

/** True when `to` is a permitted delivery-status transition from `from`. */
export function canTransition(from: NotificationStatus, to: NotificationStatus): boolean {
  return NOTIFICATION_TRANSITIONS[from].includes(to);
}
