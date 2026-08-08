import { config } from '@/config';
import { createDatabaseConnection } from '@/database/connection';
// Side-effect imports: register seeds before running. RBAC first so the demo
// seed can rely on the catalog (permissions + super-admin role) existing.
import '@/modules/rbac/seed';

import { runSeeds } from './index';
// Registered after the runner import to avoid a circular import at module load.
import './production-admin';
import './demo';

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
