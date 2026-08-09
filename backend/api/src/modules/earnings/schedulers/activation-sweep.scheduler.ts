import type { EarningsActor } from '../dto';
import type { ActivationBonusService } from '../services';

/** System actor used by scheduled (non-interactive) activation sweeps. */
const SYSTEM_ACTOR: EarningsActor = {
  userId: '00000000-0000-0000-0000-000000000000',
  ipAddress: null,
  userAgent: 'activation-sweep-scheduler',
  correlationId: null,
};

export interface ActivationSweepScheduler {
  /**
   * Re-evaluates every recruiter and grants the activation bonus to those who
   * now qualify (ACTIVE recruiter + 2 members within the 24h window). Idempotent
   * — already-granted members are skipped. Catches members who become eligible
   * after their original referral/deposit event.
   */
  run(): Promise<{ granted: number }>;
}

/**
 * Scheduled hook for the activation-bonus qualification sweep. Reuses the
 * existing engine (`processAll`) and rule — it introduces no new activation
 * logic. The same logic backs the admin `POST /activation-bonus/process-all`.
 */
export function createActivationSweepScheduler(
  service: ActivationBonusService,
): ActivationSweepScheduler {
  return {
    run(): Promise<{ granted: number }> {
      return service.processAll(SYSTEM_ACTOR);
    },
  };
}
