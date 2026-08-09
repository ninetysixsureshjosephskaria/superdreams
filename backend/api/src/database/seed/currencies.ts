import type { Database } from '@/database/client';
// Import the seed helper directly (not the module barrel) so this file does not
// pull the currencies module's auth/argon2 import chain into the seed graph.
import { syncCurrencyReference } from '@/modules/currencies/seed';

import { registerSeed } from './index';

/**
 * Seeds the fixed internal currency table (Phase 2C). Idempotent and reference-
 * data only (no business/sample data), so it runs in every environment. The USD
 * base (per-unit value 30) and the reference-enumerated currencies are inserted
 * if missing; admin-edited rows are never overwritten.
 */
async function seedCurrencies(db: Database): Promise<void> {
  await syncCurrencyReference(db);
}

registerSeed({
  name: 'currencies-reference',
  environments: ['development', 'test', 'staging', 'production'],
  run: seedCurrencies,
});
