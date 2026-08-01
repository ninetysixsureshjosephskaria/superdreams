import { eq, inArray, sql, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { memberRewards } from '@/database/schema';
import type { Executor } from '@/database/types';

export type MemberRewardRow = InferSelectModel<typeof memberRewards>;

export interface BalanceValues {
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
}

/** Persistence for the 1:1 member reward-points projection. */
export class MemberRewardRepository {
  public constructor(private readonly db: Database) {}

  public async findByMemberId(
    memberId: string,
    executor: Executor = this.db,
  ): Promise<MemberRewardRow | null> {
    const rows = await executor
      .select()
      .from(memberRewards)
      .where(eq(memberRewards.memberId, memberId))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findByMemberIds(memberIds: string[]): Promise<MemberRewardRow[]> {
    if (memberIds.length === 0) {
      return [];
    }
    return this.db.select().from(memberRewards).where(inArray(memberRewards.memberId, memberIds));
  }

  /** Locks the projection row FOR UPDATE within a transaction. */
  public async lockByMemberId(
    memberId: string,
    executor: Executor,
  ): Promise<MemberRewardRow | null> {
    const rows = await executor
      .select()
      .from(memberRewards)
      .where(eq(memberRewards.memberId, memberId))
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }

  public async create(
    memberId: string,
    createdBy: string | null,
    executor: Executor = this.db,
  ): Promise<MemberRewardRow> {
    const rows = await executor
      .insert(memberRewards)
      .values({
        memberId,
        pointsBalance: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Reward account insert did not return a row.');
    }
    return created;
  }

  /** Ensures a projection row exists, returning it (locked when in a transaction). */
  public async ensure(
    memberId: string,
    createdBy: string | null,
    executor: Executor,
  ): Promise<MemberRewardRow> {
    const locked = await this.lockByMemberId(memberId, executor);
    if (locked) {
      return locked;
    }
    await this.create(memberId, createdBy, executor);
    const created = await this.lockByMemberId(memberId, executor);
    if (!created) {
      throw new Error('Failed to create reward account.');
    }
    return created;
  }

  public async setBalance(
    memberId: string,
    values: BalanceValues,
    updatedBy: string | null,
    executor: Executor,
  ): Promise<MemberRewardRow> {
    const rows = await executor
      .update(memberRewards)
      .set({
        pointsBalance: values.pointsBalance,
        lifetimeEarned: values.lifetimeEarned,
        lifetimeRedeemed: values.lifetimeRedeemed,
        updatedBy,
        updatedAt: new Date(),
        version: sql`${memberRewards.version} + 1`,
      })
      .where(eq(memberRewards.memberId, memberId))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error('Reward balance update did not affect any row.');
    }
    return updated;
  }
}
