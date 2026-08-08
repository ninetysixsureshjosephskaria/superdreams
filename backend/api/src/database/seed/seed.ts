import { spawnSync } from 'node:child_process';

import { config } from '@/config';
import { createDatabaseConnection } from '@/database/connection';
// Side-effect import: register the RBAC catalog seed (no native dependencies).
import '@/modules/rbac/seed';

import { runSeeds } from './index';

// --- TEMPORARY DIAGNOSTIC (child-process argon2 probe; remove after test) ----
// Load @node-rs/argon2 in an ISOLATED child process so a native-layer crash
// (SIGSEGV/SIGABRT) during the binding load cannot terminate this process — an
// in-process try/catch cannot survive a native abort, only a JS throw.
//
// @node-rs/argon2 is NOT loaded in THIS (parent) process before the spawn:
// seed.js's static chunk graph is pure JS, and the seed flow that would load it
// (main → dynamic import of production-admin/demo) never runs because we exit
// immediately after reporting the child result. The string below is passed to
// the child; it does not load argon2 here.
const argon2Child = spawnSync(
  process.execPath,
  ['-e', "require('@node-rs/argon2'); console.log('ARGON2_CHILD_OK')"],
  { encoding: 'utf8' },
);
process.stdout.write(
  [
    `ARGON2_CHILD_STATUS=${String(argon2Child.status)}`,
    `ARGON2_CHILD_SIGNAL=${String(argon2Child.signal)}`,
    `ARGON2_CHILD_STDOUT=${(argon2Child.stdout || '').trim()}`,
    `ARGON2_CHILD_STDERR=${(argon2Child.stderr || '').trim()}`,
    `ARGON2_CHILD_SPAWN_ERROR=${argon2Child.error ? argon2Child.error.message : ''}`,
    'ARGON2_CHILD_DIAGNOSTIC_DONE',
    '',
  ].join('\n'),
);
// Deliberately stop here so this deploy runs ONLY the diagnostic above and does
// not enter the normal seed flow.
process.exit(0);
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
