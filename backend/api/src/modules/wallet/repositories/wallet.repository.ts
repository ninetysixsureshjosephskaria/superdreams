import { and, asc, desc, eq, ilike, or, sql, type InferSelectModel, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { wallets, type WalletKind } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListWalletsQuery } from '../dto';

export type WalletRow = InferSelectModel<typeof wallets>;

const sortColumns = {
  createdAt: wallets.createdAt,
  updatedAt: wallets.updatedAt,
  openedAt: wallets.openedAt,
  status: wallets.status,
  walletNumber: wallets.walletNumber,
} as const;

export class WalletRepository extends BaseRepository<typeof wallets> {
  public constructor(db: Database) {
    super(db, wallets);
  }

  public async findByNumber(walletNumber: string): Promise<WalletRow | null> {
    const rows = await this.db
      .select()
      .from(wallets)
      .where(and(eq(wallets.walletNumber, walletNumber), notDeleted(wallets.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Finds a member's wallet of the given kind. Defaults to LOYALTY so every
   * existing caller (rewards / dream-store / games / member-me) keeps resolving
   * the original points wallet unchanged.
   */
  public async findByMemberId(
    memberId: string,
    kind: WalletKind = 'LOYALTY',
  ): Promise<WalletRow | null> {
    const rows = await this.db
      .select()
      .from(wallets)
      .where(
        and(eq(wallets.memberId, memberId), eq(wallets.kind, kind), notDeleted(wallets.deletedAt)),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Locks a wallet row FOR UPDATE inside a transaction, serialising concurrent
   * balance-changing operations on the same wallet.
   */
  public async lockById(id: string, executor: Executor): Promise<WalletRow | null> {
    const rows = await executor
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, id), notDeleted(wallets.deletedAt)))
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }

  /** Paginated search + filter + sort. All params are already validated. */
  public async search(query: ListWalletsQuery): Promise<{ rows: WalletRow[]; total: number }> {
    const conditions: SQL[] = [notDeleted(wallets.deletedAt)];

    if (query.status) {
      conditions.push(eq(wallets.status, query.status));
    }
    if (query.currencyCode) {
      conditions.push(eq(wallets.currencyCode, query.currencyCode));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      const searchCondition = or(
        ilike(wallets.walletNumber, term),
        sql`${wallets.memberId}::text ILIKE ${term}`,
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const where = and(...conditions);
    const direction = query.order === 'asc' ? asc : desc;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(wallets)
      .where(where)
      .orderBy(direction(sortColumns[query.sortBy]))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(wallets)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}
