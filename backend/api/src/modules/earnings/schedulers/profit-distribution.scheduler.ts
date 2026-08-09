import type { EarningsActor, ProfitDistributionResult } from '../dto';
import type { ProfitService } from '../services';

/** System actor used by scheduled (non-interactive) profit distribution runs. */
const SYSTEM_ACTOR: EarningsActor = {
  userId: '00000000-0000-0000-0000-000000000000',
  ipAddress: null,
  userAgent: 'profit-distribution-scheduler',
  correlationId: null,
};

export interface ProfitDistributionScheduler {
  /** Distributes daily profit for `day` (YYYY-MM-DD, defaults to today) using the
   *  published schedule's rates. Idempotent per day. */
  run(day?: string): Promise<ProfitDistributionResult>;
}

/**
 * Scheduled hook for daily-profit distribution. Invoked by the platform
 * job/scheduler infrastructure (same pattern as reward expiry / tranche
 * maturity — no second scheduler). Also backs the admin `POST /profit/distribute`.
 */
export function createProfitDistributionScheduler(
  service: ProfitService,
): ProfitDistributionScheduler {
  return {
    run(day?: string): Promise<ProfitDistributionResult> {
      const target = day ?? new Date().toISOString().slice(0, 10);
      return service.distributeForDay({ day: target }, SYSTEM_ACTOR);
    },
  };
}
