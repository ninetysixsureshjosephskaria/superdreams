import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration for the Super Dreams platform database.
 *
 * Reads the environment directly (independent of the application config module)
 * so the CLI runs standalone. Migrations are roll-forward only.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:5432/superdreams',
  },
  strict: true,
  verbose: true,
});
