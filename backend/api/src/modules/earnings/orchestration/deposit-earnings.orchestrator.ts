import type { FinanceEvent } from '@/modules/finance';

import type { EarningsActor } from '../dto';
import type { ActivationBonusService, BonusService, CommissionService } from '../services';

/** The three post-approval earnings stages, in the order they run. */
export type EarningsStage = 'commission' | 'bonus' | 'activation';

/**
 * Reports a downstream earnings failure. Runs when one stage throws; the other
 * stages still run. Never called silently — the composition root wires this to
 * the application logger so a partial earnings run is always observable.
 */
export type EarningsErrorReporter = (failure: {
  stage: EarningsStage;
  event: Extract<FinanceEvent, { type: 'DepositApproved' }>;
  error: unknown;
}) => void;

export interface DepositEarningsHandlerDeps {
  commission: CommissionService;
  bonus: BonusService;
  activation: ActivationBonusService;
  reportError: EarningsErrorReporter;
}

/** System-actor fallback (matches the scheduler) when an event carries no actor. */
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Builds the `DepositApproved` → earnings orchestration handler for the finance
 * event bus (in-process; no second bus, no HTTP). On a **committed** deposit
 * approval it drives, in order:
 *
 *   1. commission + one-time referral  (`processDepositEarnings`)
 *   2. eligible bonus-campaign application to the tranche (`applyForDeposit`)
 *   3. activation-bonus qualification evaluation (`processMember`)
 *
 * Design guarantees:
 * - **Atomicity preserved.** The approval transaction has already committed
 *   before this runs (finance publishes post-commit), so earnings are pure
 *   side effects — they never widen or roll back the approval.
 * - **Idempotent + repeat-safe.** Every stage is idempotent in its own right
 *   (dedupe keys + unique ledger references), so a duplicate `DepositApproved`
 *   or a re-drive credits nothing twice.
 * - **No silent partial state.** Each stage runs in its own transaction (no
 *   half-credit). A stage that throws is reported (never swallowed) and does not
 *   prevent the remaining stages from running; the failed stage stays safely
 *   re-drivable via its idempotent engine (manual endpoint or a future retry).
 * - **No duplicated business logic.** It only invokes the existing engines.
 */
export function createDepositEarningsHandler(
  deps: DepositEarningsHandlerDeps,
): (event: FinanceEvent) => Promise<void> {
  return async (event: FinanceEvent): Promise<void> => {
    if (event.type !== 'DepositApproved') {
      return;
    }
    const actor: EarningsActor = {
      userId: event.actorId ?? SYSTEM_ACTOR_ID,
      ipAddress: null,
      userAgent: 'deposit-earnings-orchestrator',
      correlationId: null,
    };

    try {
      await deps.commission.processDepositEarnings({ depositRequestId: event.requestId }, actor);
    } catch (error) {
      deps.reportError({ stage: 'commission', event, error });
    }

    try {
      await deps.bonus.applyForDeposit({ depositRequestId: event.requestId }, actor);
    } catch (error) {
      deps.reportError({ stage: 'bonus', event, error });
    }

    try {
      await deps.activation.processMember({ memberId: event.memberId }, actor);
    } catch (error) {
      deps.reportError({ stage: 'activation', event, error });
    }
  };
}
