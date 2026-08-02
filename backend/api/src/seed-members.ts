/**
 * One-time production member bootstrap.
 *
 * Runs at container startup (after migrate + seed). If the sentinel account
 * `member01@superdreams.com` is absent, it creates the initial member set
 * (member01–member15); if it already exists, it does nothing. Idempotent, and
 * harmless on every future deploy — once the sentinel exists this is a fast
 * no-op. Failures are logged but never fail the deploy (exit 0), so member
 * bootstrapping can never block the API from starting.
 *
 *   node dist/seed-members.js
 */
import { eq } from 'drizzle-orm';

import { createDatabaseConnection } from '@/database/connection';
import { users } from '@/database/schema';
import { MEMBER_SENTINEL_EMAIL, seedBulkMembers } from '@/database/seed/bulk-members-core';

const MEMBER_COUNT = 15;

async function main(): Promise<void> {
  const connection = createDatabaseConnection();
  try {
    await connection.connectWithRetry();

    const existing = await connection.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, MEMBER_SENTINEL_EMAIL))
      .limit(1);

    if (existing[0]) {
      process.stdout.write(
        `Member bootstrap: ${MEMBER_SENTINEL_EMAIL} already exists — nothing to do.\n`,
      );
      return;
    }

    process.stdout.write(`Member bootstrap: creating member01–member${MEMBER_COUNT}...\n`);
    const created = await seedBulkMembers(connection.db, MEMBER_COUNT);
    process.stdout.write(`Member bootstrap: created ${created.length} member account(s).\n`);
  } finally {
    await connection.close();
  }
}

void main().catch((error) => {
  // Never fail the deploy over member bootstrapping — log and exit cleanly.
  process.stderr.write(`Member bootstrap skipped (non-fatal): ${String(error)}\n`);
  process.exit(0);
});
