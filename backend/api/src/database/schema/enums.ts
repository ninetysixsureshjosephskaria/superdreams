import { pgEnum } from 'drizzle-orm/pg-core';

/** Generic lifecycle status for records that use a controlled status field. */
export const recordStatus = pgEnum('record_status', [
  'ACTIVE',
  'INACTIVE',
  'PENDING',
  'SUSPENDED',
  'ARCHIVED',
]);

/** Execution status for jobs and background tasks. */
export const jobStatus = pgEnum('job_status', [
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

/** Action recorded in the append-only audit log. */
export const auditAction = pgEnum('audit_action', ['CREATE', 'UPDATE', 'DELETE', 'RESTORE']);

/** Wallet lifecycle status. */
export const walletStatus = pgEnum('wallet_status', ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']);

/**
 * Wallet economy discriminator (Phase 2). LOYALTY = the original points wallet
 * (rewards / dream-store / games / campaigns). FINANCIAL = the real-money units
 * wallet (deposits / withdrawals / tranches / profit / commission). A member may
 * hold at most one wallet of each kind. Existing wallets default to LOYALTY.
 */
export const walletKind = pgEnum('wallet_kind', ['LOYALTY', 'FINANCIAL']);
export type WalletKind = (typeof walletKind.enumValues)[number];

/** Financial request kind (Phase 2B): member-initiated deposit or withdrawal. */
export const financialRequestType = pgEnum('financial_request_type', ['DEPOSIT', 'WITHDRAW']);

/**
 * Financial request lifecycle. PENDING/HOLD are actionable; APPROVED/REJECTED
 * are terminal ("locked once submitted" per the reference).
 */
export const financialRequestStatus = pgEnum('financial_request_status', [
  'PENDING',
  'HOLD',
  'APPROVED',
  'REJECTED',
]);

/** Deposit tranche lifecycle (Phase 2B): locked capital with a maturity date. */
export const depositTrancheStatus = pgEnum('deposit_tranche_status', [
  'LOCKED',
  'MATURED',
  'UNLOCKED',
  'LIQUIDATED',
]);

/** Kind of partner earning credited on a member deposit (Phase 2E). */
export const commissionEarningType = pgEnum('commission_earning_type', ['COMMISSION', 'REFERRAL']);

/** Monthly daily-profit schedule lifecycle (Phase 2E). */
export const profitScheduleStatus = pgEnum('profit_schedule_status', ['DRAFT', 'PUBLISHED']);

/** Which rate a wallet receives in a daily-profit distribution (Phase 2E). */
export const profitBeneficiaryRole = pgEnum('profit_beneficiary_role', ['MEMBER', 'PARTNER']);

/** Which deposits a bonus campaign applies to (Phase 2E). */
export const bonusCampaignScope = pgEnum('bonus_campaign_scope', ['FIRST_DEPOSIT', 'ALL_DEPOSITS']);

/** How often a member may claim a bonus campaign (Phase 2E). */
export const bonusClaimFrequency = pgEnum('bonus_claim_frequency', ['SINGLE', 'MULTI']);

/** Activation-bonus reward kind (Phase 2E): percentage of balance or a fixed amount. */
export const activationRewardType = pgEnum('activation_reward_type', ['PERCENT', 'FIXED']);

/** The role a network invite provisions on acceptance (Phase 2D). */
export const inviteRole = pgEnum('invite_role', ['PARTNER', 'MEMBER']);

/**
 * Invite lifecycle (Phase 2D). PENDING is the only actionable state; USED /
 * EXPIRED / REVOKED are terminal. Matches the reference `invite.html` statuses
 * (Pending / Used / Expired + revoke).
 */
export const inviteStatus = pgEnum('invite_status', ['PENDING', 'USED', 'EXPIRED', 'REVOKED']);

/** Kind of a ledger transaction. */
export const walletTransactionType = pgEnum('wallet_transaction_type', [
  'CREDIT',
  'DEBIT',
  'ADJUSTMENT',
  'HOLD',
  'RELEASE',
  'REVERSAL',
]);

/** Whether a transaction increases (CREDIT) or decreases (DEBIT) funds. */
export const walletTransactionDirection = pgEnum('wallet_transaction_direction', [
  'CREDIT',
  'DEBIT',
]);

/**
 * Ledger entry status. Financial fields (amount, type, direction) are immutable;
 * `REVERSED` only flags an entry whose effect has been neutralised by a
 * compensating REVERSAL entry — the original entry itself is never rewritten.
 */
export const walletTransactionStatus = pgEnum('wallet_transaction_status', ['POSTED', 'REVERSED']);

/** Status of a funds hold. */
export const walletHoldStatus = pgEnum('wallet_hold_status', ['ACTIVE', 'RELEASED']);

/** Reward program lifecycle status. */
export const rewardProgramStatus = pgEnum('reward_program_status', [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
]);

/** Kind of reward rule / program (also the seeded reward_types codes). */
export const rewardRuleType = pgEnum('reward_rule_type', [
  'FIXED',
  'PERCENTAGE',
  'TIER',
  'EVENT',
  'MANUAL',
  'PROMOTIONAL',
]);

/** Kind of a reward-ledger transaction. */
export const rewardTransactionType = pgEnum('reward_transaction_type', [
  'EARN',
  'REDEEM',
  'ADJUSTMENT',
  'EXPIRE',
  'REVERSAL',
]);

/** Whether a reward transaction increases (CREDIT) or decreases (DEBIT) points. */
export const rewardTransactionDirection = pgEnum('reward_transaction_direction', [
  'CREDIT',
  'DEBIT',
]);

/** Reward-ledger entry status (REVERSED = neutralised by a compensating entry). */
export const rewardTransactionStatus = pgEnum('reward_transaction_status', ['POSTED', 'REVERSED']);

/** Redemption lifecycle status. */
export const rewardRedemptionStatus = pgEnum('reward_redemption_status', [
  'PENDING',
  'COMPLETED',
  'REVERSED',
]);

/** Point-expiry policy for a program. */
export const rewardExpiryPolicy = pgEnum('reward_expiry_policy', [
  'FIXED_DATE',
  'ROLLING',
  'NEVER',
]);

/** Campaign lifecycle status (state machine). */
export const campaignStatus = pgEnum('campaign_status', [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED',
]);

/** Kind of campaign (also the seeded campaign_types codes). */
export const campaignType = pgEnum('campaign_type', [
  'PROMOTIONAL',
  'REWARD',
  'REFERRAL',
  'SEASONAL',
  'ENGAGEMENT',
]);

/** How a campaign's audience is defined. */
export const campaignAudienceType = pgEnum('campaign_audience_type', [
  'ALL_MEMBERS',
  'SEGMENT',
  'MANUAL',
  'STATUS',
  'JOIN_DATE',
]);

/** Kind of eligibility rule. */
export const campaignRuleType = pgEnum('campaign_rule_type', [
  'MEMBER_STATUS',
  'JOIN_DATE_AFTER',
  'JOIN_DATE_BEFORE',
  'REWARD_ELIGIBILITY',
  'SEGMENT',
]);

/** How a campaign is scheduled. */
export const campaignScheduleType = pgEnum('campaign_schedule_type', [
  'IMMEDIATE',
  'SCHEDULED',
  'RECURRING',
]);

/** A member's participation status within a campaign. */
export const campaignMemberStatus = pgEnum('campaign_participation_status', [
  'ELIGIBLE',
  'ENROLLED',
  'REWARDED',
  'EXCLUDED',
]);

/** Notification delivery channel (also the seeded notification_channels codes). */
export const notificationChannel = pgEnum('notification_channel', [
  'IN_APP',
  'EMAIL',
  'SMS',
  'PUSH',
]);

/** Notification delivery lifecycle status (state machine). */
export const notificationStatus = pgEnum('notification_status', [
  'DRAFT',
  'QUEUED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
]);

/** Queue-item processing status (includes dead-letter). */
export const notificationQueueStatus = pgEnum('notification_queue_status', [
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'DEAD',
  'CANCELLED',
]);

/** Result recorded for a single delivery attempt. */
export const notificationDeliveryResult = pgEnum('notification_delivery_result', [
  'SENT',
  'DELIVERED',
  'FAILED',
]);

/** Template lifecycle status. */
export const notificationTemplateStatus = pgEnum('notification_template_status', [
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
]);

/** Export/output format for a generated report. */
export const reportExportFormat = pgEnum('report_export_format', ['CSV', 'XLSX', 'PDF']);

/** Cadence of a scheduled report run. */
export const reportScheduleFrequency = pgEnum('report_schedule_frequency', [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'CUSTOM',
]);

/** Kind of dashboard widget (a data provider — never chart rendering itself). */
export const reportWidgetType = pgEnum('report_widget_type', [
  'KPI',
  'CHART',
  'TABLE',
  'SUMMARY',
  'ACTIVITY',
]);

/** Dream Store product lifecycle status. */
export const storeProductStatus = pgEnum('store_product_status', ['ACTIVE', 'DRAFT', 'ARCHIVED']);

/** Dream Store order lifecycle status. */
export const storeOrderStatus = pgEnum('store_order_status', ['PENDING', 'FULFILLED', 'CANCELLED']);

/** Reason an inventory movement was recorded. */
export const storeInventoryChangeType = pgEnum('store_inventory_change_type', [
  'RESTOCK',
  'REDEMPTION',
  'CANCELLATION',
  'ADJUSTMENT',
]);

/** Game catalog status. */
export const gameStatus = pgEnum('game_status', ['ACTIVE', 'INACTIVE']);

/** Play-session lifecycle status. */
export const gameSessionStatus = pgEnum('game_session_status', [
  'STARTED',
  'COMPLETED',
  'ABANDONED',
]);

/** The value type of a configuration setting (drives validation + UI rendering). */
export const settingValueType = pgEnum('setting_value_type', [
  'STRING',
  'NUMBER',
  'BOOLEAN',
  'COLOR',
  'SELECT',
  'JSON',
  'ARRAY',
]);
