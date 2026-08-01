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
import {
  walletHoldStatus,
  walletStatus,
  walletTransactionDirection,
  walletTransactionStatus,
  walletTransactionType,
} from './enums';
import { members } from './members';

/**
 * Monetary amounts are stored as **integer minor units** (e.g. cents) using
 * `bigint`, never floating point — see docs/dna/05-database.md ("Monetary
 * Values"). `mode: 'number'` returns a JS number; cents stay well within the
 * safe-integer range. Every money-bearing table also records `currency_code`.
 */

/**
 * Wallet aggregate root. One wallet per member (this phase). Links to a member
 * but never duplicates member information. The current balance lives in the
 * 1:1 {@link walletBalances} projection; the authoritative history is the
 * append-only {@link walletTransactions} ledger.
 */
export const wallets = pgTable(
  'wallets',
  {
    ...baseColumns(),
    walletNumber: text('wallet_number').notNull(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    currencyCode: text('currency_code').notNull(),
    status: walletStatus('status').notNull().default('PENDING'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('wallets_wallet_number_uq').on(table.walletNumber),
    uniqueIndex('wallets_member_id_uq').on(table.memberId),
    index('wallets_status_idx').on(table.status),
  ],
);

/**
 * 1:1 balance projection. Kept consistent with the ledger inside the same
 * database transaction as each balance-changing operation, using row-level
 * locking to prevent races. `version` (from baseColumns) supports optimistic
 * concurrency; a validation routine recomputes these from the ledger.
 *
 *   total = available + held
 */
export const walletBalances = pgTable(
  'wallet_balances',
  {
    ...baseColumns(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    currencyCode: text('currency_code').notNull(),
    availableMinor: bigint('available_minor', { mode: 'number' }).notNull().default(0),
    heldMinor: bigint('held_minor', { mode: 'number' }).notNull().default(0),
    totalMinor: bigint('total_minor', { mode: 'number' }).notNull().default(0),
  },
  (table) => [uniqueIndex('wallet_balances_wallet_id_uq').on(table.walletId)],
);

/**
 * Reference lookup describing each transaction type (label, normal direction,
 * whether it moves held funds). Seeded by the module's migration. Provides
 * human-readable metadata for statements and UI; the `wallet_transaction_type`
 * enum enforces validity on the ledger itself.
 */
export const walletTransactionTypes = pgTable(
  'wallet_transaction_types',
  {
    ...baseColumns(),
    code: walletTransactionType('code').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    normalDirection: walletTransactionDirection('normal_direction').notNull(),
    affectsHeld: boolean('affects_held').notNull().default(false),
  },
  (table) => [uniqueIndex('wallet_transaction_types_code_uq').on(table.code)],
);

/**
 * Append-only ledger. Rows are never deleted and their financial fields
 * (type, direction, amount) are never rewritten. Each row snapshots the
 * available/held balance immediately after it was applied, enabling a strict
 * integrity check (fold the ledger, compare to each snapshot and the
 * projection). Reversals append a compensating REVERSAL row linked via
 * `reversal_of_id`; the original's `status` may flip to REVERSED for
 * traceability but its amounts remain immutable.
 */
export const walletTransactions = pgTable(
  'wallet_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    reference: text('reference').notNull(),
    type: walletTransactionType('type').notNull(),
    direction: walletTransactionDirection('direction').notNull(),
    status: walletTransactionStatus('status').notNull().default('POSTED'),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currencyCode: text('currency_code').notNull(),
    availableAfterMinor: bigint('available_after_minor', { mode: 'number' }).notNull(),
    heldAfterMinor: bigint('held_after_minor', { mode: 'number' }).notNull(),
    description: text('description'),
    holdId: uuid('hold_id'),
    reversalOfId: uuid('reversal_of_id'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('wallet_transactions_reference_uq').on(table.reference),
    index('wallet_transactions_wallet_id_idx').on(table.walletId),
    index('wallet_transactions_wallet_created_idx').on(table.walletId, table.createdAt),
    index('wallet_transactions_type_idx').on(table.type),
    index('wallet_transactions_status_idx').on(table.status),
  ],
);

/** Manual admin adjustment; links to the ledger entry it produced. */
export const walletAdjustments = pgTable(
  'wallet_adjustments',
  {
    ...baseColumns(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => walletTransactions.id),
    direction: walletTransactionDirection('direction').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currencyCode: text('currency_code').notNull(),
    reason: text('reason').notNull(),
    approvedBy: uuid('approved_by'),
  },
  (table) => [index('wallet_adjustments_wallet_id_idx').on(table.walletId)],
);

/** A hold moves funds from available to held without changing the total. */
export const walletHolds = pgTable(
  'wallet_holds',
  {
    ...baseColumns(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    reference: text('reference').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currencyCode: text('currency_code').notNull(),
    status: walletHoldStatus('status').notNull().default('ACTIVE'),
    reason: text('reason'),
    placedBy: uuid('placed_by'),
    placeTransactionId: uuid('place_transaction_id'),
    releasedBy: uuid('released_by'),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    releaseTransactionId: uuid('release_transaction_id'),
  },
  (table) => [
    uniqueIndex('wallet_holds_reference_uq').on(table.reference),
    index('wallet_holds_wallet_id_idx').on(table.walletId),
    index('wallet_holds_status_idx').on(table.status),
  ],
);

/** Generated statement summarising a wallet over a period. */
export const walletStatements = pgTable(
  'wallet_statements',
  {
    ...baseColumns(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    reference: text('reference').notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    currencyCode: text('currency_code').notNull(),
    openingBalanceMinor: bigint('opening_balance_minor', { mode: 'number' }).notNull(),
    closingBalanceMinor: bigint('closing_balance_minor', { mode: 'number' }).notNull(),
    totalCreditsMinor: bigint('total_credits_minor', { mode: 'number' }).notNull(),
    totalDebitsMinor: bigint('total_debits_minor', { mode: 'number' }).notNull(),
    transactionCount: integer('transaction_count').notNull(),
    generatedBy: uuid('generated_by'),
  },
  (table) => [
    uniqueIndex('wallet_statements_reference_uq').on(table.reference),
    index('wallet_statements_wallet_id_idx').on(table.walletId),
  ],
);

/** Per-wallet limits and balance floor governing balance rules. */
export const walletLimits = pgTable(
  'wallet_limits',
  {
    ...baseColumns(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    currencyCode: text('currency_code').notNull(),
    /** Lowest permitted available balance (default 0 → no negative balance). */
    minBalanceMinor: bigint('min_balance_minor', { mode: 'number' }).notNull().default(0),
    maxBalanceMinor: bigint('max_balance_minor', { mode: 'number' }),
    dailyDebitLimitMinor: bigint('daily_debit_limit_minor', { mode: 'number' }),
    singleTransactionLimitMinor: bigint('single_transaction_limit_minor', { mode: 'number' }),
    /** When true, the available balance may fall below `min_balance_minor`. */
    allowNegative: boolean('allow_negative').notNull().default(false),
  },
  (table) => [uniqueIndex('wallet_limits_wallet_id_uq').on(table.walletId)],
);
