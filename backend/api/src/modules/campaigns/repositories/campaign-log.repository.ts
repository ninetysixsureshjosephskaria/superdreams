import { desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { campaignExecutions, campaignHistory } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ExecutionStatus } from '../dto';

export type CampaignExecutionRow = InferSelectModel<typeof campaignExecutions>;
export type CampaignHistoryRow = InferSelectModel<typeof campaignHistory>;

/** Append-only log of campaign execution runs. */
export class CampaignExecutionRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: {
      campaignId: string;
      status: ExecutionStatus;
      membersTargeted: number;
      rewardsIssued: number;
      pointsIssued: number;
      error: string | null;
      executedBy: string | null;
    },
    executor: Executor = this.db,
  ): Promise<CampaignExecutionRow> {
    const rows = await executor
      .insert(campaignExecutions)
      .values({
        campaignId: input.campaignId,
        status: input.status,
        membersTargeted: input.membersTargeted,
        rewardsIssued: input.rewardsIssued,
        pointsIssued: input.pointsIssued,
        error: input.error,
        executedBy: input.executedBy,
        completedAt: new Date(),
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Execution insert did not return a row.');
    }
    return created;
  }

  public async listByCampaign(campaignId: string): Promise<CampaignExecutionRow[]> {
    return this.db
      .select()
      .from(campaignExecutions)
      .where(eq(campaignExecutions.campaignId, campaignId))
      .orderBy(desc(campaignExecutions.startedAt));
  }
}

/** Append-only campaign activity feed. */
export class CampaignHistoryRepository {
  public constructor(private readonly db: Database) {}

  public async record(
    input: {
      campaignId: string;
      action: string;
      description: string | null;
      actorId: string | null;
    },
    executor: Executor = this.db,
  ): Promise<void> {
    await executor.insert(campaignHistory).values({
      campaignId: input.campaignId,
      action: input.action,
      description: input.description,
      actorId: input.actorId,
    });
  }

  public async listByCampaign(campaignId: string): Promise<CampaignHistoryRow[]> {
    return this.db
      .select()
      .from(campaignHistory)
      .where(eq(campaignHistory.campaignId, campaignId))
      .orderBy(desc(campaignHistory.createdAt));
  }
}
