import { and, desc, eq, gte, isNotNull, lte, sql, type Column, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import {
  auditLogs,
  campaignExecutions,
  campaigns,
  memberRewards,
  members,
  notifications,
  rewardTransactions,
  walletBalances,
  walletTransactions,
  wallets,
} from '@/database/schema';

import type {
  MemberRewardSummary,
  MemberWalletSummary,
  NormalizedFilters,
  RecentActivityItem,
} from '../dto';

/**
 * Read-only aggregation over the platform's business tables. This is the ONLY
 * place the reporting module touches operational data, and it never writes.
 *
 * For values that a module *derives* and maintains (wallet available/held
 * balances, reward point balances) this reads the module's own projection tables
 * (`wallet_balances`, `member_rewards`) rather than re-folding the ledgers — so
 * no business calculation is duplicated. Everything else is plain aggregate
 * counting/summing that no single module owns.
 */
export class ReportSourceRepository {
  public constructor(private readonly db: Database) {}

  private static rangeConditions(column: Column, from: Date | null, to: Date | null): SQL[] {
    const conditions: SQL[] = [];
    if (from) {
      conditions.push(gte(column, from));
    }
    if (to) {
      conditions.push(lte(column, to));
    }
    return conditions;
  }

  // --- Members ---------------------------------------------------------------

  public async memberCountsByStatus(): Promise<Array<{ status: string; count: number }>> {
    return this.db
      .select({ status: members.status, count: sql<number>`count(*)::int` })
      .from(members)
      .where(notDeleted(members.deletedAt))
      .groupBy(members.status);
  }

  public async memberTotals(
    filters: NormalizedFilters,
  ): Promise<{ total: number; active: number; newInRange: number }> {
    const rangeConds = ReportSourceRepository.rangeConditions(
      members.joinedAt,
      filters.from,
      filters.to,
    );
    const rows = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${members.status} = 'ACTIVE')::int`,
        newInRange: sql<number>`count(*) filter (where ${
          rangeConds.length > 0 ? and(...rangeConds) : sql`true`
        })::int`,
      })
      .from(members)
      .where(notDeleted(members.deletedAt));
    return rows[0] ?? { total: 0, active: 0, newInRange: 0 };
  }

  // --- Wallet ----------------------------------------------------------------

  public async walletTotals(filters: NormalizedFilters): Promise<{
    availableMinor: number;
    heldMinor: number;
    totalMinor: number;
    walletCount: number;
    creditsInRange: number;
    debitsInRange: number;
    transactionsInRange: number;
  }> {
    const balanceRows = await this.db
      .select({
        availableMinor: sql<number>`coalesce(sum(${walletBalances.availableMinor}), 0)::double precision`,
        heldMinor: sql<number>`coalesce(sum(${walletBalances.heldMinor}), 0)::double precision`,
        totalMinor: sql<number>`coalesce(sum(${walletBalances.totalMinor}), 0)::double precision`,
        walletCount: sql<number>`count(*)::int`,
      })
      .from(walletBalances)
      .where(notDeleted(walletBalances.deletedAt));

    const rangeConds = ReportSourceRepository.rangeConditions(
      walletTransactions.createdAt,
      filters.from,
      filters.to,
    );
    const flowRows = await this.db
      .select({
        creditsInRange: sql<number>`coalesce(sum(${walletTransactions.amountMinor}) filter (where ${walletTransactions.direction} = 'CREDIT'), 0)::double precision`,
        debitsInRange: sql<number>`coalesce(sum(${walletTransactions.amountMinor}) filter (where ${walletTransactions.direction} = 'DEBIT'), 0)::double precision`,
        transactionsInRange: sql<number>`count(*)::int`,
      })
      .from(walletTransactions)
      .where(rangeConds.length > 0 ? and(...rangeConds) : undefined);

    const balances = balanceRows[0] ?? {
      availableMinor: 0,
      heldMinor: 0,
      totalMinor: 0,
      walletCount: 0,
    };
    const flows = flowRows[0] ?? { creditsInRange: 0, debitsInRange: 0, transactionsInRange: 0 };
    return { ...balances, ...flows };
  }

  // --- Rewards ---------------------------------------------------------------

  public async rewardTotals(filters: NormalizedFilters): Promise<{
    pointsBalance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    membersWithPoints: number;
    earnedInRange: number;
    redeemedInRange: number;
    transactionsInRange: number;
  }> {
    const projRows = await this.db
      .select({
        pointsBalance: sql<number>`coalesce(sum(${memberRewards.pointsBalance}), 0)::int`,
        lifetimeEarned: sql<number>`coalesce(sum(${memberRewards.lifetimeEarned}), 0)::int`,
        lifetimeRedeemed: sql<number>`coalesce(sum(${memberRewards.lifetimeRedeemed}), 0)::int`,
        membersWithPoints: sql<number>`count(*) filter (where ${memberRewards.pointsBalance} > 0)::int`,
      })
      .from(memberRewards)
      .where(notDeleted(memberRewards.deletedAt));

    const rangeConds = ReportSourceRepository.rangeConditions(
      rewardTransactions.createdAt,
      filters.from,
      filters.to,
    );
    const flowRows = await this.db
      .select({
        earnedInRange: sql<number>`coalesce(sum(${rewardTransactions.points}) filter (where ${rewardTransactions.type} = 'EARN'), 0)::int`,
        redeemedInRange: sql<number>`coalesce(sum(${rewardTransactions.points}) filter (where ${rewardTransactions.type} = 'REDEEM'), 0)::int`,
        transactionsInRange: sql<number>`count(*)::int`,
      })
      .from(rewardTransactions)
      .where(rangeConds.length > 0 ? and(...rangeConds) : undefined);

    const proj = projRows[0] ?? {
      pointsBalance: 0,
      lifetimeEarned: 0,
      lifetimeRedeemed: 0,
      membersWithPoints: 0,
    };
    const flows = flowRows[0] ?? { earnedInRange: 0, redeemedInRange: 0, transactionsInRange: 0 };
    return { ...proj, ...flows };
  }

  // --- Campaigns -------------------------------------------------------------

  public async campaignCountsByStatus(): Promise<Array<{ status: string; count: number }>> {
    return this.db
      .select({ status: campaigns.status, count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(notDeleted(campaigns.deletedAt))
      .groupBy(campaigns.status);
  }

  public async campaignExecutionTotals(
    filters: NormalizedFilters,
  ): Promise<{ executions: number; rewardsIssued: number; pointsIssued: number }> {
    const rangeConds = ReportSourceRepository.rangeConditions(
      campaignExecutions.startedAt,
      filters.from,
      filters.to,
    );
    const rows = await this.db
      .select({
        executions: sql<number>`count(*)::int`,
        rewardsIssued: sql<number>`coalesce(sum(${campaignExecutions.rewardsIssued}), 0)::int`,
        pointsIssued: sql<number>`coalesce(sum(${campaignExecutions.pointsIssued}), 0)::int`,
      })
      .from(campaignExecutions)
      .where(rangeConds.length > 0 ? and(...rangeConds) : undefined);
    return rows[0] ?? { executions: 0, rewardsIssued: 0, pointsIssued: 0 };
  }

  // --- Notifications ---------------------------------------------------------

  public async notificationCountsByChannel(
    filters: NormalizedFilters,
  ): Promise<
    Array<{ channel: string; total: number; delivered: number; sent: number; failed: number }>
  > {
    const rangeConds = ReportSourceRepository.rangeConditions(
      notifications.createdAt,
      filters.from,
      filters.to,
    );
    const where = and(notDeleted(notifications.deletedAt), ...rangeConds);
    return this.db
      .select({
        channel: notifications.channel,
        total: sql<number>`count(*)::int`,
        delivered: sql<number>`count(*) filter (where ${notifications.status} = 'DELIVERED')::int`,
        sent: sql<number>`count(*) filter (where ${notifications.status} in ('SENT', 'DELIVERED'))::int`,
        failed: sql<number>`count(*) filter (where ${notifications.status} = 'FAILED')::int`,
      })
      .from(notifications)
      .where(where)
      .groupBy(notifications.channel);
  }

  // --- Audit -----------------------------------------------------------------

  public async auditCountsByModuleAction(
    filters: NormalizedFilters,
  ): Promise<Array<{ module: string | null; action: string; count: number }>> {
    const rangeConds = ReportSourceRepository.rangeConditions(
      auditLogs.createdAt,
      filters.from,
      filters.to,
    );
    return this.db
      .select({
        module: auditLogs.module,
        action: auditLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(rangeConds.length > 0 ? and(...rangeConds) : undefined)
      .groupBy(auditLogs.module, auditLogs.action)
      .orderBy(desc(sql`count(*)`));
  }

  public async userActivityCounts(
    filters: NormalizedFilters,
    limit: number,
  ): Promise<Array<{ userId: string; actions: number }>> {
    const rangeConds = ReportSourceRepository.rangeConditions(
      auditLogs.createdAt,
      filters.from,
      filters.to,
    );
    return this.db
      .select({
        userId: sql<string>`${auditLogs.userId}`,
        actions: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(and(isNotNull(auditLogs.userId), ...rangeConds))
      .groupBy(auditLogs.userId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);
  }

  // --- Dashboard KPIs --------------------------------------------------------

  public async dashboardKpis(): Promise<{
    membersTotal: number;
    membersActive: number;
    walletAvailableMinor: number;
    rewardPoints: number;
    activeCampaigns: number;
    notificationsDelivered: number;
  }> {
    const [memberRow] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${members.status} = 'ACTIVE')::int`,
      })
      .from(members)
      .where(notDeleted(members.deletedAt));
    const [walletRow] = await this.db
      .select({
        available: sql<number>`coalesce(sum(${walletBalances.availableMinor}), 0)::double precision`,
      })
      .from(walletBalances)
      .where(notDeleted(walletBalances.deletedAt));
    const [rewardRow] = await this.db
      .select({ points: sql<number>`coalesce(sum(${memberRewards.pointsBalance}), 0)::int` })
      .from(memberRewards)
      .where(notDeleted(memberRewards.deletedAt));
    const [campaignRow] = await this.db
      .select({
        active: sql<number>`count(*) filter (where ${campaigns.status} = 'ACTIVE')::int`,
      })
      .from(campaigns)
      .where(notDeleted(campaigns.deletedAt));
    const [notificationRow] = await this.db
      .select({
        delivered: sql<number>`count(*) filter (where ${notifications.status} = 'DELIVERED')::int`,
      })
      .from(notifications)
      .where(notDeleted(notifications.deletedAt));

    return {
      membersTotal: memberRow?.total ?? 0,
      membersActive: memberRow?.active ?? 0,
      walletAvailableMinor: walletRow?.available ?? 0,
      rewardPoints: rewardRow?.points ?? 0,
      activeCampaigns: campaignRow?.active ?? 0,
      notificationsDelivered: notificationRow?.delivered ?? 0,
    };
  }

  public async recentActivity(limit: number): Promise<RecentActivityItem[]> {
    const rows = await this.db
      .select({
        id: auditLogs.id,
        module: auditLogs.module,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        userId: auditLogs.userId,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      module: row.module,
      action: row.action,
      entityType: row.entityType,
      userId: row.userId,
      createdAt: row.createdAt,
    }));
  }

  // --- Member portal (own data) ----------------------------------------------

  public async memberIdByUserId(userId: string): Promise<string | null> {
    const rows = await this.db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.userId, userId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0]?.id ?? null;
  }

  public async walletSummaryForMember(memberId: string): Promise<MemberWalletSummary> {
    const walletRows = await this.db
      .select({ id: wallets.id, currencyCode: wallets.currencyCode })
      .from(wallets)
      .where(and(eq(wallets.memberId, memberId), notDeleted(wallets.deletedAt)))
      .limit(1);
    const wallet = walletRows[0];
    if (!wallet) {
      return {
        hasWallet: false,
        currencyCode: null,
        availableMinor: 0,
        heldMinor: 0,
        totalMinor: 0,
        recentTransactions: [],
      };
    }
    const [balance] = await this.db
      .select({
        availableMinor: walletBalances.availableMinor,
        heldMinor: walletBalances.heldMinor,
        totalMinor: walletBalances.totalMinor,
      })
      .from(walletBalances)
      .where(eq(walletBalances.walletId, wallet.id))
      .limit(1);
    const transactions = await this.db
      .select({
        reference: walletTransactions.reference,
        type: walletTransactions.type,
        direction: walletTransactions.direction,
        amountMinor: walletTransactions.amountMinor,
        description: walletTransactions.description,
        createdAt: walletTransactions.createdAt,
      })
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(10);
    return {
      hasWallet: true,
      currencyCode: wallet.currencyCode,
      availableMinor: balance?.availableMinor ?? 0,
      heldMinor: balance?.heldMinor ?? 0,
      totalMinor: balance?.totalMinor ?? 0,
      recentTransactions: transactions,
    };
  }

  public async rewardSummaryForMember(memberId: string): Promise<MemberRewardSummary> {
    const [projection] = await this.db
      .select({
        pointsBalance: memberRewards.pointsBalance,
        lifetimeEarned: memberRewards.lifetimeEarned,
        lifetimeRedeemed: memberRewards.lifetimeRedeemed,
      })
      .from(memberRewards)
      .where(and(eq(memberRewards.memberId, memberId), notDeleted(memberRewards.deletedAt)))
      .limit(1);
    const transactions = await this.db
      .select({
        reference: rewardTransactions.reference,
        type: rewardTransactions.type,
        direction: rewardTransactions.direction,
        points: rewardTransactions.points,
        description: rewardTransactions.description,
        createdAt: rewardTransactions.createdAt,
      })
      .from(rewardTransactions)
      .where(eq(rewardTransactions.memberId, memberId))
      .orderBy(desc(rewardTransactions.createdAt))
      .limit(10);
    return {
      pointsBalance: projection?.pointsBalance ?? 0,
      lifetimeEarned: projection?.lifetimeEarned ?? 0,
      lifetimeRedeemed: projection?.lifetimeRedeemed ?? 0,
      recentTransactions: transactions,
    };
  }
}
