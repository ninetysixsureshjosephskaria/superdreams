import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { members } from '@/database/schema';
import type { Executor } from '@/database/types';

/** Non-sensitive member fields used to build network/referral views. */
export interface MemberBrief {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  referredBy: string | null;
  partnerId: string | null;
}

const briefColumns = {
  id: members.id,
  memberNumber: members.memberNumber,
  firstName: members.firstName,
  lastName: members.lastName,
  email: members.email,
  status: members.status,
  referredBy: members.referredBy,
  partnerId: members.partnerId,
} as const;

/**
 * Read/relationship access for the network graph. The downline is walked
 * breadth-first in application code via {@link childrenOf} (driver-agnostic, no
 * raw recursive SQL), which is safe for the platform's network sizes.
 */
export class NetworkRepository {
  public constructor(private readonly db: Database) {}

  public async findBrief(id: string): Promise<MemberBrief | null> {
    const rows = await this.db
      .select(briefColumns)
      .from(members)
      .where(and(eq(members.id, id), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Direct referrals of a member (immediate downline). */
  public async directReferrals(memberId: string): Promise<MemberBrief[]> {
    return this.db
      .select(briefColumns)
      .from(members)
      .where(and(eq(members.referredBy, memberId), notDeleted(members.deletedAt)));
  }

  /** All members directly referred by any id in `parentIds` (one BFS level). */
  public async childrenOf(parentIds: string[]): Promise<MemberBrief[]> {
    if (parentIds.length === 0) {
      return [];
    }
    return this.db
      .select(briefColumns)
      .from(members)
      .where(and(inArray(members.referredBy, parentIds), notDeleted(members.deletedAt)));
  }

  /** Count of members whose partner is `partnerId` (a partner's direct members). */
  public async countDirectMembersOf(partnerId: string): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(members)
      .where(and(eq(members.partnerId, partnerId), notDeleted(members.deletedAt)));
    return rows[0]?.value ?? 0;
  }

  /** Count of direct referrals of a member. */
  public async countDirectReferrals(memberId: string): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(members)
      .where(and(eq(members.referredBy, memberId), notDeleted(members.deletedAt)));
    return rows[0]?.value ?? 0;
  }

  /**
   * Distinct member ids that are referenced as some member's partner — i.e. the
   * partners that currently have at least one direct member (the network tree's
   * partner cards). Partner role assignment (make-partner) lands in Phase 2E; for
   * now partners are derived from the relationship graph.
   */
  public async distinctPartnerIds(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ partnerId: members.partnerId })
      .from(members)
      .where(and(isNotNull(members.partnerId), notDeleted(members.deletedAt)));
    return rows.map((r) => r.partnerId).filter((id): id is string => id !== null);
  }

  public async findBriefByIds(ids: string[]): Promise<MemberBrief[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.db
      .select(briefColumns)
      .from(members)
      .where(and(inArray(members.id, ids), notDeleted(members.deletedAt)));
  }

  /** Sets a member's network relationship fields (invite acceptance). */
  public async updateRelationship(
    memberId: string,
    values: { referredBy?: string | null; partnerId?: string | null; updatedBy: string | null },
    executor: Executor,
  ): Promise<void> {
    await executor
      .update(members)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(members.id, memberId));
  }
}
