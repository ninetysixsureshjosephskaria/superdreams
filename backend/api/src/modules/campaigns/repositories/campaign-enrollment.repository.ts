import { and, desc, eq, sql, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { campaignMemberStatuses } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { CampaignEnrollmentStats, CampaignMemberStatus, ListEnrollmentsQuery } from '../dto';

export type CampaignEnrollmentRow = InferSelectModel<typeof campaignMemberStatuses>;

/** Persistence for campaign_member_status (enrollment/participation). */
export class CampaignEnrollmentRepository {
  public constructor(private readonly db: Database) {}

  public async findByCampaignMember(
    campaignId: string,
    memberId: string,
    executor: Executor = this.db,
  ): Promise<CampaignEnrollmentRow | null> {
    const rows = await executor
      .select()
      .from(campaignMemberStatuses)
      .where(
        and(
          eq(campaignMemberStatuses.campaignId, campaignId),
          eq(campaignMemberStatuses.memberId, memberId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Locks a member's enrollment row FOR UPDATE within a transaction. */
  public async lock(
    campaignId: string,
    memberId: string,
    executor: Executor,
  ): Promise<CampaignEnrollmentRow | null> {
    const rows = await executor
      .select()
      .from(campaignMemberStatuses)
      .where(
        and(
          eq(campaignMemberStatuses.campaignId, campaignId),
          eq(campaignMemberStatuses.memberId, memberId),
        ),
      )
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }

  public async upsertStatus(
    input: {
      campaignId: string;
      memberId: string;
      status: CampaignMemberStatus;
      enrolledAt?: Date | null;
      createdBy: string | null;
    },
    executor: Executor = this.db,
  ): Promise<CampaignEnrollmentRow> {
    const rows = await executor
      .insert(campaignMemberStatuses)
      .values({
        campaignId: input.campaignId,
        memberId: input.memberId,
        status: input.status,
        enrolledAt: input.enrolledAt ?? null,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .onConflictDoUpdate({
        target: [campaignMemberStatuses.campaignId, campaignMemberStatuses.memberId],
        set: {
          status: input.status,
          ...(input.enrolledAt !== undefined ? { enrolledAt: input.enrolledAt } : {}),
          updatedBy: input.createdBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    const saved = rows[0];
    if (!saved) {
      throw new Error('Enrollment upsert did not return a row.');
    }
    return saved;
  }

  public async markRewarded(
    campaignId: string,
    memberId: string,
    rewardTransactionId: string,
    updatedBy: string | null,
    executor: Executor,
  ): Promise<void> {
    await executor
      .update(campaignMemberStatuses)
      .set({
        status: 'REWARDED',
        rewardedAt: new Date(),
        rewardTransactionId,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(campaignMemberStatuses.campaignId, campaignId),
          eq(campaignMemberStatuses.memberId, memberId),
        ),
      );
  }

  /** Enrolled members not yet rewarded (execution candidates). */
  public async listEnrolledMemberIds(campaignId: string): Promise<string[]> {
    const rows = await this.db
      .select({ memberId: campaignMemberStatuses.memberId })
      .from(campaignMemberStatuses)
      .where(
        and(
          eq(campaignMemberStatuses.campaignId, campaignId),
          eq(campaignMemberStatuses.status, 'ENROLLED'),
        ),
      );
    return rows.map((row) => row.memberId);
  }

  public async listByCampaign(
    campaignId: string,
    query: ListEnrollmentsQuery,
  ): Promise<{ rows: CampaignEnrollmentRow[]; total: number }> {
    const conditions = [eq(campaignMemberStatuses.campaignId, campaignId)];
    if (query.status) {
      conditions.push(eq(campaignMemberStatuses.status, query.status));
    }
    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(campaignMemberStatuses)
      .where(where)
      .orderBy(desc(campaignMemberStatuses.createdAt))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(campaignMemberStatuses)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  public async listByMember(memberId: string): Promise<CampaignEnrollmentRow[]> {
    return this.db
      .select()
      .from(campaignMemberStatuses)
      .where(eq(campaignMemberStatuses.memberId, memberId))
      .orderBy(desc(campaignMemberStatuses.createdAt));
  }

  public async stats(campaignId: string): Promise<CampaignEnrollmentStats> {
    const rows = await this.db
      .select({
        status: campaignMemberStatuses.status,
        value: sql<number>`count(*)::int`,
      })
      .from(campaignMemberStatuses)
      .where(eq(campaignMemberStatuses.campaignId, campaignId))
      .groupBy(campaignMemberStatuses.status);

    const stats: CampaignEnrollmentStats = {
      eligible: 0,
      enrolled: 0,
      rewarded: 0,
      excluded: 0,
      total: 0,
    };
    for (const row of rows) {
      stats.total += row.value;
      if (row.status === 'ELIGIBLE') stats.eligible = row.value;
      else if (row.status === 'ENROLLED') stats.enrolled = row.value;
      else if (row.status === 'REWARDED') stats.rewarded = row.value;
      else if (row.status === 'EXCLUDED') stats.excluded = row.value;
    }
    return stats;
  }
}
