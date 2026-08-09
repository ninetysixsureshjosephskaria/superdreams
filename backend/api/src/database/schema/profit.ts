import {
  bigint,
  boolean,
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
import { profitBeneficiaryRole, profitScheduleStatus } from './enums';
import { members } from './members';
import { wallets } from './wallet';

/**
 * Phase 2E — Daily Profit (the `profit.html` screen). Reference formula:
 * `base = units × 30` (USD) → in our integer-cents model a wallet's profit base
 * equals its available balance in cents (1 unit = $30 = 3000 cents). Member and
 * partner rates are stored in **basis points** (100 bps = 1%): `amount =
 * round(baseCents × bps / 10000)`. Distribution is idempotent per day.
 */

/** A monthly plan of per-day member/partner profit percentages. */
export const profitSchedules = pgTable(
  'profit_schedules',
  {
    ...baseColumns(),
    /** Calendar month, `YYYY-MM`. */
    month: text('month').notNull(),
    status: profitScheduleStatus('status').notNull().default('DRAFT'),
    /** Monthly target rates (bps) the auto-plan spreads across working days. */
    memberMonthlyBps: integer('member_monthly_bps').notNull().default(0),
    partnerMonthlyBps: integer('partner_monthly_bps').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('profit_schedules_month_uq').on(table.month)],
);

/** Per-day tuning row within a monthly schedule. */
export const profitScheduleDays = pgTable(
  'profit_schedule_days',
  {
    ...baseColumns(),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => profitSchedules.id),
    day: date('day').notNull(),
    memberBps: integer('member_bps').notNull().default(0),
    partnerBps: integer('partner_bps').notNull().default(0),
    /** Randomised distribution time within the 23:00–23:59 window, `HH:MM`. */
    distributeAt: text('distribute_at'),
    /** A non-working / skipped day contributes nothing to the spread. */
    off: boolean('off').notNull().default(false),
  },
  (table) => [uniqueIndex('profit_schedule_days_schedule_day_uq').on(table.scheduleId, table.day)],
);

/**
 * One executed distribution for a calendar day. `day` is UNIQUE — the single
 * source of period idempotency: a day is distributed at most once, and re-running
 * resumes crediting only members without a {@link profitDistributionCredits} row.
 */
export const profitDistributions = pgTable(
  'profit_distributions',
  {
    ...baseColumns(),
    day: date('day').notNull(),
    reference: text('reference').notNull(),
    memberBps: integer('member_bps').notNull(),
    partnerBps: integer('partner_bps').notNull(),
    memberAmountCents: bigint('member_amount_cents', { mode: 'number' }).notNull().default(0),
    partnerAmountCents: bigint('partner_amount_cents', { mode: 'number' }).notNull().default(0),
    membersCredited: integer('members_credited').notNull().default(0),
    partnersCredited: integer('partners_credited').notNull().default(0),
    distributedAt: timestamp('distributed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('profit_distributions_day_uq').on(table.day),
    uniqueIndex('profit_distributions_reference_uq').on(table.reference),
  ],
);

/**
 * Per-member credit within a distribution. UNIQUE `(distribution_id, member_id)`
 * guarantees a member is credited at most once per day even under concurrent /
 * retried runs (the wallet ledger reference is also unique per day+member).
 */
export const profitDistributionCredits = pgTable(
  'profit_distribution_credits',
  {
    ...baseColumns(),
    distributionId: uuid('distribution_id')
      .notNull()
      .references(() => profitDistributions.id),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    role: profitBeneficiaryRole('role').notNull(),
    baseCents: bigint('base_cents', { mode: 'number' }).notNull(),
    bps: integer('bps').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    transactionId: uuid('transaction_id'),
  },
  (table) => [
    uniqueIndex('profit_distribution_credits_dist_member_uq').on(
      table.distributionId,
      table.memberId,
    ),
    index('profit_distribution_credits_member_idx').on(table.memberId),
  ],
);
