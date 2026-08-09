import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { commissionEarningType } from './enums';
import { financialRequests } from './finance';
import { members } from './members';

/**
 * Phase 2E — partner commission on member deposits (the `commission.html` screen).
 * Rates are stored in basis points (100 bps = 1%). Reference-defined defaults:
 * tiers 0–300u = 5%, 301–500u = 6%, 501+u = 7%; referral rate 2%.
 */

/** Singleton commission config (currently the "always on" member-referral rate). */
export const commissionConfig = pgTable(
  'commission_config',
  {
    ...baseColumns(),
    singleton: text('singleton').notNull().default('SINGLETON'),
    /** One-time member-referral rate (TXN-R). Reference default 200 bps (2%). */
    referralRateBps: integer('referral_rate_bps').notNull().default(200),
  },
  (table) => [uniqueIndex('commission_config_singleton_uq').on(table.singleton)],
);

/**
 * A date-ranged commission "target" that overrides the default tier table while
 * active. Its tiers live in {@link commissionTiers} with `targetId` set.
 */
export const commissionTargets = pgTable(
  'commission_targets',
  {
    ...baseColumns(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
  },
  (table) => [index('commission_targets_start_idx').on(table.startDate)],
);

/**
 * A commission tier matched by a partner's total network units. `targetId` NULL =
 * a default ("fallback") tier; otherwise the tier belongs to a target. `toUnits`
 * NULL = "no upper limit".
 */
export const commissionTiers = pgTable(
  'commission_tiers',
  {
    ...baseColumns(),
    targetId: uuid('target_id').references(() => commissionTargets.id),
    fromUnits: integer('from_units').notNull(),
    toUnits: integer('to_units'),
    rateBps: integer('rate_bps').notNull(),
  },
  (table) => [index('commission_tiers_target_idx').on(table.targetId)],
);

/**
 * Append-only ledger of paid commission / referral earnings. `dedupeKey` is
 * unique — `C:<depositRequestId>` for a deposit commission (one per deposit),
 * `R:<referredMemberId>` for the one-time member referral — which makes earning
 * processing **idempotent** and prevents double-crediting at the database level.
 */
export const commissionEarnings = pgTable(
  'commission_earnings',
  {
    ...baseColumns(),
    dedupeKey: text('dedupe_key').notNull(),
    type: commissionEarningType('type').notNull(),
    depositRequestId: uuid('deposit_request_id').references(() => financialRequests.id),
    beneficiaryMemberId: uuid('beneficiary_member_id')
      .notNull()
      .references(() => members.id),
    sourceMemberId: uuid('source_member_id')
      .notNull()
      .references(() => members.id),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    rateBps: integer('rate_bps').notNull(),
    networkUnits: integer('network_units'),
    transactionId: uuid('transaction_id'),
    creditedAt: timestamp('credited_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('commission_earnings_dedupe_key_uq').on(table.dedupeKey),
    index('commission_earnings_beneficiary_idx').on(table.beneficiaryMemberId),
    index('commission_earnings_source_idx').on(table.sourceMemberId),
    index('commission_earnings_type_idx').on(table.type),
  ],
);
