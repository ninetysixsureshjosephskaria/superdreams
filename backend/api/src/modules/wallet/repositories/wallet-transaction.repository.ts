import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  sql,
  type InferSelectModel,
  type SQL,
} from 'drizzle-orm';

import type { Database } from '@/database/client';
import { walletTransactions } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListTransactionsQuery, TransactionDirection, TransactionType } from '../dto';

export type WalletTransactionRow = InferSelectModel<typeof walletTransactions>;

export interface AppendTransactionInput {
  walletId: string;
  reference: string;
  type: TransactionType;
  direction: TransactionDirection;
  amountMinor: number;
  currencyCode: string;
  availableAfterMinor: number;
  heldAfterMinor: number;
  description?: string | null;
  holdId?: string | null;
  reversalOfId?: string | null;
  createdBy: string | null;
}

const sortColumns = {
  createdAt: walletTransactions.createdAt,
  amountMinor: walletTransactions.amountMinor,
} as const;

/** Append-only ledger persistence. Entries are never deleted. */
export class WalletTransactionRepository {
  public constructor(private readonly db: Database) {}

  /** Appends a ledger entry. */
  public async append(
    input: AppendTransactionInput,
    executor: Executor = this.db,
  ): Promise<WalletTransactionRow> {
    const rows = await executor
      .insert(walletTransactions)
      .values({
        walletId: input.walletId,
        reference: input.reference,
        type: input.type,
        direction: input.direction,
        status: 'POSTED',
        amountMinor: input.amountMinor,
        currencyCode: input.currencyCode,
        availableAfterMinor: input.availableAfterMinor,
        heldAfterMinor: input.heldAfterMinor,
        description: input.description ?? null,
        holdId: input.holdId ?? null,
        reversalOfId: input.reversalOfId ?? null,
        createdBy: input.createdBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Ledger append did not return a row.');
    }
    return created;
  }

  public async findById(
    id: string,
    executor: Executor = this.db,
  ): Promise<WalletTransactionRow | null> {
    const rows = await executor
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Flags an original entry as REVERSED for traceability. This is the only
   * permitted mutation of a ledger row and never touches its financial fields
   * (type, direction, amount) — the compensating REVERSAL entry carries the
   * balance effect.
   */
  public async markReversed(id: string, executor: Executor): Promise<void> {
    await executor
      .update(walletTransactions)
      .set({ status: 'REVERSED' })
      .where(eq(walletTransactions.id, id));
  }

  /** All entries for a wallet in chronological order (used for balance re-derivation). */
  public async listAllByWallet(
    walletId: string,
    executor: Executor = this.db,
  ): Promise<WalletTransactionRow[]> {
    return executor
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(asc(walletTransactions.createdAt), asc(walletTransactions.id));
  }

  /** Entries for a wallet within a period (inclusive), chronological. */
  public async listInPeriod(
    walletId: string,
    from: Date,
    to: Date,
    executor: Executor = this.db,
  ): Promise<WalletTransactionRow[]> {
    return executor
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.walletId, walletId),
          gte(walletTransactions.createdAt, from),
          lte(walletTransactions.createdAt, to),
        ),
      )
      .orderBy(asc(walletTransactions.createdAt), asc(walletTransactions.id));
  }

  /** Paginated, filtered ledger view. */
  public async search(
    walletId: string,
    query: ListTransactionsQuery,
  ): Promise<{ rows: WalletTransactionRow[]; total: number }> {
    const conditions: SQL[] = [eq(walletTransactions.walletId, walletId)];

    if (query.type) {
      conditions.push(eq(walletTransactions.type, query.type));
    }
    if (query.direction) {
      conditions.push(eq(walletTransactions.direction, query.direction));
    }
    if (query.status) {
      conditions.push(eq(walletTransactions.status, query.status));
    }
    if (query.search) {
      conditions.push(ilike(walletTransactions.reference, `%${query.search}%`));
    }
    if (query.dateFrom) {
      conditions.push(gte(walletTransactions.createdAt, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      conditions.push(lte(walletTransactions.createdAt, new Date(query.dateTo)));
    }
    if (query.minAmountMinor !== undefined) {
      conditions.push(gte(walletTransactions.amountMinor, query.minAmountMinor));
    }
    if (query.maxAmountMinor !== undefined) {
      conditions.push(lte(walletTransactions.amountMinor, query.maxAmountMinor));
    }

    const where = and(...conditions);
    const direction = query.order === 'asc' ? asc : desc;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(walletTransactions)
      .where(where)
      .orderBy(direction(sortColumns[query.sortBy]))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(walletTransactions)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}
