import { createRequire } from 'node:module';

import { config } from '@/config';
import { createDatabaseConnection } from '@/database/connection';
// Side-effect import: register the RBAC catalog seed (no native dependencies).
import '@/modules/rbac/seed';

import { runSeeds } from './index';

// --- TEMPORARY DIAGNOSTIC (remove once the deploy is confirmed healthy) ------
// Explicitly probe the @node-rs/argon2 native binding here, at module load,
// BEFORE the env-specific seeds (production-admin / demo) — which import it
// transitively — are loaded below. This runs first because those seeds are now
// imported dynamically inside main(), so a failed native load surfaces with a
// clear marker instead of an opaque crash before "seed.js starting".
const requireForDiagnostics = createRequire(import.meta.url);
try {
  requireForDiagnostics('@node-rs/argon2');
  process.stderr.write('ARGON2_RUNTIME_LOAD_OK\n');
} catch (error) {
  process.stderr.write('ARGON2_RUNTIME_LOAD_FAILED\n');
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
}
// --- END TEMPORARY DIAGNOSTIC ------------------------------------------------

/**
 * Standalone seed runner (`pnpm db:seed`). Connects, applies the seeds
 * registered for the current environment, then closes. No-op when no seeds are
 * registered.
 */
// Bound the seed connection so a stuck query or a contended lock fails fast
// instead of hanging the deploy forever (migrate -> seed -> server chain).
const SEED_STATEMENT_TIMEOUT_MS = 30_000;
const SEED_LOCK_TIMEOUT_MS = 15_000;

async function main(): Promise<void> {
  process.stdout.write('seed.js starting\n');
  // Register the env-specific seeds. Imported dynamically (not statically at the
  // top of the file) so their transitive @node-rs/argon2 import is not hoisted
  // above the diagnostic probe above. Registration order is unchanged:
  // rbac-catalog (imported statically) -> production-admin -> demo.
  await import('./production-admin');
  await import('./demo');

  const connection = createDatabaseConnection({
    statementTimeoutMs: SEED_STATEMENT_TIMEOUT_MS,
    lockTimeoutMs: SEED_LOCK_TIMEOUT_MS,
  });
  try {
    await connection.connectWithRetry();
    const applied = await runSeeds(connection.db, config.app.env);
    process.stdout.write(
      `Seeds applied (${config.app.env}): ${applied.length === 0 ? '(none)' : applied.join(', ')}\n`,
    );
  } finally {
    await connection.close();
  }
  process.stdout.write('seed.js completed\n');
  // Exit explicitly after the connection is closed so a residual handle can
  // never leave the process alive and stall the startup chain.
  process.exit(0);
}

void main().catch((error) => {
  process.stderr.write(`Seed failed: ${String(error)}\n`);
  process.exit(1);
});
