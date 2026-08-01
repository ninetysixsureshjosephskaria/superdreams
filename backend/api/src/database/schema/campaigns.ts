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
  campaignAudienceType,
  campaignMemberStatus,
  campaignRuleType,
  campaignScheduleType,
  campaignStatus,
  campaignType,
  jobStatus,
} from './enums';
import { members } from './members';
import { rewardPrograms } from './rewards';

/**
 * Campaign Management. A campaign targets an audience of members, optionally
 * maps to a reward program, and — when executed — allocates rewards to enrolled
 * members through the Rewards module's public service (never by touching reward
 * tables directly). Mirrors the platform ledger/lifecycle conventions.
 */

/** Seeded lookup describing each campaign type (matches the `campaign_type` enum). */
export const campaignTypes = pgTable(
  'campaign_types',
  {
    ...baseColumns(),
    code: campaignType('code').notNull(),
    label: text('label').notNull(),
    description: text('description'),
  },
  (table) => [uniqueIndex('campaign_types_code_uq').on(table.code)],
);

/** Campaign aggregate root. */
export const campaigns = pgTable(
  'campaigns',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    type: campaignType('type').notNull(),
    status: campaignStatus('status').notNull().default('DRAFT'),
    audienceType: campaignAudienceType('audience_type').notNull().default('ALL_MEMBERS'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    metadata: jsonb('metadata'),
  },
  (table) => [
    uniqueIndex('campaigns_code_uq').on(table.code),
    index('campaigns_status_idx').on(table.status),
    index('campaigns_type_idx').on(table.type),
  ],
);

/** Eligibility rules (AND-combined) governing who may participate. */
export const campaignRules = pgTable(
  'campaign_rules',
  {
    ...baseColumns(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    type: campaignRuleType('type').notNull(),
    /** Rule operand (e.g. a status value or an ISO date), interpreted by type. */
    value: text('value'),
    config: jsonb('config'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [index('campaign_rules_campaign_id_idx').on(table.campaignId)],
);

/** A named reusable audience segment definition for a campaign. */
export const campaignSegments = pgTable(
  'campaign_segments',
  {
    ...baseColumns(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    name: text('name').notNull(),
    definition: jsonb('definition'),
  },
  (table) => [index('campaign_segments_campaign_id_idx').on(table.campaignId)],
);

/** Explicit member targets (MANUAL audience). */
export const campaignTargets = pgTable(
  'campaign_targets',
  {
    ...baseColumns(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
  },
  (table) => [
    uniqueIndex('campaign_targets_campaign_member_uq').on(table.campaignId, table.memberId),
    index('campaign_targets_campaign_id_idx').on(table.campaignId),
  ],
);

/** Reward mapping: the reward a campaign issues on execution. */
export const campaignRewards = pgTable(
  'campaign_rewards',
  {
    ...baseColumns(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    rewardProgramId: uuid('reward_program_id').references(() => rewardPrograms.id),
    /** Points allocated per rewarded member. */
    points: integer('points').notNull(),
    description: text('description'),
  },
  (table) => [index('campaign_rewards_campaign_id_idx').on(table.campaignId)],
);

/** Scheduling configuration for a campaign. */
export const campaignSchedules = pgTable(
  'campaign_schedules',
  {
    ...baseColumns(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    scheduleType: campaignScheduleType('schedule_type').notNull().default('IMMEDIATE'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    recurrenceCron: text('recurrence_cron'),
    timezone: text('timezone'),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('campaign_schedules_campaign_id_uq').on(table.campaignId)],
);

/** Append-only log of campaign execution runs. */
export const campaignExecutions = pgTable(
  'campaign_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    status: jobStatus('status').notNull().default('COMPLETED'),
    membersTargeted: integer('members_targeted').notNull().default(0),
    rewardsIssued: integer('rewards_issued').notNull().default(0),
    pointsIssued: integer('points_issued').notNull().default(0),
    error: text('error'),
    executedBy: uuid('executed_by'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('campaign_executions_campaign_id_idx').on(table.campaignId)],
);

/** A member's participation status within a campaign (enrollment). */
export const campaignMemberStatuses = pgTable(
  'campaign_member_status',
  {
    ...baseColumns(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    status: campaignMemberStatus('status').notNull().default('ELIGIBLE'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }),
    rewardedAt: timestamp('rewarded_at', { withTimezone: true }),
    /** The reward-ledger transaction produced when this member was rewarded. */
    rewardTransactionId: uuid('reward_transaction_id'),
  },
  (table) => [
    uniqueIndex('campaign_member_status_campaign_member_uq').on(table.campaignId, table.memberId),
    index('campaign_member_status_campaign_id_idx').on(table.campaignId),
    index('campaign_member_status_member_id_idx').on(table.memberId),
    index('campaign_member_status_status_idx').on(table.status),
  ],
);

/** Append-only campaign activity feed. */
export const campaignHistory = pgTable(
  'campaign_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    action: text('action').notNull(),
    description: text('description'),
    actorId: uuid('actor_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('campaign_history_campaign_id_idx').on(table.campaignId)],
);
