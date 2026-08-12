import { and, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { members } from '@/database/schema';

/** The member fields the submit path needs (resolve the caller's member profile). */
export interface MemberLink {
  id: string;
  userId: string | null;
}

/**
 * Read-only access to the referenced `members` table. Submission requires only a
 * valid (non-deleted) member profile for the authenticated user — P2 applies no
 * member-status gate (per the locked decisions). No member business logic here.
 */
export class RedemptionMemberLookupRepository {
  public constructor(private readonly db: Database) {}

  public async findByUserId(userId: string): Promise<MemberLink | null> {
    const rows = await this.db
      .select({ id: members.id, userId: members.userId })
      .from(members)
      .where(and(eq(members.userId, userId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
