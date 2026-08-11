import { config } from '@/config';
import { createDatabaseConnection } from '@/database/connection';
// Side-effect import: register the RBAC catalog seed (no native dependencies).
import '@/modules/rbac/seed';
// Side-effect import: register the currencies reference seed (no native deps).
import './currencies';
// Side-effect import: register the member referral-code backfill seed (no native deps).
import './member-referral-codes';

import { runSeeds } from './index';

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
  // Register the env-specific seeds (production-admin + demo). Imported
  // dynamically so their transitive @node-rs/argon2 import loads only inside the
  // seed flow. Registration order: rbac-catalog (static) -> production-admin -> demo.
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
