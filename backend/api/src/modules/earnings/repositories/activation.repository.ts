import { and, eq, isNotNull } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { activationBonusConfig, activationBonusGrants, members } from '@/database/schema';
import type { Executor } from '@/database/types';

export type ActivationConfigRow = typeof activationBonusConfig.$inferSelect;
export type ActivationGrantRow = typeof activationBonusGrants.$inferSelect;

export class ActivationConfigRepository {
  public constructor(private readonly db: Database) {}

  public async getOrCreate(createdBy: string | null): Promise<ActivationConfigRow> {
    const existing = await this.db
      .select()
      .from(activationBonusConfig)
      .where(eq(activationBonusConfig.singleton, 'SINGLETON'))
      .limit(1);
    if (existing[0]) {
      return existing[0];
    }
    try {
      const rows = await this.db
        .insert(activationBonusConfig)
        .values({ singleton: 'SINGLETON', createdBy, updatedBy: createdBy })
        .returning();
      if (rows[0]) {
        return rows[0];
      }
    } catch {
      // Concurrent insert — re-read below.
    }
    const row = (
      await this.db
        .select()
        .from(activationBonusConfig)
        .where(eq(activationBonusConfig.singleton, 'SINGLETON'))
        .limit(1)
    )[0];
    if (!row) {
      throw new Error('Failed to materialise activation bonus config.');
    }
    return row;
  }

  public async update(
    values: Partial<typeof activationBonusConfig.$inferInsert>,
  ): Promise<ActivationConfigRow | null> {
    const rows = await this.db
      .update(activationBonusConfig)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(activationBonusConfig.singleton, 'SINGLETON'))
      .returning();
    return rows[0] ?? null;
  }
}

export class ActivationGrantRepository {
  public constructor(private readonly db: Database) {}

  public async findByMember(memberId: string): Promise<ActivationGrantRow | null> {
    const rows = await this.db
      .select()
      .from(activationBonusGrants)
      .where(eq(activationBonusGrants.memberId, memberId))
      .limit(1);
    return rows[0] ?? null;
  }

  public async create(
    values: typeof activationBonusGrants.$inferInsert,
    executor: Executor,
  ): Promise<ActivationGrantRow> {
    const rows = await executor.insert(activationBonusGrants).values(values).returning();
    if (!rows[0]) {
      throw new Error('Insert did not return an activation grant row.');
    }
    return rows[0];
  }
}

/**
 * Reads referral join times for the activation trigger. NOTE: the project stores
 * no dedicated "referred-at" timestamp, so the referred member's `created_at`
 * (record creation ≈ join) is used as the join instant — flagged in the module docs.
 */
export class ReferralJoinRepository {
  public constructor(private readonly db: Database) {}

  public async joinTimesFor(recruiterMemberId: string): Promise<Date[]> {
    const rows = await this.db
      .select({ createdAt: members.createdAt })
      .from(members)
      .where(and(eq(members.referredBy, recruiterMemberId), notDeleted(members.deletedAt)));
    return rows.map((r) => r.createdAt);
  }

  /** A member's lifecycle status (the recruiter must be ACTIVE to qualify). */
  public async memberStatus(memberId: string): Promise<string | null> {
    const rows = await this.db
      .select({ status: members.status })
      .from(members)
      .where(and(eq(members.id, memberId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0]?.status ?? null;
  }

  public async distinctRecruiters(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ referredBy: members.referredBy })
      .from(members)
      .where(and(isNotNull(members.referredBy), notDeleted(members.deletedAt)));
    return rows.map((r) => r.referredBy).filter((id): id is string => id !== null);
  }
}
