import { migrate } from 'drizzle-orm/postgres-js/migrator';

import type { Database } from '@/database/client';

/**
 * Applies all pending migrations from the `drizzle/` folder.
 *
 * The platform uses a strictly roll-forward strategy: corrective changes are new
 * migrations, never edits to already-applied ones.
 */
export async function runMigrations(db: Database, migrationsFolder = 'drizzle'): Promise<void> {
  await migrate(db, { migrationsFolder });
}
