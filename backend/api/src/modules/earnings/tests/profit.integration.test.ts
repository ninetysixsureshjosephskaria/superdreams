import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members } from '@/database/schema';
import { BusinessRuleError, ConflictError } from '@/errors';
import { createFinanceModule, type FinanceModule } from '@/modules/finance';
import type { FinanceAuthorizationPort } from '@/modules/finance/services/finance.service';
import { createWalletModule, type WalletModule } from '@/modules/wallet';

import { createEarningsModule, type EarningsModule } from '../index';
import type { PartnerClassifierPort } from '../services';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000a1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};
const M1 = '00000000-0000-0000-0000-000000000a10'; // member, balance 30000
const PN = '00000000-0000-0000-0000-000000000a11'; // partner, balance 60000
const MZ = '00000000-0000-0000-0000-000000000a12'; // member, zero-balance wallet

const ALLOW: FinanceAuthorizationPort = { can: () => Promise.resolve(true) };
const partners: PartnerClassifierPort = {
  partnerMemberIds: () => Promise.resolve(new Set<string>([PN])),
};

async function seedMember(db: Database, id: string, suffix: string): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-PRF${suffix}`,
    firstName: 'Prf',
    lastName: suffix,
    email: `prf${suffix}@profit.test`,
    status: 'ACTIVE',
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

/** Phase 2E — daily profit: schedule plan/publish + idempotent distribution. */
describe('phase 2e daily profit (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let wallet: WalletModule;
  let finance: FinanceModule;
  let earnings: EarningsModule;

  async function balance(memberId: string): Promise<number> {
    const w = await wallet.repositories.wallets.findByMemberId(memberId, 'FINANCIAL');
    if (!w) {
      return 0;
    }
    return (await wallet.service.getBalance(w.id)).availableMinor;
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
      partners,
    });
    await Promise.all([
      seedMember(db, M1, '01'),
      seedMember(db, PN, '02'),
      seedMember(db, MZ, '03'),
    ]);
    // Fund M1 (30000) and PN (60000) via approved deposits; MZ gets an empty wallet.
    const d1 = await finance.service.createDeposit(M1, { units: 10 }, ACTOR);
    await finance.service.approve(d1.id, {}, ACTOR);
    const d2 = await finance.service.createDeposit(PN, { units: 20 }, ACTOR);
    await finance.service.approve(d2.id, {}, ACTOR);
    await wallet.service.create(
      { memberId: MZ, kind: 'FINANCIAL', currencyCode: 'USD', status: 'ACTIVE' },
      ACTOR,
    );
  });

  afterAll(async () => {
    await client.close();
  });

  it('auto-plans a monthly schedule spreading the target across all days', async () => {
    const schedule = await earnings.profit.planMonth(
      { month: '2026-04', memberMonthlyBps: 3000, partnerMonthlyBps: 6000 },
      ACTOR,
    );
    expect(schedule.status).toBe('DRAFT');
    expect(schedule.days).toHaveLength(30); // April
    expect(schedule.days.every((d) => d.memberBps === 100 && d.partnerBps === 200)).toBe(true);
    expect(new Set(schedule.days.map((d) => d.distributeAt)).size).toBe(30); // distinct times
    expect(schedule.days.reduce((s, d) => s + d.memberBps, 0)).toBe(3000);
  });

  it('supports per-day override and publish, then locks editing', async () => {
    const tuned = await earnings.profit.setDay({ day: '2026-04-05', memberBps: 150 }, ACTOR);
    expect(tuned.days.find((d) => d.day === '2026-04-05')?.memberBps).toBe(150);

    const published = await earnings.profit.publish({ month: '2026-04' }, ACTOR);
    expect(published.status).toBe('PUBLISHED');

    await expect(
      earnings.profit.setDay({ day: '2026-04-06', memberBps: 120 }, ACTOR),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      earnings.profit.planMonth(
        { month: '2026-04', memberMonthlyBps: 10, partnerMonthlyBps: 10 },
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('distributes with explicit rates: member rate vs partner rate; zero-balance skipped', async () => {
    const result = await earnings.profit.distributeForDay(
      { day: '2026-03-15', memberBps: 100, partnerBps: 200 },
      ACTOR,
    );
    expect(result.membersCredited).toBe(1); // M1 (MZ skipped, 0 balance)
    expect(result.partnersCredited).toBe(1); // PN
    expect(result.memberAmountCents).toBe(300); // 1% of 30000
    expect(result.partnerAmountCents).toBe(1200); // 2% of 60000

    expect(await balance(M1)).toBe(30_300);
    expect(await balance(PN)).toBe(61_200);
    expect(await balance(MZ)).toBe(0); // skipped
  });

  it('is idempotent per day — re-running credits nothing more', async () => {
    const before1 = await balance(M1);
    const beforeP = await balance(PN);
    const result = await earnings.profit.distributeForDay(
      { day: '2026-03-15', memberBps: 100, partnerBps: 200 },
      ACTOR,
    );
    expect(result.membersCredited).toBe(1); // unchanged totals (persisted from first run)
    expect(await balance(M1)).toBe(before1); // no double credit
    expect(await balance(PN)).toBe(beforeP);
  });

  it('distributes using the published schedule rates when none are supplied', async () => {
    const beforeM1 = await balance(M1);
    const result = await earnings.profit.distributeForDay({ day: '2026-04-10' }, ACTOR);
    // Scheduled day rates are 100/200 bps.
    expect(result.memberBps).toBe(100);
    expect(result.partnerBps).toBe(200);
    expect(await balance(M1)).toBe(beforeM1 + Math.round((beforeM1 * 100) / 10_000));
  });

  it('rejects distribution when there are no rates and no published schedule', async () => {
    await expect(
      earnings.profit.distributeForDay({ day: '2027-01-01' }, ACTOR),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('writes audit entries for distributions', async () => {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'profit_distribution'));
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
