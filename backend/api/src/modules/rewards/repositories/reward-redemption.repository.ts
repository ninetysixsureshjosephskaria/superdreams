import { desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { rewardRedemptions } from '@/database/schema';
import type { Executor } from '@/database/types';

export type RewardRedemptionRow = InferSelectModel<typeof rewardRedemptions>;

export interface CreateRedemptionInput {
  memberId: string;
  transactionId: string;
  reference: string;
  points: number;
  note: string | null;
  walletTransactionId: string | null;
  processedBy: string | null;
}

/** Persistence for reward redemptions. */
export class RewardRedemptionRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: CreateRedemptionInput,
    executor: Executor = this.db,
  ): Promise<RewardRedemptionRow> {
    const rows = await executor
      .insert(rewardRedemptions)
      .values({
        memberId: input.memberId,
        transactionId: input.transactionId,
        reference: input.reference,
        points: input.points,
        status: 'COMPLETED',
        note: input.note,
        walletTransactionId: input.walletTransactionId,
        processedBy: input.processedBy,
        createdBy: input.processedBy,
        updatedBy: input.processedBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Redemption insert did not return a row.');
    }
    return created;
  }

  public async findById(id: string): Promise<RewardRedemptionRow | null> {
    const rows = await this.db
      .select()
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  public async setWalletTransactionId(id: string, walletTransactionId: string): Promise<void> {
    await this.db
      .update(rewardRedemptions)
      .set({ walletTransactionId, updatedAt: new Date() })
      .where(eq(rewardRedemptions.id, id));
  }

  public async markReversed(id: string, executor: Executor): Promise<void> {
    await executor
      .update(rewardRedemptions)
      .set({ status: 'REVERSED', updatedAt: new Date() })
      .where(eq(rewardRedemptions.id, id));
  }

  public async listByMember(memberId: string): Promise<RewardRedemptionRow[]> {
    return this.db
      .select()
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.memberId, memberId))
      .orderBy(desc(rewardRedemptions.createdAt));
  }
}
