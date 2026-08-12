import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { members } from './members';
import { rewardTransactions } from './rewards';

/**
 * Partner points-referral earnings (P3). When a referred member earns qualifying
 * reward points (Games or Campaigns only), their **direct active Partner** earns a
 * configurable percentage of those points, credited into the existing rewards
 * ledger — automatically and inside the SAME database transaction that finalizes
 * the member's earning.
 *
 * This table is the durable link between a member's source EARN
 * (`source_transaction_id`) and the partner's referral EARN
 * (`partner_transaction_id`). It provides:
 *   - idempotency  — `UNIQUE(source_transaction_id)`: at most one referral earning
 *     per source transaction (P3.10);
 *   - reversibility — when the source EARN is reversed, this row is located and the
 *     partner's referral points are clawed back atomically in the same transaction,
 *     recording `reversed_at` / `reversal_transaction_id` (P3.11 + B3);
 *   - auditability — it snapshots the `rate_bps` used and the source/partner points
 *     so a referral earning is fully explainable after the fact (P3.9).
 *
 * A row exists ONLY when `partner_points > 0`. A zero result
 * (`floor(source_points * rate_bps / 10000) == 0`) produces no partner reward and
 * no row (P3.15). Points-only: this NEVER touches money/wallet/commission.
 */
export const partnerReferralEarnings = pgTable(
  'partner_referral_earnings',
  {
    ...baseColumns(),
    /** The member's qualifying EARN ledger entry that triggered this referral. */
    sourceTransactionId: uuid('source_transaction_id')
      .notNull()
      .references(() => rewardTransactions.id),
    /** The member who earned the qualifying points. */
    earnerMemberId: uuid('earner_member_id')
      .notNull()
      .references(() => members.id),
    /** The direct active Partner who earned the referral points. */
    partnerMemberId: uuid('partner_member_id')
      .notNull()
      .references(() => members.id),
    /** The partner's referral EARN ledger entry produced by this row. */
    partnerTransactionId: uuid('partner_transaction_id')
      .notNull()
      .references(() => rewardTransactions.id),
    /** The referral rate applied, in basis points, captured at earn time (100 = 1%). */
    rateBps: integer('rate_bps').notNull(),
    /** The member's earned points this referral was computed from. */
    sourcePoints: integer('source_points').notNull(),
    /** The partner's referral points = floor(source_points * rate_bps / 10000), always > 0. */
    partnerPoints: integer('partner_points').notNull(),
    /** Set when the source EARN is reversed and this referral has been clawed back. */
    reversedAt: timestamp('reversed_at', { withTimezone: true }),
    /** The partner's REVERSAL ledger entry produced by the clawback (once reversed). */
    reversalTransactionId: uuid('reversal_transaction_id').references(() => rewardTransactions.id),
  },
  (table) => [
    // Idempotency: at most one referral earning per source transaction.
    uniqueIndex('partner_referral_earnings_source_txn_uq').on(table.sourceTransactionId),
    index('partner_referral_earnings_partner_member_id_idx').on(table.partnerMemberId),
    index('partner_referral_earnings_earner_member_id_idx').on(table.earnerMemberId),
  ],
);
