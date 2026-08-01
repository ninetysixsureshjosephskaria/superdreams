import { desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { memberActivityLogs } from '@/database/schema';

export type MemberActivityRow = InferSelectModel<typeof memberActivityLogs>;

export interface ActivityInput {
  memberId: string;
  action: string;
  description: string | null;
  actorId: string | null;
}

/** Append-only member activity feed. */
export class MemberActivityRepository {
  public constructor(private readonly db: Database) {}

  public async record(input: ActivityInput): Promise<void> {
    await this.db.insert(memberActivityLogs).values({
      memberId: input.memberId,
      action: input.action,
      description: input.description,
      actorId: input.actorId,
    });
  }

  public async listByMember(memberId: string): Promise<MemberActivityRow[]> {
    return this.db
      .select()
      .from(memberActivityLogs)
      .where(eq(memberActivityLogs.memberId, memberId))
      .orderBy(desc(memberActivityLogs.createdAt));
  }
}
