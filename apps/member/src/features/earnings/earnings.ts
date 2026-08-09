import type { WalletTransactionData } from '@superdreams/api-client';

/**
 * Member earnings are NOT a separate backend resource — the Phase 2E earnings
 * engines (commission, referral, daily profit, bonus, activation) have no
 * member-facing API. Their only member-visible effect is a CREDIT in the member's
 * FINANCIAL wallet ledger, tagged with a deterministic backend `reference`:
 *
 *   TXN-C-<depositId>          commission        (commission.service.ts)
 *   TXN-R-<memberId>           referral bonus    (commission.service.ts)
 *   TXN-P-<day>-<memberId>     daily profit      (profit.service.ts)
 *   TXN-B-<trancheNumber>      campaign bonus    (finance.service.ts, at maturity)
 *   TXN-A-<memberId>           activation bonus  (activation.service.ts)
 *
 * This module maps those backend references to display categories. It performs NO
 * earning calculation — amounts come straight from the authoritative ledger.
 * Deposit credits (`DEP-…`) and the early-unlock fee (`TXN-F-…`, a debit) are not
 * earnings and are excluded.
 */

export type EarningCategory = 'COMMISSION' | 'REFERRAL' | 'PROFIT' | 'BONUS' | 'ACTIVATION';

const PREFIX_TO_CATEGORY: ReadonlyArray<readonly [string, EarningCategory]> = [
  ['TXN-C-', 'COMMISSION'],
  ['TXN-R-', 'REFERRAL'],
  ['TXN-P-', 'PROFIT'],
  ['TXN-B-', 'BONUS'],
  ['TXN-A-', 'ACTIVATION'],
];

export const EARNING_CATEGORY_LABEL: Record<EarningCategory, string> = {
  COMMISSION: 'Commission',
  REFERRAL: 'Referral',
  PROFIT: 'Daily profit',
  BONUS: 'Bonus',
  ACTIVATION: 'Activation bonus',
};

/** The category for a ledger reference, or null if the reference is not an earning. */
export function categoryForReference(reference: string): EarningCategory | null {
  for (const [prefix, category] of PREFIX_TO_CATEGORY) {
    if (reference.startsWith(prefix)) {
      return category;
    }
  }
  return null;
}

export interface EarningEntry {
  transaction: WalletTransactionData;
  category: EarningCategory;
}

/** Filters a ledger page to earning credits, tagged with their category. */
export function toEarnings(transactions: WalletTransactionData[]): EarningEntry[] {
  const earnings: EarningEntry[] = [];
  for (const transaction of transactions) {
    if (transaction.direction !== 'CREDIT') {
      continue;
    }
    const category = categoryForReference(transaction.reference);
    if (category) {
      earnings.push({ transaction, category });
    }
  }
  return earnings;
}

/** Sums earning amounts (integer cents) per category, plus a grand total. */
export function summariseEarnings(earnings: EarningEntry[]): {
  total: number;
  byCategory: Record<EarningCategory, number>;
} {
  const byCategory: Record<EarningCategory, number> = {
    COMMISSION: 0,
    REFERRAL: 0,
    PROFIT: 0,
    BONUS: 0,
    ACTIVATION: 0,
  };
  let total = 0;
  for (const { transaction, category } of earnings) {
    byCategory[category] += transaction.amountMinor;
    total += transaction.amountMinor;
  }
  return { total, byCategory };
}
