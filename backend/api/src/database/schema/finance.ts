import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { depositTrancheStatus, financialRequestStatus, financialRequestType } from './enums';
import { members } from './members';
import { wallets } from './wallet';

/**
 * Phase 2B — the real-money (FINANCIAL wallet) request & tranche tables. Money
 * is stored as integer USD **minor units** (cents) using `bigint`, never
 * floating point (see docs/dna/05-database.md, "Monetary Values"), matching the
 * wallet ledger. The unit economy (1 unit = $30) is captured by mirroring the
 * whole-unit count alongside the canonical cents amount; see modules/wallet/units.ts.
 */

/**
 * Member-initiated deposit / withdrawal request. This is the *intent* record and
 * the admin action-queue row; it never moves money on its own. Money moves only
 * when an approver transitions the request to APPROVED, at which point the
 * wallet ledger is credited/debited and (for deposits) a {@link depositTranches}
 * row is created — all inside a single database transaction (rule 14).
 *
 * PENDING/HOLD are actionable; APPROVED/REJECTED are terminal ("locked once
 * submitted" per the reference — a decided request cannot be re-decided).
 */
export const financialRequests = pgTable(
  'financial_requests',
  {
    ...baseColumns(),
    requestNumber: text('request_number').notNull(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    /** The FINANCIAL wallet the request settles against; set on approval for deposits. */
    walletId: uuid('wallet_id').references(() => wallets.id),
    type: financialRequestType('type').notNull(),
    status: financialRequestStatus('status').notNull().default('PENDING'),
    /** Canonical amount in USD minor units (cents). `units * 3000`. */
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    /** Whole-unit mirror of the amount (unit economy convenience). */
    units: integer('units').notNull(),
    currencyCode: text('currency_code').notNull().default('USD'),
    /** Withdrawals only: request an early (pre-maturity) unlock. */
    early: boolean('early').notNull().default(false),
    /** Member-supplied note on submission, or the approver's decision/rejection reason. */
    reason: text('reason'),
    decidedBy: uuid('decided_by'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('financial_requests_request_number_uq').on(table.requestNumber),
    index('financial_requests_member_id_idx').on(table.memberId),
    index('financial_requests_status_idx').on(table.status),
    index('financial_requests_type_status_idx').on(table.type, table.status),
  ],
);

/**
 * A locked tranche of deposited capital. Created when a DEPOSIT request is
 * approved. The principal is locked until `maturesAt` (default 30-day lock per
 * the reference); daily profit and the maturity/early-unlock lifecycle are added
 * in later Phase 2 subsections. `bonusCents` (activation / deposit bonus) is
 * reference-defined but computed in 2E, so it defaults to 0 here.
 */
export const depositTranches = pgTable(
  'deposit_tranches',
  {
    ...baseColumns(),
    trancheNumber: text('tranche_number').notNull(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    depositRequestId: uuid('deposit_request_id').references(() => financialRequests.id),
    /** Locked principal in USD minor units (cents). */
    principalCents: bigint('principal_cents', { mode: 'number' }).notNull(),
    /** Bonus rate in basis points (100 bps = 1%); populated by 2E, 0 until then. */
    bonusBps: integer('bonus_bps').notNull().default(0),
    bonusCents: bigint('bonus_cents', { mode: 'number' }).notNull().default(0),
    currencyCode: text('currency_code').notNull().default('USD'),
    lockDays: integer('lock_days').notNull().default(30),
    maturesAt: timestamp('matures_at', { withTimezone: true }).notNull(),
    status: depositTrancheStatus('status').notNull().default('LOCKED'),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }),
    /** Early-unlock fee actually charged (Phase 2E); 0 unless LIQUIDATED early. */
    feeCents: bigint('fee_cents', { mode: 'number' }).notNull().default(0),
  },
  (table) => [
    uniqueIndex('deposit_tranches_tranche_number_uq').on(table.trancheNumber),
    index('deposit_tranches_member_id_idx').on(table.memberId),
    index('deposit_tranches_wallet_id_idx').on(table.walletId),
    index('deposit_tranches_status_idx').on(table.status),
    index('deposit_tranches_matures_at_idx').on(table.maturesAt),
  ],
);

/**
 * Phase 2C — system-wide deposit / withdrawal policy (the `limits.html` screen).
 * A **singleton** row (guarded by the unique `singleton` marker) holding the
 * reference-defined defaults: min/max deposit units, min withdrawal (USD cents),
 * early-withdraw allowance + fee, and the withdrawal processing-time SLA. This is
 * distinct from the per-wallet `wallet_limits` table (Q7 — keep both): those are
 * per-account balance rules; this is system-wide request policy.
 */
export const financialLimits = pgTable(
  'financial_limits',
  {
    ...baseColumns(),
    /** Always `true`; the unique index makes this table hold at most one row. */
    singleton: boolean('singleton').notNull().default(true),
    /** Reference default: minDep = 1 unit. */
    minDepositUnits: integer('min_deposit_units').notNull().default(1),
    /** Reference default: maxDep = 10000 units. */
    maxDepositUnits: integer('max_deposit_units').notNull().default(10_000),
    /** Reference default: minWd = $30 = 3000 cents. */
    minWithdrawCents: bigint('min_withdraw_cents', { mode: 'number' }).notNull().default(3000),
    /** Reference default: early withdrawal allowed. */
    earlyWithdrawAllowed: boolean('early_withdraw_allowed').notNull().default(true),
    /**
     * Early-withdraw processing fee in basis points. Reference default 1000 (10%,
     * per limits.html). NOTE: users.html states a 5% early-unlock fee — a reference
     * conflict, flagged unresolved; the admin-editable limits policy is authoritative.
     */
    earlyWithdrawFeeBps: integer('early_withdraw_fee_bps').notNull().default(1000),
    /** Reference default: processing time 3–4 days. */
    processingMinDays: integer('processing_min_days').notNull().default(3),
    processingMaxDays: integer('processing_max_days').notNull().default(4),
  },
  (table) => [uniqueIndex('financial_limits_singleton_uq').on(table.singleton)],
);
