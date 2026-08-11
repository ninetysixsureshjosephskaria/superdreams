import { and, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { members } from '@/database/schema';
import type { Executor } from '@/database/types';

/** The member fields eligibility decisions need (status + login linkage). */
export interface MemberEligibility {
  id: string;
  userId: string | null;
  status: string;
}

/**
 * Read-only access to the referenced `members` table. Returns `status` (unlike
 * the network module's lookup) because Partner eligibility is ACTIVE-gated. No
 * member business logic lives here. Each read accepts an optional `executor` so
 * the in-transaction eligibility re-check reads through the caller's transaction.
 */
export class PartnerMemberLookupRepository {
  public constructor(private readonly db: Database) {}

  public async findById(
    id: string,
    executor: Executor = this.db,
  ): Promise<MemberEligibility | null> {
    const rows = await executor
      .select({ id: members.id, userId: members.userId, status: members.status })
      .from(members)
      .where(and(eq(members.id, id), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findByUserId(
    userId: string,
    executor: Executor = this.db,
  ): Promise<MemberEligibility | null> {
    const rows = await executor
      .select({ id: members.id, userId: members.userId, status: members.status })
      .from(members)
      .where(and(eq(members.userId, userId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
