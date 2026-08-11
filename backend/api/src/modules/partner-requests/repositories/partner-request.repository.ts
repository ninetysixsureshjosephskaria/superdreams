import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { partnerRequests } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListPartnerRequestsQuery } from '../validators';

export type PartnerRequestRow = typeof partnerRequests.$inferSelect;

/**
 * Persistence for Member→Partner upgrade requests. Extends the shared base
 * repository (create/update/findById/softDelete with soft-delete + version
 * conventions) and adds the pending-lookup, latest-lookup, row-lock and search
 * primitives the service needs. Contains no business rules.
 */
export class PartnerRequestRepository extends BaseRepository<typeof partnerRequests> {
  public constructor(db: Database) {
    super(db, partnerRequests);
  }

  /** The single active (PENDING) request for a member, if any. */
  public async findPendingByMemberId(
    memberId: string,
    executor: Executor = this.db,
  ): Promise<PartnerRequestRow | null> {
    const rows = await executor
      .select()
      .from(partnerRequests)
      .where(
        and(
          eq(partnerRequests.memberId, memberId),
          eq(partnerRequests.status, 'PENDING'),
          notDeleted(partnerRequests.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** The member's most recent request (any status) — for the self "my request" view. */
  public async findLatestByMemberId(memberId: string): Promise<PartnerRequestRow | null> {
    const rows = await this.db
      .select()
      .from(partnerRequests)
      .where(and(eq(partnerRequests.memberId, memberId), notDeleted(partnerRequests.deletedAt)))
      .orderBy(desc(partnerRequests.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Locks a request row FOR UPDATE so approve/reject decisions cannot race. */
  public async lockById(id: string, executor: Executor): Promise<PartnerRequestRow | null> {
    const rows = await executor
      .select()
      .from(partnerRequests)
      .where(and(eq(partnerRequests.id, id), notDeleted(partnerRequests.deletedAt)))
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }

  /** Admin list with optional status filter and offset pagination. */
  public async search(
    query: ListPartnerRequestsQuery,
  ): Promise<{ rows: PartnerRequestRow[]; total: number }> {
    const conditions: SQL[] = [notDeleted(partnerRequests.deletedAt)];
    if (query.status) {
      conditions.push(eq(partnerRequests.status, query.status));
    }
    const where = and(...conditions);
    const direction = query.order === 'asc' ? asc : desc;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(partnerRequests)
      .where(where)
      .orderBy(direction(partnerRequests.createdAt))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(partnerRequests)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}
