/** Generic pagination request parameters. */
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Pagination metadata returned alongside a page of results. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A page of results plus its pagination metadata. */
export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
