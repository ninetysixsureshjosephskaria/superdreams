import type { TransactionDirection, TransactionType } from '../dto';

/** A signed change to a wallet's available and held balances (minor units). */
export interface BalanceDelta {
  availableMinor: number;
  heldMinor: number;
}

/** Available + held snapshot (minor units). */
export interface BalanceSnapshot {
  availableMinor: number;
  heldMinor: number;
}

/**
 * Pure balance rules — framework-independent domain logic. The ledger is the
 * source of truth: every transaction type maps deterministically to a signed
 * delta, so a balance can always be re-derived by folding the ledger.
 *
 *   CREDIT / RELEASE / positive ADJUSTMENT  → available up
 *   DEBIT  / HOLD    / negative ADJUSTMENT   → available down
 *   HOLD    moves available → held; RELEASE moves held → available (total fixed)
 */
export function deltasFor(
  type: TransactionType,
  direction: TransactionDirection,
  amountMinor: number,
): BalanceDelta {
  switch (type) {
    case 'CREDIT':
      return { availableMinor: amountMinor, heldMinor: 0 };
    case 'DEBIT':
      return { availableMinor: -amountMinor, heldMinor: 0 };
    case 'ADJUSTMENT':
      return direction === 'CREDIT'
        ? { availableMinor: amountMinor, heldMinor: 0 }
        : { availableMinor: -amountMinor, heldMinor: 0 };
    case 'HOLD':
      return { availableMinor: -amountMinor, heldMinor: amountMinor };
    case 'RELEASE':
      return { availableMinor: amountMinor, heldMinor: -amountMinor };
    case 'REVERSAL':
      // A reversal's amount already carries the correcting direction.
      return direction === 'CREDIT'
        ? { availableMinor: amountMinor, heldMinor: 0 }
        : { availableMinor: -amountMinor, heldMinor: 0 };
  }
}

/** Applies a delta to a snapshot, returning the new snapshot. */
export function applyDelta(current: BalanceSnapshot, delta: BalanceDelta): BalanceSnapshot {
  return {
    availableMinor: current.availableMinor + delta.availableMinor,
    heldMinor: current.heldMinor + delta.heldMinor,
  };
}

/** Total balance = available + held. */
export function totalMinor(snapshot: BalanceSnapshot): number {
  return snapshot.availableMinor + snapshot.heldMinor;
}

/** The opposite direction — used when reversing a transaction. */
export function oppositeDirection(direction: TransactionDirection): TransactionDirection {
  return direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';
}
