import type { ExpiryRunResult, RewardActor } from '../dto';
import type { RewardService } from '../services';

/** System actor used by scheduled (non-interactive) expiry runs. */
const SYSTEM_ACTOR: RewardActor = {
  userId: '00000000-0000-0000-0000-000000000000',
  ipAddress: null,
  userAgent: 'reward-expiry-scheduler',
  correlationId: null,
};

export interface RewardExpiryScheduler {
  /** Runs point expiry as of `asOf` (defaults to now). Idempotent per lot. */
  run(asOf?: Date): Promise<ExpiryRunResult>;
}

/**
 * Scheduled processing hook for reward point expiry. Designed to be invoked by
 * the platform job/scheduler infrastructure (idempotent: each EARN lot is
 * processed at most once). The same logic is exposed via `POST /rewards/expire`
 * for on-demand admin runs.
 */
export function createRewardExpiryScheduler(service: RewardService): RewardExpiryScheduler {
  return {
    run(asOf?: Date): Promise<ExpiryRunResult> {
      return service.processExpirations(asOf ? { asOf: asOf.toISOString() } : {}, SYSTEM_ACTOR);
    },
  };
}
