import { desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { rewardHistory } from '@/database/schema';
import type { Executor } from '@/database/types';

export type RewardHistoryRow = InferSelectModel<typeof rewardHistory>;

export interface HistoryInput {
  memberId: string;
  action: string;
  description: string | null;
  actorId: string | null;
}

/** Append-only member reward activity feed. */
export class RewardHistoryRepository {
  public constructor(private readonly db: Database) {}

  public async record(input: HistoryInput, executor: Executor = this.db): Promise<void> {
    await executor.insert(rewardHistory).values({
      memberId: input.memberId,
      action: input.action,
      description: input.description,
      actorId: input.actorId,
    });
  }

  public async listByMember(memberId: string): Promise<RewardHistoryRow[]> {
    return this.db
      .select()
      .from(rewardHistory)
      .where(eq(rewardHistory.memberId, memberId))
      .orderBy(desc(rewardHistory.createdAt));
  }
}
