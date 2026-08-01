import { eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import {
  campaignRewards,
  campaignRules,
  campaignSchedules,
  campaignTargets,
} from '@/database/schema';
import type { Executor } from '@/database/types';

import type { CampaignRuleType, CampaignScheduleType } from '../dto';

export type CampaignRuleRow = InferSelectModel<typeof campaignRules>;
export type CampaignRewardRow = InferSelectModel<typeof campaignRewards>;
export type CampaignScheduleRow = InferSelectModel<typeof campaignSchedules>;
export type CampaignTargetRow = InferSelectModel<typeof campaignTargets>;

/** Persistence for a campaign's eligibility rules. */
export class CampaignRuleRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: {
      campaignId: string;
      type: CampaignRuleType;
      value: string | null;
      createdBy: string | null;
    },
    executor: Executor = this.db,
  ): Promise<CampaignRuleRow> {
    const rows = await executor
      .insert(campaignRules)
      .values({
        campaignId: input.campaignId,
        type: input.type,
        value: input.value,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Rule insert did not return a row.');
    }
    return created;
  }

  public async listByCampaign(
    campaignId: string,
    executor: Executor = this.db,
  ): Promise<CampaignRuleRow[]> {
    return executor.select().from(campaignRules).where(eq(campaignRules.campaignId, campaignId));
  }

  public async deleteByCampaign(campaignId: string, executor: Executor): Promise<void> {
    await executor.delete(campaignRules).where(eq(campaignRules.campaignId, campaignId));
  }
}

/** Persistence for a campaign's reward mapping (0..1 per campaign). */
export class CampaignRewardRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: {
      campaignId: string;
      rewardProgramId: string | null;
      points: number;
      description: string | null;
      createdBy: string | null;
    },
    executor: Executor = this.db,
  ): Promise<CampaignRewardRow> {
    const rows = await executor
      .insert(campaignRewards)
      .values({
        campaignId: input.campaignId,
        rewardProgramId: input.rewardProgramId,
        points: input.points,
        description: input.description,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Campaign reward insert did not return a row.');
    }
    return created;
  }

  public async findByCampaign(
    campaignId: string,
    executor: Executor = this.db,
  ): Promise<CampaignRewardRow | null> {
    const rows = await executor
      .select()
      .from(campaignRewards)
      .where(eq(campaignRewards.campaignId, campaignId))
      .limit(1);
    return rows[0] ?? null;
  }

  public async deleteByCampaign(campaignId: string, executor: Executor): Promise<void> {
    await executor.delete(campaignRewards).where(eq(campaignRewards.campaignId, campaignId));
  }
}

/** Persistence for a campaign's schedule (0..1 per campaign). */
export class CampaignScheduleRepository {
  public constructor(private readonly db: Database) {}

  public async upsert(
    input: {
      campaignId: string;
      scheduleType: CampaignScheduleType;
      startAt: Date | null;
      endAt: Date | null;
      recurrenceCron: string | null;
      timezone: string | null;
      createdBy: string | null;
    },
    executor: Executor = this.db,
  ): Promise<CampaignScheduleRow> {
    const rows = await executor
      .insert(campaignSchedules)
      .values({
        campaignId: input.campaignId,
        scheduleType: input.scheduleType,
        startAt: input.startAt,
        endAt: input.endAt,
        recurrenceCron: input.recurrenceCron,
        timezone: input.timezone,
        nextRunAt: input.startAt,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .onConflictDoUpdate({
        target: campaignSchedules.campaignId,
        set: {
          scheduleType: input.scheduleType,
          startAt: input.startAt,
          endAt: input.endAt,
          recurrenceCron: input.recurrenceCron,
          timezone: input.timezone,
          nextRunAt: input.startAt,
          updatedBy: input.createdBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    const saved = rows[0];
    if (!saved) {
      throw new Error('Schedule upsert did not return a row.');
    }
    return saved;
  }

  public async findByCampaign(campaignId: string): Promise<CampaignScheduleRow | null> {
    const rows = await this.db
      .select()
      .from(campaignSchedules)
      .where(eq(campaignSchedules.campaignId, campaignId))
      .limit(1);
    return rows[0] ?? null;
  }
}

/** Persistence for explicit member targets (MANUAL audience). */
export class CampaignTargetRepository {
  public constructor(private readonly db: Database) {}

  public async add(
    campaignId: string,
    memberId: string,
    createdBy: string | null,
    executor: Executor = this.db,
  ): Promise<void> {
    await executor
      .insert(campaignTargets)
      .values({ campaignId, memberId, createdBy, updatedBy: createdBy })
      .onConflictDoNothing();
  }

  public async listByCampaign(campaignId: string): Promise<CampaignTargetRow[]> {
    return this.db.select().from(campaignTargets).where(eq(campaignTargets.campaignId, campaignId));
  }
}
