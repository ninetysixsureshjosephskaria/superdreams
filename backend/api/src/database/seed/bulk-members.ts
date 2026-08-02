/**
 * Bulk member generator CLI (dev/staging utility — NOT part of `db:seed`).
 *
 * Creates N fully-populated member accounts and prints a credentials table.
 * The generation logic lives in `bulk-members-core.ts` (side-effect free) so it
 * can be reused by the `seed-members` production startup task.
 *
 * Run against any database via its DATABASE_URL:
 *   pnpm --filter @superdreams/api db:seed:members [count]
 */
import { createDatabaseConnection } from '@/database/connection';

import { SHARED_PASSWORD, seedBulkMembers } from './bulk-members-core';

const COUNT = Math.max(1, Number.parseInt(process.argv[2] ?? '15', 10) || 15);

async function main(): Promise<void> {
  const connection = createDatabaseConnection();
  await connection.connectWithRetry();
  try {
    const created = await seedBulkMembers(connection.db, COUNT);
    process.stdout.write('\n================ MEMBER ACCOUNTS ================\n');
    process.stdout.write('All passwords: ' + SHARED_PASSWORD + '\n\n');
    for (const c of created) {
      process.stdout.write(
        `${String(c.n).padStart(2, '0')}. ${c.email}  |  ${c.name}  |  wallet $${(c.walletMinor / 100).toFixed(2)}  |  ${c.rewardPoints} pts\n`,
      );
    }
    process.stdout.write(`\nTotal created this run: ${created.length}\n`);
  } finally {
    await connection.close();
  }
}

void main().catch((error) => {
  process.stderr.write(`bulk-members failed: ${String(error)}\n`);
  process.exit(1);
});
