import type { Database } from '@/database/client';
import type { Executor, Transaction } from '@/database/types';

/**
 * Runs `fn` inside a database transaction — commits on success, rolls back on
 * any thrown error. Future business services reuse this rather than calling
 * `db.transaction` directly.
 */
export async function withTransaction<T>(
  db: Database,
  fn: (tx: Executor) => Promise<T>,
): Promise<T> {
  return db.transaction((tx) => fn(tx));
}

/**
 * Runs `fn` in a nested transaction (savepoint) within an existing transaction.
 */
export async function withNestedTransaction<T>(
  tx: Transaction,
  fn: (nested: Executor) => Promise<T>,
): Promise<T> {
  return tx.transaction((nested) => fn(nested));
}
