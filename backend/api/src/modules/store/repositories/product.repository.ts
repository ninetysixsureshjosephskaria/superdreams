import { and, asc, desc, eq, ilike, or, sql, type InferSelectModel, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { normalizePagination, notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { storeCategories, storeProducts } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListProductsQuery, StockStatus } from '../dto';

export type ProductRow = InferSelectModel<typeof storeProducts>;

export interface ProductWithCategory extends ProductRow {
  categoryName: string | null;
}

const SELECTION = {
  id: storeProducts.id,
  name: storeProducts.name,
  sku: storeProducts.sku,
  categoryId: storeProducts.categoryId,
  points: storeProducts.points,
  stock: storeProducts.stock,
  reorderLevel: storeProducts.reorderLevel,
  status: storeProducts.status,
  description: storeProducts.description,
  imageUrl: storeProducts.imageUrl,
  createdAt: storeProducts.createdAt,
  updatedAt: storeProducts.updatedAt,
  deletedAt: storeProducts.deletedAt,
  createdBy: storeProducts.createdBy,
  updatedBy: storeProducts.updatedBy,
  deletedBy: storeProducts.deletedBy,
  version: storeProducts.version,
  categoryName: storeCategories.name,
} as const;

/** Derives a stock status from stock level and reorder threshold. */
export function stockStatusOf(stock: number, reorderLevel: number): StockStatus {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

/** Persistence for Dream Store products. */
export class ProductRepository extends BaseRepository<typeof storeProducts> {
  public constructor(db: Database) {
    super(db, storeProducts);
  }

  public async findWithCategory(id: string): Promise<ProductWithCategory | null> {
    const rows = await this.db
      .select(SELECTION)
      .from(storeProducts)
      .leftJoin(storeCategories, eq(storeProducts.categoryId, storeCategories.id))
      .where(and(eq(storeProducts.id, id), notDeleted(storeProducts.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findBySku(sku: string): Promise<ProductRow | null> {
    const rows = await this.db
      .select()
      .from(storeProducts)
      .where(and(eq(storeProducts.sku, sku), notDeleted(storeProducts.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Locks a product row for update (used inside redemption/adjustment transactions). */
  public async lockById(id: string, tx: Executor): Promise<ProductRow | null> {
    const rows = await tx
      .select()
      .from(storeProducts)
      .where(and(eq(storeProducts.id, id), notDeleted(storeProducts.deletedAt)))
      .for('update')
      .limit(1);
    return rows[0] ?? null;
  }

  public async setStock(id: string, stock: number, tx: Executor): Promise<void> {
    await tx
      .update(storeProducts)
      .set({ stock, updatedAt: new Date(), version: sql`${storeProducts.version} + 1` })
      .where(eq(storeProducts.id, id));
  }

  public async search(
    query: ListProductsQuery,
    options: { activeOnly?: boolean } = {},
  ): Promise<{ rows: ProductWithCategory[]; total: number }> {
    const { limit, offset } = normalizePagination(query);
    const conditions: SQL[] = [notDeleted(storeProducts.deletedAt)];
    if (options.activeOnly) {
      conditions.push(eq(storeProducts.status, 'ACTIVE'));
    } else if (query.status) {
      conditions.push(eq(storeProducts.status, query.status));
    }
    if (query.categoryId) {
      conditions.push(eq(storeProducts.categoryId, query.categoryId));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      const match = or(ilike(storeProducts.name, term), ilike(storeProducts.sku, term));
      if (match) {
        conditions.push(match);
      }
    }
    const where = and(...conditions);

    const sortColumn =
      query.sortBy === 'name'
        ? storeProducts.name
        : query.sortBy === 'points'
          ? storeProducts.points
          : query.sortBy === 'stock'
            ? storeProducts.stock
            : storeProducts.createdAt;
    const direction = query.order === 'asc' ? asc : desc;

    const rows = await this.db
      .select(SELECTION)
      .from(storeProducts)
      .leftJoin(storeCategories, eq(storeProducts.categoryId, storeCategories.id))
      .where(where)
      .orderBy(direction(sortColumn))
      .limit(limit)
      .offset(offset);
    const totalRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(storeProducts)
      .where(where);
    return { rows, total: totalRows[0]?.value ?? 0 };
  }

  public async countByCategory(): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ categoryId: storeProducts.categoryId, value: sql<number>`count(*)::int` })
      .from(storeProducts)
      .where(notDeleted(storeProducts.deletedAt))
      .groupBy(storeProducts.categoryId);
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.categoryId) {
        map.set(row.categoryId, row.value);
      }
    }
    return map;
  }
}
