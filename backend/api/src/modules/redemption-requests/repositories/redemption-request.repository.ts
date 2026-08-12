import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { redemptionRequests } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListRedemptionRequestsQuery } from '../validators';

export type RedemptionRequestRow = typeof redemptionRequests.$inferSelect;

/**
 * Persistence for member points-redemption requests. Extends the shared base
 * repository (create/update/findById/softDelete with soft-delete + version
 * conventions) and adds the pending-lookup, latest-lookup, row-lock and search
 * primitives the service needs. Contains no business rules.
 */
export class RedemptionRequestRepository extends BaseRepository<typeof redemptionRequests> {
  public constructor(db: Database) {
    super(db, redemptionRequests);
  }

  /** The single active (PENDING) request for a member, if any. */
  public async findPendingByMemberId(
    memberId: string,
    executor: Executor = this.db,
  ): Promise<RedemptionRequestRow | null> {
    const rows = await executor
      .select()
      .from(redemptionRequests)
      .where(
        and(
          eq(redemptionRequests.memberId, memberId),
          eq(redemptionRequests.status, 'PENDING'),
          notDeleted(redemptionRequests.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** The member's most recent request (any status) — for the self "my request" view. */
  public async findLatestByMemberId(memberId: string): Promise<RedemptionRequestRow | null> {
    const rows = await this.db
      .select()
      .from(redemptionRequests)
      .where(
        and(eq(redemptionRequests.memberId, memberId), notDeleted(redemptionRequests.deletedAt)),
      )
      .orderBy(desc(redemptionRequests.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Locks a request row FOR UPDATE so approve/reject decisions cannot race. */
  public async lockById(id: string, executor: Executor): Promise<RedemptionRequestRow | null> {
    const rows = await executor
      .select()
      .from(redemptionRequests)
      .where(and(eq(redemptionRequests.id, id), notDeleted(redemptionRequests.deletedAt)))
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }

  /** Admin list with optional status filter and offset pagination. */
  public async search(
    query: ListRedemptionRequestsQuery,
  ): Promise<{ rows: RedemptionRequestRow[]; total: number }> {
    const conditions: SQL[] = [notDeleted(redemptionRequests.deletedAt)];
    if (query.status) {
      conditions.push(eq(redemptionRequests.status, query.status));
    }
    const where = and(...conditions);
    const direction = query.order === 'asc' ? asc : desc;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(redemptionRequests)
      .where(where)
      .orderBy(direction(redemptionRequests.createdAt))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(redemptionRequests)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}
