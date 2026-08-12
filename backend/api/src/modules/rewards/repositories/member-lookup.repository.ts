import { and, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { members } from '@/database/schema';
import type { Executor } from '@/database/types';

/** The member fields the rewards module needs for linkage and ownership. */
export interface MemberLink {
  id: string;
  userId: string | null;
}

/**
 * Read-only, persistence-layer access to the referenced `members` table — used
 * only to validate the reward→member foreign key and to resolve ownership for
 * the portal. Holds no member business logic (that stays in the Member module).
 */
export class MemberLookupRepository {
  public constructor(private readonly db: Database) {}

  public async findById(id: string, executor: Executor = this.db): Promise<MemberLink | null> {
    const rows = await executor
      .select({ id: members.id, userId: members.userId })
      .from(members)
      .where(and(eq(members.id, id), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findByUserId(userId: string): Promise<MemberLink | null> {
    const rows = await this.db
      .select({ id: members.id, userId: members.userId })
      .from(members)
      .where(and(eq(members.userId, userId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
