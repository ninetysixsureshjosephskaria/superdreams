import { eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { currencies } from '@/database/schema';

/**
 * The reference-defined seed currencies (currencies.html). USD is the immutable
 * base at per-unit value 30 (1 unit = $30). Only the currencies whose per-unit
 * values the reference explicitly states are seeded — the screen mentions "13
 * seeded currencies" but enumerates just these; the remaining values are NOT
 * invented (flagged unresolved).
 */
const SEED_CURRENCIES: ReadonlyArray<{
  code: string;
  name: string;
  symbol: string;
  perUnitValue: number;
  isBase: boolean;
}> = [
  { code: 'USD', name: 'US Dollar', symbol: '$', perUnitValue: 30, isBase: true },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', perUnitValue: 110, isBase: false },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', perUnitValue: 3000, isBase: false },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', perUnitValue: 1800, isBase: false },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', perUnitValue: 9500, isBase: false },
];

/**
 * Idempotently seeds the fixed internal currency table. Inserts any missing seed
 * currency; never overwrites admin-edited rows. Safe to run on every startup.
 * Returns the number of rows inserted.
 */
export async function syncCurrencyReference(db: Database): Promise<number> {
  let inserted = 0;
  for (const seed of SEED_CURRENCIES) {
    const existing = await db
      .select({ id: currencies.id })
      .from(currencies)
      .where(eq(currencies.code, seed.code))
      .limit(1);
    if (existing[0]) {
      continue;
    }
    await db.insert(currencies).values({
      code: seed.code,
      name: seed.name,
      symbol: seed.symbol,
      decimalDigits: 2,
      perUnitValue: seed.perUnitValue,
      isBase: seed.isBase,
      isActive: true,
    });
    inserted += 1;
  }
  return inserted;
}
