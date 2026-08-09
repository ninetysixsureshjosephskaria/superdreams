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
import { activationRewardType } from './enums';
import { members } from './members';
import { wallets } from './wallet';

/**
 * Phase 2E — Activation Bonus (the `actbonus.html` screen). A single network-wide
 * config: a member who adds 2 members within a day earns an auto reward (TXN-A) —
 * a percentage of their balance or a fixed amount, with a recorded lock period.
 */
export const activationBonusConfig = pgTable(
  'activation_bonus_config',
  {
    ...baseColumns(),
    singleton: text('singleton').notNull().default('SINGLETON'),
    enabled: boolean('enabled').notNull().default(false),
    rewardType: activationRewardType('reward_type').notNull().default('FIXED'),
    /** Basis points when PERCENT, minor units (cents) when FIXED. */
    value: integer('value').notNull().default(0),
    lockDays: integer('lock_days').notNull().default(0),
  },
  (table) => [uniqueIndex('activation_bonus_config_singleton_uq').on(table.singleton)],
);

/**
 * One activation-bonus grant per qualifying member. `member_id` is UNIQUE — a
 * member earns the activation bonus at most once (idempotent, never double-issued
 * for the same qualifying activation event). The wallet ledger reference is also
 * unique (`TXN-A-<memberId>`).
 */
export const activationBonusGrants = pgTable(
  'activation_bonus_grants',
  {
    ...baseColumns(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    rewardType: activationRewardType('reward_type').notNull(),
    value: integer('value').notNull(),
    lockDays: integer('lock_days').notNull(),
    transactionId: uuid('transaction_id'),
    qualifiedAt: timestamp('qualified_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('activation_bonus_grants_member_uq').on(table.memberId),
    index('activation_bonus_grants_wallet_idx').on(table.walletId),
  ],
);
