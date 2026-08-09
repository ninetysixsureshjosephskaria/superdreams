import { and, asc, desc, eq, lte } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { depositTranches } from '@/database/schema';
import type { Executor } from '@/database/types';

export type DepositTrancheRow = typeof depositTranches.$inferSelect;

export class DepositTrancheRepository extends BaseRepository<typeof depositTranches> {
  public constructor(db: Database) {
    super(db, depositTranches);
  }

  /** All tranches for a member, newest first (portal history). */
  public async findByMemberId(memberId: string): Promise<DepositTrancheRow[]> {
    return this.db
      .select()
      .from(depositTranches)
      .where(and(eq(depositTranches.memberId, memberId), notDeleted(depositTranches.deletedAt)))
      .orderBy(desc(depositTranches.createdAt));
  }

  /** LOCKED tranches whose maturity date has passed (maturity job candidates). */
  public async findMaturable(asOf: Date, limit = 500): Promise<DepositTrancheRow[]> {
    return this.db
      .select()
      .from(depositTranches)
      .where(
        and(
          eq(depositTranches.status, 'LOCKED'),
          lte(depositTranches.maturesAt, asOf),
          notDeleted(depositTranches.deletedAt),
        ),
      )
      .orderBy(asc(depositTranches.maturesAt))
      .limit(limit);
  }

  /** The tranche created for a given deposit request (bonus-campaign integration). */
  public async findByDepositRequestId(depositRequestId: string): Promise<DepositTrancheRow | null> {
    const rows = await this.db
      .select()
      .from(depositTranches)
      .where(
        and(
          eq(depositTranches.depositRequestId, depositRequestId),
          notDeleted(depositTranches.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Locks a tranche row FOR UPDATE so maturity/early-unlock cannot race. */
  public async lockById(id: string, executor: Executor): Promise<DepositTrancheRow | null> {
    const rows = await executor
      .select()
      .from(depositTranches)
      .where(and(eq(depositTranches.id, id), notDeleted(depositTranches.deletedAt)))
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }
}
