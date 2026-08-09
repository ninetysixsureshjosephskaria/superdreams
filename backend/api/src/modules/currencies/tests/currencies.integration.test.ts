import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';

import { createCurrenciesModule, type CurrenciesModule } from '../index';
import { syncCurrencyReference } from '../seed';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000c1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};

/** Phase 2C — fixed internal currency table; USD base is immutable, 1 unit = $30. */
describe('phase 2c currencies (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: CurrenciesModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mod = createCurrenciesModule(db);
    await syncCurrencyReference(db);
  });

  afterAll(async () => {
    await client.close();
  });

  it('seeds the reference currencies with USD as the base (per-unit 30)', async () => {
    const list = await mod.service.list({});
    const codes = list.map((c) => c.code);
    expect(codes).toContain('USD');
    expect(codes).toContain('INR');
    const usd = list.find((c) => c.code === 'USD');
    expect(usd?.isBase).toBe(true);
    expect(usd?.perUnitValue).toBe(30);
    expect(usd?.perUsd).toBe(1); // 30 / 30
    const inr = list.find((c) => c.code === 'INR');
    expect(inr?.perUnitValue).toBe(3000);
    expect(inr?.perUsd).toBe(100); // 3000 / 30
    // Base first in the ordering.
    expect(list[0]?.code).toBe('USD');
  });

  it('seeding is idempotent', async () => {
    const before = (await mod.service.list({})).length;
    const inserted = await syncCurrencyReference(db);
    expect(inserted).toBe(0);
    expect((await mod.service.list({})).length).toBe(before);
  });

  it('creates, updates and deletes a non-base currency', async () => {
    const created = await mod.service.create(
      { code: 'eur', name: 'Euro', symbol: '€', perUnitValue: 27 },
      ACTOR,
    );
    expect(created.code).toBe('EUR');
    expect(created.isBase).toBe(false);
    expect(created.perUsd).toBeCloseTo(0.9); // 27 / 30

    const updated = await mod.service.update('EUR', { perUnitValue: 28 }, ACTOR);
    expect(updated.perUnitValue).toBe(28);

    await mod.service.remove('EUR', ACTOR);
    await expect(mod.service.get('EUR')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects a duplicate currency code', async () => {
    await expect(
      mod.service.create({ code: 'INR', name: 'Rupee', perUnitValue: 3000 }, ACTOR),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('refuses to modify or delete the immutable base currency', async () => {
    await expect(mod.service.update('USD', { perUnitValue: 31 }, ACTOR)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
    await expect(mod.service.remove('USD', ACTOR)).rejects.toBeInstanceOf(BusinessRuleError);
  });
});
