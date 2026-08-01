import type { RewardDirection, RewardRuleType, RewardTransactionType } from '../dto';

/**
 * Pure reward-points rules — framework-independent domain logic. The ledger is
 * the source of truth: every transaction type maps deterministically to a
 * signed points delta, so a balance can always be re-derived by folding the
 * ledger.
 *
 *   EARN / positive ADJUSTMENT / positive REVERSAL  → balance up
 *   REDEEM / EXPIRE / negative ADJUSTMENT            → balance down
 */
export function pointsDelta(
  type: RewardTransactionType,
  direction: RewardDirection,
  points: number,
): number {
  switch (type) {
    case 'EARN':
      return points;
    case 'REDEEM':
      return -points;
    case 'EXPIRE':
      return -points;
    case 'ADJUSTMENT':
    case 'REVERSAL':
      return direction === 'CREDIT' ? points : -points;
  }
}

/** The opposite direction — used when reversing a transaction. */
export function oppositeDirection(direction: RewardDirection): RewardDirection {
  return direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';
}

/** Inputs to a rule-driven accrual computation. */
export interface RuleContext {
  type: RewardRuleType;
  /** Flat points for FIXED rules. */
  points: number | null;
  /** Rate in basis points for PERCENTAGE rules (100 = 1%). */
  rateBasisPoints: number | null;
  /** Base value the percentage applies to (e.g. spend in minor units). */
  baseValue?: number | undefined;
}

/**
 * Computes points awarded by a rule. FIXED uses the flat points; PERCENTAGE
 * applies the basis-point rate to a base value; other types require the caller
 * to supply explicit points (returns null when it cannot be computed).
 */
export function computeRulePoints(context: RuleContext): number | null {
  switch (context.type) {
    case 'FIXED':
    case 'MANUAL':
    case 'EVENT':
    case 'TIER':
    case 'PROMOTIONAL':
      return context.points != null && context.points > 0 ? context.points : null;
    case 'PERCENTAGE': {
      if (context.rateBasisPoints == null || context.baseValue == null) {
        return null;
      }
      const computed = Math.floor((context.baseValue * context.rateBasisPoints) / 10_000);
      return computed > 0 ? computed : null;
    }
  }
}
