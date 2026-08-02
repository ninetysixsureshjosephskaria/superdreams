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
async function main(): Promise<void> {
  const connection = createDatabaseConnection();
  try {
    await connection.connectWithRetry();
    const applied = await runSeeds(connection.db, config.app.env);
    process.stdout.write(
      `Seeds applied (${config.app.env}): ${applied.length === 0 ? '(none)' : applied.join(', ')}\n`,
    );
  } finally {
    await connection.close();
  }
}

void main();
