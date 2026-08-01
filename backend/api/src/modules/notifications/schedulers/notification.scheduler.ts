import type { NotificationActor, QueueRunResult } from '../dto';
import type { NotificationService } from '../services';

/** System actor used by scheduled (non-interactive) queue runs. */
const SYSTEM_ACTOR: NotificationActor = {
  userId: '00000000-0000-0000-0000-000000000000',
  ipAddress: null,
  userAgent: 'notification-scheduler',
  correlationId: null,
};

export interface NotificationScheduler {
  /** Processes all due queue items as of `asOf` (defaults to now). Idempotent. */
  run(asOf?: Date, limit?: number): Promise<QueueRunResult>;
}

/**
 * Scheduled processing hook for the delivery queue. Designed to be invoked by
 * the platform job/scheduler infrastructure; the same idempotent processing
 * backs `POST /notifications/process` for on-demand admin runs.
 */
export function createNotificationScheduler(service: NotificationService): NotificationScheduler {
  return {
    run(asOf?: Date, limit?: number): Promise<QueueRunResult> {
      return service.processQueue(
        { ...(asOf ? { asOf: asOf.toISOString() } : {}), ...(limit ? { limit } : {}) },
        SYSTEM_ACTOR,
      );
    },
  };
}
