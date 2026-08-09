import { and, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { members } from '@/database/schema';

/** The member fields network operations need for linkage/ownership resolution. */
export interface MemberLink {
  id: string;
  userId: string | null;
}

/** Read-only access to the referenced `members` table (no member business logic). */
export class MemberLookupRepository {
  public constructor(private readonly db: Database) {}

  public async findById(id: string): Promise<MemberLink | null> {
    const rows = await this.db
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
