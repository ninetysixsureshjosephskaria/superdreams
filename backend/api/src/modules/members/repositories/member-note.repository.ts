import { and, desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { memberNotes } from '@/database/schema';

export type MemberNoteRow = InferSelectModel<typeof memberNotes>;

export class MemberNoteRepository extends BaseRepository<typeof memberNotes> {
  public constructor(db: Database) {
    super(db, memberNotes);
  }

  public async listByMember(memberId: string): Promise<MemberNoteRow[]> {
    return this.db
      .select()
      .from(memberNotes)
      .where(and(eq(memberNotes.memberId, memberId), notDeleted(memberNotes.deletedAt)))
      .orderBy(desc(memberNotes.createdAt));
  }
}
