import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  sql,
  type InferSelectModel,
  type SQL,
} from 'drizzle-orm';

import type { Database } from '@/database/client';
import { rewardTransactions } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListTransactionsQuery, RewardDirection, RewardTransactionType } from '../dto';

export type RewardTransactionRow = InferSelectModel<typeof rewardTransactions>;

export interface AppendTransactionInput {
  memberId: string;
  programId?: string | null;
  ruleId?: string | null;
  reference: string;
  type: RewardTransactionType;
  direction: RewardDirection;
  points: number;
  balanceAfter: number;
  description?: string | null;
  redemptionId?: string | null;
  reversalOfId?: string | null;
  expiresAt?: Date | null;
  createdBy: string | null;
}

const sortColumns = {
  createdAt: rewardTransactions.createdAt,
  points: rewardTransactions.points,
} as const;

/** Append-only reward ledger persistence. Entries are never deleted. */
export class RewardTransactionRepository {
  public constructor(private readonly db: Database) {}

  public async append(
    input: AppendTransactionInput,
    executor: Executor = this.db,
  ): Promise<RewardTransactionRow> {
    const rows = await executor
      .insert(rewardTransactions)
      .values({
        memberId: input.memberId,
        programId: input.programId ?? null,
        ruleId: input.ruleId ?? null,
        reference: input.reference,
        type: input.type,
        direction: input.direction,
        status: 'POSTED',
        points: input.points,
        balanceAfter: input.balanceAfter,
        description: input.description ?? null,
        redemptionId: input.redemptionId ?? null,
        reversalOfId: input.reversalOfId ?? null,
        expiresAt: input.expiresAt ?? null,
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
  ): Promise<RewardTransactionRow | null> {
    const rows = await executor
      .select()
      .from(rewardTransactions)
      .where(eq(rewardTransactions.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Sets an entry's redemption link after the redemption row is created. */
  public async setRedemptionId(
    id: string,
    redemptionId: string,
    executor: Executor,
  ): Promise<void> {
    await executor
      .update(rewardTransactions)
      .set({ redemptionId })
      .where(eq(rewardTransactions.id, id));
  }

  /** Flags an entry REVERSED — the only permitted mutation (never point fields). */
  public async markReversed(id: string, executor: Executor): Promise<void> {
    await executor
      .update(rewardTransactions)
      .set({ status: 'REVERSED' })
      .where(eq(rewardTransactions.id, id));
  }

  /** Marks EARN lots as expiry-processed (traceability only). */
  public async markExpired(ids: string[], asOf: Date, executor: Executor): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    for (const id of ids) {
      await executor
        .update(rewardTransactions)
        .set({ expiredAt: asOf })
        .where(eq(rewardTransactions.id, id));
    }
  }

  public async listAllByMember(
    memberId: string,
    executor: Executor = this.db,
  ): Promise<RewardTransactionRow[]> {
    return executor
      .select()
      .from(rewardTransactions)
      .where(eq(rewardTransactions.memberId, memberId))
      .orderBy(asc(rewardTransactions.createdAt), asc(rewardTransactions.id));
  }

  /** EARN lots with points that have expired and not yet been processed. */
  public async listExpirableEarnLots(
    memberId: string,
    asOf: Date,
    executor: Executor,
  ): Promise<RewardTransactionRow[]> {
    return executor
      .select()
      .from(rewardTransactions)
      .where(
        and(
          eq(rewardTransactions.memberId, memberId),
          eq(rewardTransactions.type, 'EARN'),
          eq(rewardTransactions.status, 'POSTED'),
          isNull(rewardTransactions.expiredAt),
          lte(rewardTransactions.expiresAt, asOf),
        ),
      )
      .orderBy(asc(rewardTransactions.createdAt));
  }

  /** Distinct member ids that have expirable EARN lots at `asOf`. */
  public async membersWithExpirable(asOf: Date): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ memberId: rewardTransactions.memberId })
      .from(rewardTransactions)
      .where(
        and(
          eq(rewardTransactions.type, 'EARN'),
          eq(rewardTransactions.status, 'POSTED'),
          isNull(rewardTransactions.expiredAt),
          lte(rewardTransactions.expiresAt, asOf),
        ),
      );
    return rows.map((row) => row.memberId);
  }

  public async search(
    query: ListTransactionsQuery,
    forcedMemberId?: string,
  ): Promise<{ rows: RewardTransactionRow[]; total: number }> {
    const conditions: SQL[] = [];
    const memberId = forcedMemberId ?? query.memberId;
    if (memberId) {
      conditions.push(eq(rewardTransactions.memberId, memberId));
    }
    if (query.programId) {
      conditions.push(eq(rewardTransactions.programId, query.programId));
    }
    if (query.type) {
      conditions.push(eq(rewardTransactions.type, query.type));
    }
    if (query.direction) {
      conditions.push(eq(rewardTransactions.direction, query.direction));
    }
    if (query.status) {
      conditions.push(eq(rewardTransactions.status, query.status));
    }
    if (query.search) {
      conditions.push(ilike(rewardTransactions.reference, `%${query.search}%`));
    }
    if (query.dateFrom) {
      conditions.push(gte(rewardTransactions.createdAt, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      conditions.push(lte(rewardTransactions.createdAt, new Date(query.dateTo)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const direction = query.order === 'asc' ? asc : desc;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(rewardTransactions)
      .where(where)
      .orderBy(direction(sortColumns[query.sortBy]))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(rewardTransactions)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}
