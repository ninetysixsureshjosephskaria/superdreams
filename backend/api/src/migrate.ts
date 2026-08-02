/**
 * Production migration entrypoint.
 *
 * Applies every pending Drizzle migration from the `drizzle/` folder, then exits.
 * This is what the Railway deploy runs *before* the API server starts, so the
 * schema is always up to date (including a fresh database, which bootstraps from
 * migration 0000). It uses only runtime dependencies (`drizzle-orm` + `postgres`)
 * — no `drizzle-kit` or `tsx` — so it runs from the compiled `dist/` output.
 *
 * The operation is idempotent: Drizzle records applied migrations in
 * `drizzle.__drizzle_migrations` and skips anything already present, so running
 * it on every deploy is safe and a no-op once the database is current.
 *
 *   node dist/migrate.js
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDatabaseConnection } from '@/database/connection';
import { runMigrations } from '@/database/migrations';

/**
 * Resolves the `drizzle/` folder regardless of the process working directory.
 * Prefers a path relative to this compiled file (`dist/migrate.js` → `../drizzle`),
 * then falls back to a cwd-relative folder.
 */
function resolveMigrationsFolder(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [resolve(here, '../drizzle'), resolve(process.cwd(), 'drizzle')];
  return candidates.find((candidate) => existsSync(candidate)) ?? 'drizzle';
}

async function main(): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder();
  const connection = createDatabaseConnection();

  process.stdout.write(`Applying migrations from "${migrationsFolder}"...\n`);
  await connection.connectWithRetry();

  const before = await connection.health();
  await runMigrations(connection.db, migrationsFolder);
  const after = await connection.health();

  process.stdout.write(
    `Migrations applied. Total recorded: ${after.migrationsApplied ?? 'unknown'}` +
      (before.migrationsApplied !== undefined ? ` (was ${before.migrationsApplied}).\n` : '.\n'),
  );

  await connection.close();
}

void main().catch((error) => {
  process.stderr.write(`Migration failed: ${String(error)}\n`);
  process.exit(1);
});
