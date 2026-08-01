import { desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { memberStatusHistory } from '@/database/schema';

import type { MemberStatus } from '../dto';

export type MemberStatusHistoryRow = InferSelectModel<typeof memberStatusHistory>;

export interface StatusHistoryInput {
  memberId: string;
  fromStatus: MemberStatus | null;
  toStatus: MemberStatus;
  reason: string | null;
  changedBy: string | null;
}

/** Append-only member status history. */
export class MemberStatusHistoryRepository {
  public constructor(private readonly db: Database) {}

  public async record(input: StatusHistoryInput): Promise<void> {
    await this.db.insert(memberStatusHistory).values({
      memberId: input.memberId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      reason: input.reason,
      changedBy: input.changedBy,
    });
  }

  public async listByMember(memberId: string): Promise<MemberStatusHistoryRow[]> {
    return this.db
      .select()
      .from(memberStatusHistory)
      .where(eq(memberStatusHistory.memberId, memberId))
      .orderBy(desc(memberStatusHistory.createdAt));
  }
}
