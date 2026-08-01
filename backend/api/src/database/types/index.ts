import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

import type { Database } from '@/database/client';
import type * as schema from '@/database/schema';

/** An in-flight transaction over the platform schema. */
export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/** A database executor — the base connection or a transaction. Enables repos to
 * run inside or outside a transaction interchangeably. */
export type Executor = Database | Transaction;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  orderBy?: 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  order?: 'asc' | 'desc';
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
