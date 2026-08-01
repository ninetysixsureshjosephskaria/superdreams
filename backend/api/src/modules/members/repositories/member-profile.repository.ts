import { and, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { memberProfiles } from '@/database/schema';

export type MemberProfileRow = InferSelectModel<typeof memberProfiles>;

export class MemberProfileRepository extends BaseRepository<typeof memberProfiles> {
  public constructor(db: Database) {
    super(db, memberProfiles);
  }

  public async findByMemberId(memberId: string): Promise<MemberProfileRow | null> {
    const rows = await this.db
      .select()
      .from(memberProfiles)
      .where(and(eq(memberProfiles.memberId, memberId), notDeleted(memberProfiles.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
