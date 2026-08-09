import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, depositTranches, members } from '@/database/schema';
import { createFinanceModule, type FinanceModule } from '@/modules/finance';
import type { FinanceAuthorizationPort } from '@/modules/finance/services/finance.service';
import { createWalletModule, type WalletModule } from '@/modules/wallet';

import { createEarningsModule, type EarningsModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000b1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};
const BM1 = '00000000-0000-0000-0000-000000000b10';
const BM2 = '00000000-0000-0000-0000-000000000b11';
const BM3 = '00000000-0000-0000-0000-000000000b12';

const ALLOW: FinanceAuthorizationPort = { can: () => Promise.resolve(true) };

async function seedMember(db: Database, id: string, suffix: string): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-BON${suffix}`,
    firstName: 'Bon',
    lastName: suffix,
    email: `bon${suffix}@bonus.test`,
    status: 'ACTIVE',
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

/** Phase 2E — bonus campaigns: eligibility, deterministic selection, idempotency, maturity credit. */
describe('phase 2e bonus campaigns (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let wallet: WalletModule;
  let finance: FinanceModule;
  let earnings: EarningsModule;

  async function approvedDeposit(memberId: string, units: number): Promise<string> {
    const req = await finance.service.createDeposit(memberId, { units }, ACTOR);
    await finance.service.approve(req.id, {}, ACTOR);
    return req.id;
  }
  async function trancheFor(depositId: string): Promise<typeof depositTranches.$inferSelect> {
    const [row] = await db
      .select()
      .from(depositTranches)
      .where(eq(depositTranches.depositRequestId, depositId));
    return row!;
  }
  async function balance(memberId: string): Promise<number> {
    const w = await wallet.repositories.wallets.findByMemberId(memberId, 'FINANCIAL');
    return w ? (await wallet.service.getBalance(w.id)).availableMinor : 0;
  }

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
      networkUnits: { totalNetworkUnits: () => Promise.resolve(0) },
      partners: { partnerMemberIds: () => Promise.resolve(new Set<string>()) },
    });
    await Promise.all([
      seedMember(db, BM1, '01'),
      seedMember(db, BM2, '02'),
      seedMember(db, BM3, '03'),
    ]);
  });

  afterAll(async () => {
    await client.close();
  });

  it('CRUD + validation', async () => {
    const created = await earnings.bonus.create(
      { name: 'Temp', scope: 'ALL_DEPOSITS', frequency: 'MULTI', rateBps: 500, enabled: false },
      ACTOR,
    );
    expect(created.status).toBe('DISABLED');
    const updated = await earnings.bonus.update(created.id, { rateBps: 750 }, ACTOR);
    expect(updated.rateBps).toBe(750);
    expect((await earnings.bonus.list()).some((c) => c.id === created.id)).toBe(true);
    await earnings.bonus.remove(created.id, ACTOR);
    await expect(
      earnings.bonus.create(
        { name: 'Bad', scope: 'ALL_DEPOSITS', frequency: 'MULTI', rateBps: 20_000 },
        ACTOR,
      ),
    ).rejects.toThrow(/between 0 and 100/i);
  });

  it('selects the highest-rate eligible campaign; first-deposit + single-claim scope respected', async () => {
    const cAll = await earnings.bonus.create(
      { name: 'All 5%', scope: 'ALL_DEPOSITS', frequency: 'MULTI', rateBps: 500, permanent: true },
      ACTOR,
    );
    const cFirst = await earnings.bonus.create(
      {
        name: 'First 10%',
        scope: 'FIRST_DEPOSIT',
        frequency: 'SINGLE',
        rateBps: 1000,
        permanent: true,
      },
      ACTOR,
    );

    // First deposit: both eligible → highest rate (First 10%) wins.
    const d1 = await approvedDeposit(BM1, 10); // 30000
    const r1 = await earnings.bonus.applyForDeposit({ depositRequestId: d1 }, ACTOR);
    expect(r1.applied).toBe(true);
    expect(r1.campaignId).toBe(cFirst.id);
    expect(r1.bonusCents).toBe(3000); // 10% of 30000
    expect((await trancheFor(d1)).bonusCents).toBe(3000);

    // Second deposit: First is not eligible (not first + single) → All 5% applies.
    const d2 = await approvedDeposit(BM1, 10);
    const r2 = await earnings.bonus.applyForDeposit({ depositRequestId: d2 }, ACTOR);
    expect(r2.applied).toBe(true);
    expect(r2.campaignId).toBe(cAll.id);
    expect(r2.bonusCents).toBe(1500); // 5%

    // Idempotent: re-applying the first deposit changes nothing.
    const rerun = await earnings.bonus.applyForDeposit({ depositRequestId: d1 }, ACTOR);
    expect(rerun.applied).toBe(false);
    expect((await trancheFor(d1)).bonusCents).toBe(3000);

    await earnings.bonus.update(cAll.id, { enabled: false }, ACTOR);
    await earnings.bonus.update(cFirst.id, { enabled: false }, ACTOR);
  });

  it('enforces minimum-unit eligibility', async () => {
    const cMin = await earnings.bonus.create(
      {
        name: 'Min 20u',
        scope: 'ALL_DEPOSITS',
        frequency: 'MULTI',
        rateBps: 500,
        minUnits: 20,
        permanent: true,
      },
      ACTOR,
    );
    const small = await approvedDeposit(BM2, 10); // below min
    expect((await earnings.bonus.applyForDeposit({ depositRequestId: small }, ACTOR)).applied).toBe(
      false,
    );
    const big = await approvedDeposit(BM2, 20); // meets min
    const r = await earnings.bonus.applyForDeposit({ depositRequestId: big }, ACTOR);
    expect(r.applied).toBe(true);
    expect(r.bonusCents).toBe(3000); // 5% of 60000
    await earnings.bonus.update(cMin.id, { enabled: false }, ACTOR);
  });

  it('does not apply scheduled or ended campaigns', async () => {
    await earnings.bonus.create(
      {
        name: 'Future',
        scope: 'ALL_DEPOSITS',
        frequency: 'MULTI',
        rateBps: 900,
        startAt: '2999-01-01T00:00:00.000Z',
      },
      ACTOR,
    );
    await earnings.bonus.create(
      {
        name: 'Past',
        scope: 'ALL_DEPOSITS',
        frequency: 'MULTI',
        rateBps: 900,
        startAt: '2000-01-01T00:00:00.000Z',
        endAt: '2000-02-01T00:00:00.000Z',
      },
      ACTOR,
    );
    const d = await approvedDeposit(BM3, 10);
    expect((await earnings.bonus.applyForDeposit({ depositRequestId: d }, ACTOR)).applied).toBe(
      false,
    );
  });

  it('bonus is realised as a TXN-B credit at tranche maturity', async () => {
    // BM1's first tranche has a 3000 bonus; mature it and confirm the credit.
    const bonusTranche = (await finance.service.listTranchesByMember(BM1)).find(
      (t) => t.bonusCents === 3000,
    )!;
    const before = await balance(BM1);
    await db
      .update(depositTranches)
      .set({ maturesAt: new Date(Date.now() - 1000) })
      .where(eq(depositTranches.id, bonusTranche.id));
    const result = await finance.service.matureTranches(ACTOR, new Date());
    expect(result.bonusCreditedCents).toBeGreaterThanOrEqual(3000);
    expect(await balance(BM1)).toBe(before + 3000);
  });

  it('writes audit entries for bonus claims', async () => {
    const rows = await db.select().from(auditLogs).where(eq(auditLogs.entityType, 'bonus_claim'));
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
