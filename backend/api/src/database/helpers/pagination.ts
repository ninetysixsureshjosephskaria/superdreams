import type { PaginatedResult, PaginationParams } from '@/database/types';

export interface NormalizedPagination {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** Normalizes and bounds pagination parameters into limit/offset. */
export function normalizePagination(params: PaginationParams = {}): NormalizedPagination {
  const page = Math.max(1, Math.trunc(params.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(params.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}

/** Builds a standard paginated result envelope. */
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
