import { and, asc, desc, eq, ilike, or, sql, type InferSelectModel, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { normalizePagination, notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { members, storeOrderItems, storeOrders } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListOrdersQuery } from '../dto';

export type OrderRow = InferSelectModel<typeof storeOrders>;
export type OrderItemRow = InferSelectModel<typeof storeOrderItems>;

export interface OrderWithMember extends OrderRow {
  memberName: string | null;
}

const ORDER_SELECTION = {
  id: storeOrders.id,
  reference: storeOrders.reference,
  memberId: storeOrders.memberId,
  status: storeOrders.status,
  totalPoints: storeOrders.totalPoints,
  rewardTransactionId: storeOrders.rewardTransactionId,
  refundTransactionId: storeOrders.refundTransactionId,
  placedBy: storeOrders.placedBy,
  fulfilledAt: storeOrders.fulfilledAt,
  cancelledAt: storeOrders.cancelledAt,
  createdAt: storeOrders.createdAt,
  updatedAt: storeOrders.updatedAt,
  deletedAt: storeOrders.deletedAt,
  createdBy: storeOrders.createdBy,
  updatedBy: storeOrders.updatedBy,
  deletedBy: storeOrders.deletedBy,
  version: storeOrders.version,
  memberName: sql<string>`${members.firstName} || ' ' || ${members.lastName}`,
} as const;

/** Persistence for Dream Store orders and their line items. */
export class OrderRepository extends BaseRepository<typeof storeOrders> {
  public constructor(db: Database) {
    super(db, storeOrders);
  }

  public async createItem(
    input: {
      orderId: string;
      productId: string;
      productName: string;
      points: number;
      quantity: number;
    },
    tx: Executor,
  ): Promise<OrderItemRow> {
    const rows = await tx.insert(storeOrderItems).values(input).returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Order item insert did not return a row.');
    }
    return created;
  }

  public async lockById(id: string, tx: Executor): Promise<OrderRow | null> {
    const rows = await tx
      .select()
      .from(storeOrders)
      .where(and(eq(storeOrders.id, id), notDeleted(storeOrders.deletedAt)))
      .for('update')
      .limit(1);
    return rows[0] ?? null;
  }

  public async itemsByOrder(
    orderId: string,
    executor: Executor = this.db,
  ): Promise<OrderItemRow[]> {
    return executor
      .select()
      .from(storeOrderItems)
      .where(eq(storeOrderItems.orderId, orderId))
      .orderBy(asc(storeOrderItems.createdAt));
  }

  public async findWithMember(id: string): Promise<OrderWithMember | null> {
    const rows = await this.db
      .select(ORDER_SELECTION)
      .from(storeOrders)
      .leftJoin(members, eq(storeOrders.memberId, members.id))
      .where(and(eq(storeOrders.id, id), notDeleted(storeOrders.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async search(
    query: ListOrdersQuery,
    memberId?: string,
  ): Promise<{ rows: OrderWithMember[]; total: number }> {
    const { limit, offset } = normalizePagination(query);
    const conditions: SQL[] = [notDeleted(storeOrders.deletedAt)];
    if (memberId ?? query.memberId) {
      conditions.push(eq(storeOrders.memberId, memberId ?? query.memberId!));
    }
    if (query.status) {
      conditions.push(eq(storeOrders.status, query.status));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      const match = or(
        ilike(storeOrders.reference, term),
        ilike(members.firstName, term),
        ilike(members.lastName, term),
      );
      if (match) {
        conditions.push(match);
      }
    }
    const where = and(...conditions);

    const sortColumn =
      query.sortBy === 'totalPoints'
        ? storeOrders.totalPoints
        : query.sortBy === 'status'
          ? storeOrders.status
          : storeOrders.createdAt;
    const direction = query.order === 'asc' ? asc : desc;

    const rows = await this.db
      .select(ORDER_SELECTION)
      .from(storeOrders)
      .leftJoin(members, eq(storeOrders.memberId, members.id))
      .where(where)
      .orderBy(direction(sortColumn))
      .limit(limit)
      .offset(offset);
    const totalRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(storeOrders)
      .leftJoin(members, eq(storeOrders.memberId, members.id))
      .where(where);
    return { rows, total: totalRows[0]?.value ?? 0 };
  }
}
