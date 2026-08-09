import { and, asc, desc, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { bonusCampaigns, bonusClaims } from '@/database/schema';
import type { Executor } from '@/database/types';

export type BonusCampaignRow = typeof bonusCampaigns.$inferSelect;
export type BonusClaimRow = typeof bonusClaims.$inferSelect;

export class BonusCampaignRepository {
  public constructor(private readonly db: Database) {}

  public async findById(id: string): Promise<BonusCampaignRow | null> {
    const rows = await this.db
      .select()
      .from(bonusCampaigns)
      .where(and(eq(bonusCampaigns.id, id), notDeleted(bonusCampaigns.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async list(): Promise<BonusCampaignRow[]> {
    return this.db
      .select()
      .from(bonusCampaigns)
      .where(notDeleted(bonusCampaigns.deletedAt))
      .orderBy(desc(bonusCampaigns.createdAt));
  }

  /** Enabled campaigns (LIVE status derived in the service by date window). */
  public async listEnabled(): Promise<BonusCampaignRow[]> {
    return this.db
      .select()
      .from(bonusCampaigns)
      .where(and(eq(bonusCampaigns.enabled, true), notDeleted(bonusCampaigns.deletedAt)))
      .orderBy(asc(bonusCampaigns.createdAt));
  }

  public async create(values: typeof bonusCampaigns.$inferInsert): Promise<BonusCampaignRow> {
    const rows = await this.db.insert(bonusCampaigns).values(values).returning();
    if (!rows[0]) {
      throw new Error('Insert did not return a bonus campaign row.');
    }
    return rows[0];
  }

  public async update(
    id: string,
    values: Partial<typeof bonusCampaigns.$inferInsert>,
  ): Promise<BonusCampaignRow | null> {
    const rows = await this.db
      .update(bonusCampaigns)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(bonusCampaigns.id, id), notDeleted(bonusCampaigns.deletedAt)))
      .returning();
    return rows[0] ?? null;
  }

  public async softDelete(id: string, deletedBy: string | null): Promise<void> {
    await this.db
      .update(bonusCampaigns)
      .set({ deletedAt: new Date(), deletedBy })
      .where(eq(bonusCampaigns.id, id));
  }
}

export class BonusClaimRepository {
  public constructor(private readonly db: Database) {}

  public async findByDedupe(dedupeKey: string): Promise<BonusClaimRow | null> {
    const rows = await this.db
      .select()
      .from(bonusClaims)
      .where(eq(bonusClaims.dedupeKey, dedupeKey))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Whether a member has already claimed a given campaign (SINGLE frequency). */
  public async existsForCampaignMember(campaignId: string, memberId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: bonusClaims.id })
      .from(bonusClaims)
      .where(and(eq(bonusClaims.campaignId, campaignId), eq(bonusClaims.memberId, memberId)))
      .limit(1);
    return rows.length > 0;
  }

  public async create(
    values: typeof bonusClaims.$inferInsert,
    executor: Executor,
  ): Promise<BonusClaimRow> {
    const rows = await executor.insert(bonusClaims).values(values).returning();
    if (!rows[0]) {
      throw new Error('Insert did not return a bonus claim row.');
    }
    return rows[0];
  }

  public async listByMember(memberId: string): Promise<BonusClaimRow[]> {
    return this.db
      .select()
      .from(bonusClaims)
      .where(eq(bonusClaims.memberId, memberId))
      .orderBy(desc(bonusClaims.createdAt));
  }
}
