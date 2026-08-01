import { and, asc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { memberContacts } from '@/database/schema';

export type MemberContactRow = InferSelectModel<typeof memberContacts>;

/** Read access to member contacts (returned with member details). */
export class MemberContactRepository {
  public constructor(private readonly db: Database) {}

  public async listByMember(memberId: string): Promise<MemberContactRow[]> {
    return this.db
      .select()
      .from(memberContacts)
      .where(and(eq(memberContacts.memberId, memberId), notDeleted(memberContacts.deletedAt)))
      .orderBy(asc(memberContacts.createdAt));
  }
}
