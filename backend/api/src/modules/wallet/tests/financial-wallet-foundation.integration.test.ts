import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { members } from '@/database/schema';

import { createWalletModule, type WalletModule } from '../index';
import { centsFromUnits, UNIT_VALUE_USD_CENTS, unitsFromCents } from '../units';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000f1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};
const MEMBER_ID = '00000000-0000-0000-0000-000000000f01';

/**
 * Phase 2A — FINANCIAL wallet coexists with the LOYALTY wallet (wallet `kind`
 * discriminator), and units valuation is the reference-defined 1 unit = $30.
 */
describe('phase 2a wallet & units foundation (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: WalletModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mod = createWalletModule(db);
    await db.insert(members).values({
      id: MEMBER_ID,
      memberNumber: 'M-FIN01',
      firstName: 'Fin',
      lastName: 'Member',
      email: 'fin@wallet.test',
      status: 'ACTIVE',
      createdBy: ACTOR.userId,
      updatedBy: ACTOR.userId,
    });
  });

  afterAll(async () => {
    await client.close();
  });

  it('units valuation is fixed at 1 unit = $30 (reference-defined)', () => {
    expect(UNIT_VALUE_USD_CENTS).toBe(3000);
    expect(centsFromUnits(10)).toBe(30_000);
    expect(unitsFromCents(30_000)).toBe(10);
  });

  it('a member can hold BOTH a LOYALTY and a FINANCIAL wallet', async () => {
    const loyalty = await mod.service.create({ memberId: MEMBER_ID, currencyCode: 'USD' }, ACTOR);
    const financial = await mod.service.create(
      { memberId: MEMBER_ID, kind: 'FINANCIAL', currencyCode: 'USD' },
      ACTOR,
    );
    expect(loyalty.id).not.toBe(financial.id);

    // Default lookup still resolves the LOYALTY wallet (existing behavior preserved).
    const byDefault = await mod.repositories.wallets.findByMemberId(MEMBER_ID);
    expect(byDefault?.kind).toBe('LOYALTY');
    const fin = await mod.repositories.wallets.findByMemberId(MEMBER_ID, 'FINANCIAL');
    expect(fin?.kind).toBe('FINANCIAL');
  });

  it('rejects a second wallet OF THE SAME KIND, but not a different kind', async () => {
    await expect(
      mod.service.create({ memberId: MEMBER_ID, kind: 'FINANCIAL', currencyCode: 'USD' }, ACTOR),
    ).rejects.toThrow(/already has a financial wallet/i);
  });
});
