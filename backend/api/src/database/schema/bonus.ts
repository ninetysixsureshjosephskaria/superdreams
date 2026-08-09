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
import { bonusCampaignScope, bonusClaimFrequency } from './enums';
import { financialRequests } from './finance';
import { members } from './members';

/**
 * Phase 2E — deposit Bonus Campaigns (the `bonus.html` screen). A campaign grants
 * a percentage bonus (bps) on eligible deposits; the bonus amount is written to
 * the deposit's tranche `bonus_cents` and realised (credited TXN-B) at the
 * tranche's maturity — reusing the existing tranche lifecycle (forfeited on early
 * unlock). Status (SCHEDULED / LIVE / ENDED) is derived from `startAt`/`endAt` +
 * `permanent` + `enabled`.
 */
export const bonusCampaigns = pgTable(
  'bonus_campaigns',
  {
    ...baseColumns(),
    name: text('name').notNull(),
    icon: text('icon'),
    scope: bonusCampaignScope('scope').notNull(),
    frequency: bonusClaimFrequency('frequency').notNull(),
    /** Bonus rate in basis points (100 bps = 1%). */
    rateBps: integer('rate_bps').notNull(),
    /** Lock period recorded from the campaign; the bonus realises at tranche maturity. */
    lockDays: integer('lock_days').notNull().default(30),
    /** Minimum deposit units for eligibility. */
    minUnits: integer('min_units').notNull().default(0),
    /** Permanent (no end date) campaign. */
    permanent: boolean('permanent').notNull().default(false),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    /** Admin on/off switch (independent of the schedule window). */
    enabled: boolean('enabled').notNull().default(true),
  },
  (table) => [
    index('bonus_campaigns_enabled_idx').on(table.enabled),
    index('bonus_campaigns_start_idx').on(table.startAt),
  ],
);

/**
 * A bonus applied to a deposit. `dedupeKey` (`B:<depositRequestId>`) is UNIQUE —
 * a deposit receives at most one bonus, making application idempotent. The
 * `(campaign_id, member_id)` index backs the SINGLE-frequency "claim once" rule.
 */
export const bonusClaims = pgTable(
  'bonus_claims',
  {
    ...baseColumns(),
    dedupeKey: text('dedupe_key').notNull(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => bonusCampaigns.id),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    depositRequestId: uuid('deposit_request_id')
      .notNull()
      .references(() => financialRequests.id),
    trancheId: uuid('tranche_id').notNull(),
    bonusCents: bigint('bonus_cents', { mode: 'number' }).notNull(),
    rateBps: integer('rate_bps').notNull(),
    lockDays: integer('lock_days').notNull(),
  },
  (table) => [
    uniqueIndex('bonus_claims_dedupe_key_uq').on(table.dedupeKey),
    index('bonus_claims_campaign_member_idx').on(table.campaignId, table.memberId),
    index('bonus_claims_member_idx').on(table.memberId),
  ],
);
