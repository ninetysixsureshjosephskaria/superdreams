import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members } from '@/database/schema';
import { ValidationError } from '@/errors';
import { createFinanceModule, type FinanceModule } from '@/modules/finance';
import type { FinanceAuthorizationPort } from '@/modules/finance/services/finance.service';
import { createWalletModule, type WalletModule } from '@/modules/wallet';

import { createEarningsModule, type EarningsModule } from '../index';
import type { NetworkUnitsPort } from '../services';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000f1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};
const P = '00000000-0000-0000-0000-000000000f10'; // partner (commission beneficiary)
const R = '00000000-0000-0000-0000-000000000f11'; // referrer (referral beneficiary)
const M = '00000000-0000-0000-0000-000000000f12'; // depositing member (partner=P, referredBy=R)

const ALLOW: FinanceAuthorizationPort = { can: () => Promise.resolve(true) };
let networkUnitsValue = 100;
const networkUnits: NetworkUnitsPort = {
  totalNetworkUnits: () => Promise.resolve(networkUnitsValue),
};

async function seedMember(
  db: Database,
  id: string,
  suffix: string,
  rel: { partnerId?: string; referredBy?: string } = {},
): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-COM${suffix}`,
    firstName: 'Com',
    lastName: suffix,
    email: `com${suffix}@commission.test`,
    status: 'ACTIVE',
    partnerId: rel.partnerId ?? null,
    referredBy: rel.referredBy ?? null,
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

async function approvedDeposit(
  finance: FinanceModule,
  memberId: string,
  units: number,
): Promise<string> {
  const req = await finance.service.createDeposit(memberId, { units }, ACTOR);
  await finance.service.approve(req.id, {}, ACTOR);
  return req.id;
}

async function units(wallet: WalletModule, memberId: string): Promise<number> {
  const w = await wallet.repositories.wallets.findByMemberId(memberId, 'FINANCIAL');
  if (!w) {
    return 0;
  }
  return (await wallet.service.getBalance(w.id)).availableMinor;
}

/** Phase 2E — commission (tiered by network units) + one-time referral, idempotent. */
describe('phase 2e commission & referral (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let wallet: WalletModule;
  let finance: FinanceModule;
  let earnings: EarningsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    wallet = createWalletModule(db);
    finance = createFinanceModule(db, wallet.service, wallet.repositories.wallets, ALLOW);
    earnings = createEarningsModule(db, {
      wallet: wallet.service,
      walletRepo: wallet.repositories.wallets,
      networkUnits,
      partners: { partnerMemberIds: () => Promise.resolve(new Set<string>()) },
    });
    await seedMember(db, P, '01');
    await seedMember(db, R, '02');
    await seedMember(db, M, '03', { partnerId: P, referredBy: R });
  });

  afterAll(async () => {
    await client.close();
  });

  it('seeds the reference default tiers + referral rate', async () => {
    const config = await earnings.commission.getConfig(ACTOR);
    expect(config.referralRateBps).toBe(200);
    expect(config.defaultTiers.map((t) => t.rateBps)).toEqual([500, 600, 700]);
  });

  it('resolves the commission rate by total network units (tiers 5/6/7%)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(await earnings.commission.resolveRateBps(100, today, ACTOR)).toBe(500);
    expect(await earnings.commission.resolveRateBps(400, today, ACTOR)).toBe(600);
    expect(await earnings.commission.resolveRateBps(600, today, ACTOR)).toBe(700);
  });

  it('credits partner commission + one-time referral on an approved deposit', async () => {
    networkUnitsValue = 100; // → 5% tier
    const depositId = await approvedDeposit(finance, M, 10); // $300 = 30000 cents

    const result = await earnings.commission.processDepositEarnings(
      { depositRequestId: depositId },
      ACTOR,
    );
    expect(result.commission?.amountCents).toBe(1500); // 5% of 30000
    expect(result.commission?.rateBps).toBe(500);
    expect(result.referral?.amountCents).toBe(600); // 2% of 30000

    expect(await units(wallet, P)).toBe(1500);
    expect(await units(wallet, R)).toBe(600);
  });

  it('is idempotent — reprocessing the same deposit credits nothing more', async () => {
    const [firstDeposit] = await finance.service.listByMember(M);
    const rerun = await earnings.commission.processDepositEarnings(
      { depositRequestId: firstDeposit!.id },
      ACTOR,
    );
    expect(rerun.commission).toBeNull();
    expect(rerun.referral).toBeNull();
    expect(await units(wallet, P)).toBe(1500);
    expect(await units(wallet, R)).toBe(600);
  });

  it('pays commission again on a new deposit but referral only once (one-time)', async () => {
    networkUnitsValue = 100;
    const depositId = await approvedDeposit(finance, M, 10);
    const result = await earnings.commission.processDepositEarnings(
      { depositRequestId: depositId },
      ACTOR,
    );
    expect(result.commission?.amountCents).toBe(1500); // new commission
    expect(result.referral).toBeNull(); // referral already paid once

    expect(await units(wallet, P)).toBe(3000); // 1500 + 1500
    expect(await units(wallet, R)).toBe(600); // unchanged
  });

  it('applies a higher tier as network units grow', async () => {
    networkUnitsValue = 600; // → 7% tier
    const depositId = await approvedDeposit(finance, M, 10);
    const result = await earnings.commission.processDepositEarnings(
      { depositRequestId: depositId },
      ACTOR,
    );
    expect(result.commission?.rateBps).toBe(700);
    expect(result.commission?.amountCents).toBe(2100); // 7% of 30000
  });

  it('a date-ranged target overrides the default tiers', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await earnings.commission.createTarget(
      { startDate: today, endDate: today, tiers: [{ fromUnits: 0, toUnits: null, rateBps: 1000 }] },
      ACTOR,
    );
    expect(await earnings.commission.resolveRateBps(100, today, ACTOR)).toBe(1000); // target wins
  });

  it('rejects an overlapping target and an out-of-range commission', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await expect(
      earnings.commission.createTarget(
        {
          startDate: today,
          endDate: today,
          tiers: [{ fromUnits: 0, toUnits: null, rateBps: 500 }],
        },
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(ValidationError); // overlaps the target created above

    await expect(
      earnings.commission.updateReferralRate({ rateBps: 20_000 }, ACTOR),
    ).rejects.toThrow(/between 0 and 100/i);
  });

  it('writes audit entries for credited earnings', async () => {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'commission_earning'));
    expect(rows.length).toBeGreaterThanOrEqual(3); // 2 commissions + 1 referral at minimum
  });
});
