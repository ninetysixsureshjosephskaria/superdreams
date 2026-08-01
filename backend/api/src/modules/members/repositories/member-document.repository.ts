import { and, desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { memberDocuments } from '@/database/schema';

export type MemberDocumentRow = InferSelectModel<typeof memberDocuments>;

export class MemberDocumentRepository extends BaseRepository<typeof memberDocuments> {
  public constructor(db: Database) {
    super(db, memberDocuments);
  }

  public async listByMember(memberId: string): Promise<MemberDocumentRow[]> {
    return this.db
      .select()
      .from(memberDocuments)
      .where(and(eq(memberDocuments.memberId, memberId), notDeleted(memberDocuments.deletedAt)))
      .orderBy(desc(memberDocuments.createdAt));
  }
}
