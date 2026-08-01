import {
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
import { gameSessionStatus, gameStatus } from './enums';
import { members } from './members';

/**
 * Games. A small catalog of reward-earning games. Playing a game creates a
 * session (optionally debiting an entry cost via the Rewards ledger); submitting
 * a score completes the session and awards reward points (again via the Rewards
 * ledger — no duplicated point logic). Scores and rewards are append-only.
 */

/** Seeded catalog of playable games. */
export const games = pgTable(
  'games',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    /** Reward points required to play one session (0 = free). */
    entryCost: integer('entry_cost').notNull().default(0),
    /** Reward bounds for a completed session. */
    minReward: integer('min_reward').notNull().default(0),
    maxReward: integer('max_reward').notNull().default(0),
    /** Highest score used to scale the reward. */
    maxScore: integer('max_score').notNull().default(100),
    status: gameStatus('status').notNull().default('ACTIVE'),
    config: jsonb('config'),
  },
  (table) => [
    uniqueIndex('games_code_uq').on(table.code),
    index('games_status_idx').on(table.status),
  ],
);

/** A single play session for a member. */
export const gameSessions = pgTable(
  'game_sessions',
  {
    ...baseColumns(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    status: gameSessionStatus('status').notNull().default('STARTED'),
    /** The reward-ledger transaction produced when the entry cost was charged. */
    entryTransactionId: uuid('entry_transaction_id'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    index('game_sessions_member_id_idx').on(table.memberId),
    index('game_sessions_game_id_idx').on(table.gameId),
    index('game_sessions_status_idx').on(table.status),
  ],
);

/** Append-only score submitted for a session. */
export const gameScores = pgTable(
  'game_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => gameSessions.id),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    score: integer('score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('game_scores_session_id_idx').on(table.sessionId),
    index('game_scores_member_id_idx').on(table.memberId),
  ],
);

/** Append-only record of points awarded for a completed session. */
export const gameRewards = pgTable(
  'game_rewards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => gameSessions.id),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    points: integer('points').notNull(),
    /** The reward-ledger transaction produced when points were awarded. */
    rewardTransactionId: uuid('reward_transaction_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('game_rewards_session_id_idx').on(table.sessionId),
    index('game_rewards_member_id_idx').on(table.memberId),
  ],
);
