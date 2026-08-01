import { eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { rewardAdjustments } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { RewardDirection } from '../dto';

export type RewardAdjustmentRow = InferSelectModel<typeof rewardAdjustments>;

export interface CreateAdjustmentInput {
  memberId: string;
  transactionId: string;
  direction: RewardDirection;
  points: number;
  reason: string;
  approvedBy: string | null;
}

/** Persistence for manual reward adjustments. */
export class RewardAdjustmentRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: CreateAdjustmentInput,
    executor: Executor = this.db,
  ): Promise<RewardAdjustmentRow> {
    const rows = await executor
      .insert(rewardAdjustments)
      .values({
        memberId: input.memberId,
        transactionId: input.transactionId,
        direction: input.direction,
        points: input.points,
        reason: input.reason,
        approvedBy: input.approvedBy,
        createdBy: input.approvedBy,
        updatedBy: input.approvedBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Adjustment insert did not return a row.');
    }
    return created;
  }

  public async listByMember(memberId: string): Promise<RewardAdjustmentRow[]> {
    return this.db.select().from(rewardAdjustments).where(eq(rewardAdjustments.memberId, memberId));
  }
}
