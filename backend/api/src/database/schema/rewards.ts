import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import {
  rewardExpiryPolicy,
  rewardProgramStatus,
  rewardRedemptionStatus,
  rewardRuleType,
  rewardTransactionDirection,
  rewardTransactionStatus,
  rewardTransactionType,
} from './enums';
import { members } from './members';

/**
 * Rewards use **integer points** (no currency). The append-only
 * {@link rewardTransactions} ledger is the source of truth; {@link memberRewards}
 * is a 1:1 balance projection kept consistent inside the same database
 * transaction. Mirrors the Wallet module's ledger/projection pattern.
 */

/** Seeded lookup describing each reward type (matches the `reward_rule_type` enum). */
export const rewardTypes = pgTable(
  'reward_types',
  {
    ...baseColumns(),
    code: rewardRuleType('code').notNull(),
    label: text('label').notNull(),
    description: text('description'),
  },
  (table) => [uniqueIndex('reward_types_code_uq').on(table.code)],
);

/** Seeded lookup grouping programs into categories. */
export const rewardCategories = pgTable(
  'reward_categories',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    label: text('label').notNull(),
    description: text('description'),
  },
  (table) => [uniqueIndex('reward_categories_code_uq').on(table.code)],
);

/** A configurable reward program. */
export const rewardPrograms = pgTable(
  'reward_programs',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    type: rewardRuleType('type').notNull(),
    categoryId: uuid('category_id').references(() => rewardCategories.id),
    status: rewardProgramStatus('status').notNull().default('DRAFT'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    /** Optional default point value used by simple FIXED programs. */
    pointsPerUnit: integer('points_per_unit'),
    metadata: jsonb('metadata'),
  },
  (table) => [
    uniqueIndex('reward_programs_code_uq').on(table.code),
    index('reward_programs_status_idx').on(table.status),
    index('reward_programs_type_idx').on(table.type),
  ],
);

/** Configurable accrual rule attached to a program. */
export const rewardRules = pgTable(
  'reward_rules',
  {
    ...baseColumns(),
    programId: uuid('program_id')
      .notNull()
      .references(() => rewardPrograms.id),
    name: text('name').notNull(),
    type: rewardRuleType('type').notNull(),
    /** Flat points awarded (FIXED rules). */
    points: integer('points'),
    /** Rate in basis points (PERCENTAGE rules): 100 = 1%. */
    rateBasisPoints: integer('rate_basis_points'),
    /** Additional structured configuration (e.g. TIER thresholds). */
    config: jsonb('config'),
    priority: integer('priority').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [index('reward_rules_program_id_idx').on(table.programId)],
);

/**
 * 1:1 reward-points projection per member. Kept consistent with the ledger
 * inside the same transaction (row-locked). `version` (baseColumns) supports
 * optimistic concurrency; a validation routine recomputes these from the ledger.
 */
export const memberRewards = pgTable(
  'member_rewards',
  {
    ...baseColumns(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    pointsBalance: integer('points_balance').notNull().default(0),
    lifetimeEarned: integer('lifetime_earned').notNull().default(0),
    lifetimeRedeemed: integer('lifetime_redeemed').notNull().default(0),
  },
  (table) => [uniqueIndex('member_rewards_member_id_uq').on(table.memberId)],
);

/**
 * Append-only reward ledger. Rows are never deleted and their point-affecting
 * fields are never rewritten. Each row snapshots the balance after it was
 * applied. Reversals append a compensating entry (`reversal_of_id`); the
 * original's `status` may flip to REVERSED for traceability.
 */
export const rewardTransactions = pgTable(
  'reward_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    programId: uuid('program_id').references(() => rewardPrograms.id),
    ruleId: uuid('rule_id').references(() => rewardRules.id),
    reference: text('reference').notNull(),
    type: rewardTransactionType('type').notNull(),
    direction: rewardTransactionDirection('direction').notNull(),
    status: rewardTransactionStatus('status').notNull().default('POSTED'),
    points: integer('points').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    description: text('description'),
    redemptionId: uuid('redemption_id'),
    reversalOfId: uuid('reversal_of_id'),
    /** When an EARN lot's points expire (null = never). */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Set once an EARN lot has been processed by expiry (traceability only). */
    expiredAt: timestamp('expired_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('reward_transactions_reference_uq').on(table.reference),
    index('reward_transactions_member_id_idx').on(table.memberId),
    index('reward_transactions_member_created_idx').on(table.memberId, table.createdAt),
    index('reward_transactions_type_idx').on(table.type),
    index('reward_transactions_program_id_idx').on(table.programId),
    index('reward_transactions_expiry_idx').on(table.expiresAt),
  ],
);

/** A redemption of points; links to the ledger entry it produced. */
export const rewardRedemptions = pgTable(
  'reward_redemptions',
  {
    ...baseColumns(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => rewardTransactions.id),
    reference: text('reference').notNull(),
    points: integer('points').notNull(),
    status: rewardRedemptionStatus('status').notNull().default('COMPLETED'),
    note: text('note'),
    /** Optional wallet credit produced by this redemption (wallet integration). */
    walletTransactionId: uuid('wallet_transaction_id'),
    processedBy: uuid('processed_by'),
  },
  (table) => [
    uniqueIndex('reward_redemptions_reference_uq').on(table.reference),
    index('reward_redemptions_member_id_idx').on(table.memberId),
    index('reward_redemptions_status_idx').on(table.status),
  ],
);

/** A manual admin points adjustment; links to its ledger entry. */
export const rewardAdjustments = pgTable(
  'reward_adjustments',
  {
    ...baseColumns(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => rewardTransactions.id),
    direction: rewardTransactionDirection('direction').notNull(),
    points: integer('points').notNull(),
    reason: text('reason').notNull(),
    approvedBy: uuid('approved_by'),
  },
  (table) => [index('reward_adjustments_member_id_idx').on(table.memberId)],
);

/** Configurable point-expiry policy (program-scoped, or global when null). */
export const rewardExpiryRules = pgTable(
  'reward_expiry_rules',
  {
    ...baseColumns(),
    programId: uuid('program_id').references(() => rewardPrograms.id),
    policy: rewardExpiryPolicy('policy').notNull().default('NEVER'),
    fixedDate: timestamp('fixed_date', { withTimezone: true }),
    rollingDays: integer('rolling_days'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [index('reward_expiry_rules_program_id_idx').on(table.programId)],
);

/** Append-only member reward activity feed. */
export const rewardHistory = pgTable(
  'reward_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    action: text('action').notNull(),
    description: text('description'),
    actorId: uuid('actor_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('reward_history_member_id_idx').on(table.memberId)],
);
