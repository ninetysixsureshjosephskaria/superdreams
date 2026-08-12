import type { Executor } from '@/database/types';

import type { ReferralActor } from '../dto';

/**
 * Narrow ports the Partner Referral service depends on, satisfied in composition
 * by the Rewards and RBAC/Settings modules. Keeping them as interfaces avoids a
 * partner-referral→rewards/rbac runtime coupling and lets tests stub each concern.
 */

/**
 * Credits a member's reward points **within the caller's transaction**, satisfied
 * by the Rewards module's `awardPointsWithin(tx,…)` seam. This is how the partner's
 * referral points land in the existing rewards ledger (P3.5) atomically with the
 * member's own earning. Points-only — it never touches money/wallet.
 */
export interface RewardCreditPort {
  awardPointsWithin(
    tx: Executor,
    memberId: string,
    points: number,
    options: { reference: string; description: string; actor: ReferralActor },
  ): Promise<{ transactionId: string; balanceAfter: number }>;
}

/**
 * Reverses a member's reward transaction **within the caller's transaction**,
 * satisfied by the Rewards module's `reverseWithin(tx,…)` seam. Used to claw back a
 * partner referral EARN inside the source-reversal transaction (P3.11). It throws
 * `BusinessRuleError` when the partner has insufficient points — which MUST roll
 * back the whole source reversal (B3: no negative balances, no debt).
 */
export interface RewardReversePort {
  reverseWithin(
    tx: Executor,
    memberId: string,
    transactionId: string,
    actor: ReferralActor,
  ): Promise<{ transactionId: string; balanceAfter: number }>;
}

/** Reports whether a user holds the `partner` RBAC role (active-Partner gate). */
export interface PartnerRoleCheckerPort {
  isPartner(userId: string): Promise<boolean>;
}

/**
 * Supplies the configurable partner-referral rate in basis points (100 = 1%),
 * satisfied in composition by the Settings module (default 500 = 5% when unset).
 * A rate of 0 naturally disables referral earning via zero-suppression.
 */
export interface ReferralRateProviderPort {
  getRateBps(): Promise<number>;
}
