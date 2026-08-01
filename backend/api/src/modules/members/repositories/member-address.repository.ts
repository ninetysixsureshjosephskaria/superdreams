import { and, asc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { memberAddresses } from '@/database/schema';

export type MemberAddressRow = InferSelectModel<typeof memberAddresses>;

/** Read access to member addresses (returned with member details). */
export class MemberAddressRepository {
  public constructor(private readonly db: Database) {}

  public async listByMember(memberId: string): Promise<MemberAddressRow[]> {
    return this.db
      .select()
      .from(memberAddresses)
      .where(and(eq(memberAddresses.memberId, memberId), notDeleted(memberAddresses.deletedAt)))
      .orderBy(asc(memberAddresses.createdAt));
  }
}
