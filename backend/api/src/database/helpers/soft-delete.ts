import { isNull, type Column, type SQL } from 'drizzle-orm';

/** SQL condition matching rows that are not soft-deleted (`deleted_at IS NULL`). */
export function notDeleted(deletedAt: Column): SQL {
  return isNull(deletedAt);
}
