import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '@/database/schema';

/** The typed Drizzle database client bound to the full platform schema. */
export type Database = PostgresJsDatabase<typeof schema>;

/** The underlying postgres.js connection pool. */
export type PostgresClient = ReturnType<typeof postgres>;

export interface PostgresClientOptions {
  url: string;
  max?: number;
  /** Per-connection `statement_timeout` (ms) — bounds any single query. */
  statementTimeoutMs?: number;
  /** Per-connection `lock_timeout` (ms) — bounds waiting on a row/table lock. */
  lockTimeoutMs?: number;
}

/** Creates the postgres.js connection pool (connects lazily on first query). */
export function createPostgresClient(options: PostgresClientOptions): PostgresClient {
  // Optional server-side timeouts, applied as connection parameters so a stuck
  // query or a contended lock can never block a caller (e.g. the deploy seed)
  // indefinitely. Omitted entirely unless requested, so default behavior is
  // unchanged.
  const connection: Record<string, string> = {};
  if (options.statementTimeoutMs !== undefined) {
    connection.statement_timeout = String(options.statementTimeoutMs);
  }
  if (options.lockTimeoutMs !== undefined) {
    connection.lock_timeout = String(options.lockTimeoutMs);
  }

  return postgres(options.url, {
    max: options.max ?? 10,
    onnotice: () => {
      /* Suppress server NOTICE messages. */
    },
    ...(Object.keys(connection).length > 0 ? { connection } : {}),
  });
}

/** Wraps a postgres.js client in a typed Drizzle database. */
export function createDatabase(client: PostgresClient): Database {
  return drizzle(client, { schema });
}
