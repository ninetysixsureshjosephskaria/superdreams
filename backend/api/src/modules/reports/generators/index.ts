import type { NormalizedFilters, ReportColumn, ReportRow } from '../dto';
import type { ReportSourceRepository } from '../repositories/source.repository';

export interface GeneratorOutput {
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: ReportRow;
}

export interface GeneratorContext {
  source: ReportSourceRepository;
}

/**
 * A report generator turns filters into tabular output by reading the source
 * module (read-only). Registering a new generator + seeding a matching
 * `report_definitions` row is all that adding a report requires — the reporting
 * framework (service, routes, exports, scheduling) is untouched.
 */
export type ReportGenerator = (
  ctx: GeneratorContext,
  filters: NormalizedFilters,
) => Promise<GeneratorOutput>;

const membersSummary: ReportGenerator = async (ctx, filters) => {
  const [byStatus, totals] = await Promise.all([
    ctx.source.memberCountsByStatus(),
    ctx.source.memberTotals(filters),
  ]);
  return {
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'count', label: 'Members' },
    ],
    rows: byStatus.map((row) => ({ status: row.status, count: row.count })),
    summary: {
      total: totals.total,
      active: totals.active,
      newInRange: totals.newInRange,
    },
  };
};

const walletSummary: ReportGenerator = async (ctx, filters) => {
  const totals = await ctx.source.walletTotals(filters);
  const rows: ReportRow[] = [
    { metric: 'Wallets', value: totals.walletCount },
    { metric: 'Total available (minor units)', value: totals.availableMinor },
    { metric: 'Total held (minor units)', value: totals.heldMinor },
    { metric: 'Total balance (minor units)', value: totals.totalMinor },
    { metric: 'Credits in period (minor units)', value: totals.creditsInRange },
    { metric: 'Debits in period (minor units)', value: totals.debitsInRange },
    { metric: 'Transactions in period', value: totals.transactionsInRange },
  ];
  return {
    columns: [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' },
    ],
    rows,
    summary: {
      availableMinor: totals.availableMinor,
      heldMinor: totals.heldMinor,
      totalMinor: totals.totalMinor,
      walletCount: totals.walletCount,
    },
  };
};

const rewardsSummary: ReportGenerator = async (ctx, filters) => {
  const totals = await ctx.source.rewardTotals(filters);
  const rows: ReportRow[] = [
    { metric: 'Members with points', value: totals.membersWithPoints },
    { metric: 'Points balance', value: totals.pointsBalance },
    { metric: 'Lifetime earned', value: totals.lifetimeEarned },
    { metric: 'Lifetime redeemed', value: totals.lifetimeRedeemed },
    { metric: 'Earned in period', value: totals.earnedInRange },
    { metric: 'Redeemed in period', value: totals.redeemedInRange },
    { metric: 'Transactions in period', value: totals.transactionsInRange },
  ];
  return {
    columns: [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' },
    ],
    rows,
    summary: {
      pointsBalance: totals.pointsBalance,
      lifetimeEarned: totals.lifetimeEarned,
      lifetimeRedeemed: totals.lifetimeRedeemed,
    },
  };
};

const campaignsSummary: ReportGenerator = async (ctx, filters) => {
  const [byStatus, execTotals] = await Promise.all([
    ctx.source.campaignCountsByStatus(),
    ctx.source.campaignExecutionTotals(filters),
  ]);
  const total = byStatus.reduce((sum, row) => sum + row.count, 0);
  return {
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'count', label: 'Campaigns' },
    ],
    rows: byStatus.map((row) => ({ status: row.status, count: row.count })),
    summary: {
      total,
      executionsInRange: execTotals.executions,
      rewardsIssuedInRange: execTotals.rewardsIssued,
      pointsIssuedInRange: execTotals.pointsIssued,
    },
  };
};

const notificationsSummary: ReportGenerator = async (ctx, filters) => {
  const byChannel = await ctx.source.notificationCountsByChannel(filters);
  const totals = byChannel.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      delivered: acc.delivered + row.delivered,
      failed: acc.failed + row.failed,
    }),
    { total: 0, delivered: 0, failed: 0 },
  );
  return {
    columns: [
      { key: 'channel', label: 'Channel' },
      { key: 'total', label: 'Total' },
      { key: 'sent', label: 'Sent' },
      { key: 'delivered', label: 'Delivered' },
      { key: 'failed', label: 'Failed' },
    ],
    rows: byChannel.map((row) => ({
      channel: row.channel,
      total: row.total,
      sent: row.sent,
      delivered: row.delivered,
      failed: row.failed,
    })),
    summary: totals,
  };
};

const auditActivity: ReportGenerator = async (ctx, filters) => {
  const byModuleAction = await ctx.source.auditCountsByModuleAction(filters);
  const total = byModuleAction.reduce((sum, row) => sum + row.count, 0);
  return {
    columns: [
      { key: 'module', label: 'Module' },
      { key: 'action', label: 'Action' },
      { key: 'count', label: 'Events' },
    ],
    rows: byModuleAction.map((row) => ({
      module: row.module ?? '(none)',
      action: row.action,
      count: row.count,
    })),
    summary: { total, groups: byModuleAction.length },
  };
};

const userActivity: ReportGenerator = async (ctx, filters) => {
  const rows = await ctx.source.userActivityCounts(filters, 25);
  const total = rows.reduce((sum, row) => sum + row.actions, 0);
  return {
    columns: [
      { key: 'userId', label: 'User' },
      { key: 'actions', label: 'Actions' },
    ],
    rows: rows.map((row) => ({ userId: row.userId, actions: row.actions })),
    summary: { total, users: rows.length },
  };
};

/** The registry of built-in report generators, keyed by definition code. */
export const REPORT_GENERATORS: Readonly<Record<string, ReportGenerator>> = {
  MEMBERS_SUMMARY: membersSummary,
  WALLET_SUMMARY: walletSummary,
  REWARDS_SUMMARY: rewardsSummary,
  CAMPAIGNS_SUMMARY: campaignsSummary,
  NOTIFICATIONS_SUMMARY: notificationsSummary,
  AUDIT_ACTIVITY: auditActivity,
  USER_ACTIVITY: userActivity,
};

export function getGenerator(code: string): ReportGenerator | null {
  return REPORT_GENERATORS[code] ?? null;
}
