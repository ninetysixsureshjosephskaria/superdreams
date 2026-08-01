import { and, asc, desc, eq, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import type { PgColumn, PgTable, PgUpdateSetSource } from 'drizzle-orm/pg-core';

import type { Database } from '@/database/client';
import { buildPaginatedResult, normalizePagination, notDeleted } from '@/database/helpers';
import type { Executor, PaginatedResult, PaginationParams } from '@/database/types';

/** The base columns every repository-backed table must expose. */
export interface BaseColumns {
  id: PgColumn;
  createdAt: PgColumn;
  updatedAt: PgColumn;
  deletedAt: PgColumn;
  version: PgColumn;
}

/** A table that follows the platform base-column conventions. */
export type RepositoryTable = PgTable & BaseColumns;

/**
 * Reusable persistence layer for tables following the platform base-column
 * conventions (id, timestamps, soft delete, version). Concrete repositories
 * extend this and supply their table. Contains **no business rules** — the
 * repository layer owns persistence only.
 *
 * Every method accepts an optional `executor` so it can participate in a
 * transaction via `withTransaction`.
 */
export abstract class BaseRepository<TTable extends RepositoryTable> {
  protected constructor(
    protected readonly db: Database,
    protected readonly table: TTable,
  ) {}

  /** Finds a non-deleted row by id, or `null`. */
  public async findById(
    id: string,
    executor: Executor = this.db,
  ): Promise<InferSelectModel<TTable> | null> {
    const rows = (await executor
      .select()
      .from(this.table)
      .where(and(eq(this.table.id, id), notDeleted(this.table.deletedAt)))
      .limit(1)) as unknown as InferSelectModel<TTable>[];
    return rows[0] ?? null;
  }

  /** Lists non-deleted rows with offset pagination. */
  public async findMany(
    params: PaginationParams = {},
    executor: Executor = this.db,
  ): Promise<PaginatedResult<InferSelectModel<TTable>>> {
    const { limit, offset, page, pageSize } = normalizePagination(params);
    const orderColumn =
      params.orderBy === 'updatedAt' ? this.table.updatedAt : this.table.createdAt;
    const direction = params.order === 'asc' ? asc : desc;

    const items = (await executor
      .select()
      .from(this.table)
      .where(notDeleted(this.table.deletedAt))
      .orderBy(direction(orderColumn))
      .limit(limit)
      .offset(offset)) as unknown as InferSelectModel<TTable>[];

    const total = await this.count(executor);
    return buildPaginatedResult(items, total, page, pageSize);
  }

  /** Counts non-deleted rows. */
  public async count(executor: Executor = this.db): Promise<number> {
    const rows = (await executor
      .select({ value: sql<number>`count(*)::int` })
      .from(this.table)
      .where(notDeleted(this.table.deletedAt))) as unknown as Array<{ value: number }>;
    return rows[0]?.value ?? 0;
  }

  /** Inserts a row and returns it. */
  public async create(
    values: InferInsertModel<TTable>,
    executor: Executor = this.db,
  ): Promise<InferSelectModel<TTable>> {
    const rows = (await executor
      .insert(this.table)
      .values(values as never)
      .returning()) as unknown as InferSelectModel<TTable>[];
    const created = rows[0];
    if (!created) {
      throw new Error('Insert did not return a row.');
    }
    return created;
  }

  /** Updates a non-deleted row by id, bumping `updated_at` and `version`. */
  public async update(
    id: string,
    values: Partial<InferInsertModel<TTable>>,
    executor: Executor = this.db,
  ): Promise<InferSelectModel<TTable> | null> {
    const setValues = {
      ...values,
      updatedAt: new Date(),
      version: sql`${this.table.version} + 1`,
    } as PgUpdateSetSource<TTable>;
    const rows = (await executor
      .update(this.table)
      .set(setValues)
      .where(and(eq(this.table.id, id), notDeleted(this.table.deletedAt)))
      .returning()) as unknown as InferSelectModel<TTable>[];
    return rows[0] ?? null;
  }

  /** Soft-deletes a non-deleted row by id. Returns whether a row was affected. */
  public async softDelete(
    id: string,
    deletedBy?: string,
    executor: Executor = this.db,
  ): Promise<boolean> {
    const setValues = {
      deletedAt: new Date(),
      version: sql`${this.table.version} + 1`,
      ...(deletedBy !== undefined ? { deletedBy } : {}),
    } as PgUpdateSetSource<TTable>;
    const rows = (await executor
      .update(this.table)
      .set(setValues)
      .where(and(eq(this.table.id, id), notDeleted(this.table.deletedAt)))
      .returning({ id: this.table.id })) as unknown as Array<{ id: string }>;
    return rows.length > 0;
  }

  /** Restores a soft-deleted row by id. Returns whether a row was affected. */
  public async restore(id: string, executor: Executor = this.db): Promise<boolean> {
    const setValues = {
      deletedAt: null,
      version: sql`${this.table.version} + 1`,
    } as PgUpdateSetSource<TTable>;
    const rows = (await executor
      .update(this.table)
      .set(setValues)
      .where(eq(this.table.id, id))
      .returning({ id: this.table.id })) as unknown as Array<{ id: string }>;
    return rows.length > 0;
  }
}
