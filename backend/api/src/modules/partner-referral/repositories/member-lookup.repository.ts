import { and, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { members } from '@/database/schema';
import type { Executor } from '@/database/types';

/**
 * The earner + its direct Partner, resolved in a single self-join on `members`.
 * Partner fields are `null` when the earner has no `partnerId` (top-level member).
 */
export interface EarnerPartnerRelation {
  earnerId: string;
  partnerMemberId: string | null;
  partnerUserId: string | null;
  partnerStatus: string | null;
  partnerDeletedAt: Date | null;
}

/**
 * Read-only access to the `members` graph for referral resolution. Resolves the
 * earner's DIRECT partner only — the immediate `partnerId` link, never any upline
 * beyond it (single-level; no multi-level propagation). No member business logic
 * lives here.
 */
export class ReferralMemberLookupRepository {
  public constructor(private readonly db: Database) {}

  public async findEarnerWithPartner(
    earnerMemberId: string,
    executor: Executor = this.db,
  ): Promise<EarnerPartnerRelation | null> {
    const partner = alias(members, 'partner');
    const rows = await executor
      .select({
        earnerId: members.id,
        partnerMemberId: members.partnerId,
        partnerUserId: partner.userId,
        partnerStatus: partner.status,
        partnerDeletedAt: partner.deletedAt,
      })
      .from(members)
      .leftJoin(partner, eq(partner.id, members.partnerId))
      .where(and(eq(members.id, earnerMemberId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
