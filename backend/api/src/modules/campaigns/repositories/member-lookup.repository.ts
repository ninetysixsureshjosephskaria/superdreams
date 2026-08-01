import { and, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { members } from '@/database/schema';

import type { MemberStatus } from '../dto';

/** The member facts campaigns need for linkage, ownership and eligibility. */
export interface MemberLink {
  id: string;
  userId: string | null;
  status: MemberStatus;
  joinedAt: Date;
}

/**
 * Read-only, persistence-layer access to the referenced `members` table — used
 * to validate campaign→member links, resolve portal ownership, and supply facts
 * to the eligibility engine. Holds no member business logic (that stays in the
 * Member module).
 */
export class MemberLookupRepository {
  public constructor(private readonly db: Database) {}

  public async findById(id: string): Promise<MemberLink | null> {
    const rows = await this.db
      .select({
        id: members.id,
        userId: members.userId,
        status: members.status,
        joinedAt: members.joinedAt,
      })
      .from(members)
      .where(and(eq(members.id, id), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findByUserId(userId: string): Promise<MemberLink | null> {
    const rows = await this.db
      .select({
        id: members.id,
        userId: members.userId,
        status: members.status,
        joinedAt: members.joinedAt,
      })
      .from(members)
      .where(and(eq(members.userId, userId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
