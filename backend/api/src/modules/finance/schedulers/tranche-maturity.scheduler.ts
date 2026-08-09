import type { FinanceActor, TrancheMaturityResult } from '../dto';
import type { FinanceService } from '../services';

/** System actor used by scheduled (non-interactive) maturity runs. */
const SYSTEM_ACTOR: FinanceActor = {
  userId: '00000000-0000-0000-0000-000000000000',
  ipAddress: null,
  userAgent: 'tranche-maturity-scheduler',
  correlationId: null,
};

export interface TrancheMaturityScheduler {
  /** Matures every LOCKED tranche due as of `asOf` (defaults to now). Idempotent. */
  run(asOf?: Date): Promise<TrancheMaturityResult>;
}

/**
 * Scheduled processing hook for deposit-tranche maturity. Invoked by the platform
 * job/scheduler infrastructure; idempotent (each tranche matures at most once, and
 * its bonus credit uses a unique ledger reference). The same logic backs the
 * admin `POST /finance/tranches/mature` on-demand run.
 */
export function createTrancheMaturityScheduler(service: FinanceService): TrancheMaturityScheduler {
  return {
    run(asOf?: Date): Promise<TrancheMaturityResult> {
      return service.matureTranches(SYSTEM_ACTOR, asOf ?? new Date());
    },
  };
}
