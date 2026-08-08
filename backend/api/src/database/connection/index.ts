import { config } from '@/config';
import {
  createDatabase,
  createPostgresClient,
  type Database,
  type PostgresClient,
} from '@/database/client';

/** Rich database health snapshot for diagnostics and readiness. */
export interface DatabaseHealth {
  reachable: boolean;
  latencyMs: number;
  serverVersion: string | undefined;
  migrationsApplied: number | undefined;
  poolMax: number;
}

/** A live database connection: the Drizzle client plus lifecycle helpers. */
export interface DatabaseConnection {
  db: Database;
  client: PostgresClient;
  ping: () => Promise<void>;
  health: () => Promise<DatabaseHealth>;
  connectWithRetry: (retries?: number, delayMs?: number) => Promise<void>;
  close: () => Promise<void>;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates the database connection: the Drizzle client plus lifecycle helpers —
 * a connectivity probe, a retrying connect, a rich health snapshot, and a
 * graceful close. The underlying driver connects lazily, so this never blocks
 * startup when the database is temporarily unavailable.
 */
export interface DatabaseConnectionOptions {
  /** Per-connection `statement_timeout` (ms) — bounds any single query. */
  statementTimeoutMs?: number;
  /** Per-connection `lock_timeout` (ms) — bounds waiting on a row/table lock. */
  lockTimeoutMs?: number;
}

export function createDatabaseConnection(options?: DatabaseConnectionOptions): DatabaseConnection {
  const client = createPostgresClient({
    url: config.database.url,
    max: config.database.poolMax,
    ...(options?.statementTimeoutMs !== undefined
      ? { statementTimeoutMs: options.statementTimeoutMs }
      : {}),
    ...(options?.lockTimeoutMs !== undefined ? { lockTimeoutMs: options.lockTimeoutMs } : {}),
  });
  const db = createDatabase(client);

  const ping = async (): Promise<void> => {
    await client`select 1`;
  };

  const health = async (): Promise<DatabaseHealth> => {
    const startedAt = performance.now();
    let reachable = false;
    let serverVersion: string | undefined;
    let migrationsApplied: number | undefined;

    try {
      const versionRows = await client<{ version: string }[]>`select version() as version`;
      serverVersion = versionRows[0]?.version;
      reachable = true;
      try {
        const migrationRows = await client<{ count: number }[]>`
          select count(*)::int as count from drizzle.__drizzle_migrations
        `;
        migrationsApplied = migrationRows[0]?.count;
      } catch {
        /* Migrations table not present yet (database not migrated). */
      }
    } catch {
      reachable = false;
    }

    return {
      reachable,
      latencyMs: Math.round(performance.now() - startedAt),
      serverVersion,
      migrationsApplied,
      poolMax: config.database.poolMax,
    };
  };

  const connectWithRetry = async (retries = 5, delayMs = 1000): Promise<void> => {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        await ping();
        return;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await wait(delayMs);
      }
    }
  };

  const close = async (): Promise<void> => {
    await client.end({ timeout: 5 });
  };

  return { db, client, ping, health, connectWithRetry, close };
}
