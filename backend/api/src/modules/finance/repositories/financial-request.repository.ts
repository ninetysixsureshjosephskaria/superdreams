import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { financialRequests } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListRequestsQuery } from '../validators';

const sortColumns = {
  createdAt: financialRequests.createdAt,
  updatedAt: financialRequests.updatedAt,
  amountCents: financialRequests.amountCents,
} as const;

export class FinancialRequestRepository extends BaseRepository<typeof financialRequests> {
  public constructor(db: Database) {
    super(db, financialRequests);
  }

  /**
   * Locks a request row FOR UPDATE inside a transaction so a request cannot be
   * decided twice concurrently (the second waits, then observes the terminal
   * status and is rejected by the service).
   */
  public async lockById(
    id: string,
    executor: Executor,
  ): Promise<typeof financialRequests.$inferSelect | null> {
    const rows = await executor
      .select()
      .from(financialRequests)
      .where(and(eq(financialRequests.id, id), notDeleted(financialRequests.deletedAt)))
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }

  /** Paginated admin action-queue search + filter + sort. */
  public async search(
    query: ListRequestsQuery,
  ): Promise<{ rows: (typeof financialRequests.$inferSelect)[]; total: number }> {
    const conditions: SQL[] = [notDeleted(financialRequests.deletedAt)];
    if (query.type) {
      conditions.push(eq(financialRequests.type, query.type));
    }
    if (query.status) {
      conditions.push(eq(financialRequests.status, query.status));
    }
    if (query.memberId) {
      conditions.push(eq(financialRequests.memberId, query.memberId));
    }

    const where = and(...conditions);
    const direction = query.order === 'asc' ? asc : desc;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(financialRequests)
      .where(where)
      .orderBy(direction(sortColumns[query.sortBy]))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(financialRequests)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  /** All requests for a member, newest first (portal history). */
  public async findByMemberId(
    memberId: string,
  ): Promise<(typeof financialRequests.$inferSelect)[]> {
    return this.db
      .select()
      .from(financialRequests)
      .where(and(eq(financialRequests.memberId, memberId), notDeleted(financialRequests.deletedAt)))
      .orderBy(desc(financialRequests.createdAt));
  }
}
