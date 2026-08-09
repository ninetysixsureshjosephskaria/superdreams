import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { FastifyBaseLogger } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/database/client';
import { depositTranches, members } from '@/database/schema';
import {
  createActivationSweepScheduler,
  createEarningsModule,
  type EarningsModule,
} from '@/modules/earnings';
import {
  createFinanceModule,
  createTrancheMaturityScheduler,
  type FinanceModule,
} from '@/modules/finance';
import type { FinanceAuthorizationPort } from '@/modules/finance/services/finance.service';
import { createWalletModule, type WalletModule } from '@/modules/wallet';

import { createSchedulerRuntime, type SchedulerRuntime } from '../scheduler-runtime';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000d1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};
const PM1 = '00000000-0000-0000-0000-000000000d10'; // funded member (daily profit)
const PPN = '00000000-0000-0000-0000-000000000d11'; // funded partner (daily profit)
const TM1 = '00000000-0000-0000-0000-000000000d12'; // member with a maturing tranche
const AR1 = '00000000-0000-0000-0000-000000000d13'; // recruiter that qualifies for activation
const AF1 = '00000000-0000-0000-0000-000000000d14'; // AR1 referral #1
const AF2 = '00000000-0000-0000-0000-000000000d15'; // AR1 referral #2

const HOUR = 60 * 60 * 1000;
const ALLOW: FinanceAuthorizationPort = { can: () => Promise.resolve(true) };
const partners = { partnerMemberIds: () => Promise.resolve(new Set<string>([PPN])) };

function fakeLogger(): FastifyBaseLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as unknown as FastifyBaseLogger;
}

async function seedMember(
  db: Database,
  id: string,
  suffix: string,
  rel: { referredBy?: string; createdAt?: Date } = {},
): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-SCH${suffix}`,
    firstName: 'Sch',
    lastName: suffix,
    email: `sch${suffix}@scheduler.test`,
    status: 'ACTIVE',
    referredBy: rel.referredBy ?? null,
    ...(rel.createdAt ? { createdAt: rel.createdAt } : {}),
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

/**
 * LIVE-readiness Blocker 2 — the scheduler runtime actually runs the existing
 * (idempotent) job factories: daily-profit distribution, tranche maturity and
 * the activation sweep. Uses the same wiring the composition root uses.
 */
describe('scheduler runtime — real jobs (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let wallet: WalletModule;
  let finance: FinanceModule;
  let earnings: EarningsModule;
  let runtime: SchedulerRuntime;
  let logger: FastifyBaseLogger;

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
      partners,
    });

    await Promise.all([
      seedMember(db, PM1, '10'),
      seedMember(db, PPN, '11'),
      seedMember(db, TM1, '12'),
      seedMember(db, AR1, '13'),
    ]);
    // AR1 recruits two members within 24h → qualifies for the activation bonus.
    const now = Date.now();
    await seedMember(db, AF1, '14', { referredBy: AR1, createdAt: new Date(now - HOUR) });
    await seedMember(db, AF2, '15', { referredBy: AR1, createdAt: new Date(now - 2 * HOUR) });

    // Fund the daily-profit accounts.
    const dPm1 = await finance.service.createDeposit(PM1, { units: 10 }, ACTOR); // 30000
    await finance.service.approve(dPm1.id, {}, ACTOR);
    const dPpn = await finance.service.createDeposit(PPN, { units: 20 }, ACTOR); // 60000
    await finance.service.approve(dPpn.id, {}, ACTOR);

    // A locked tranche for TM1 with a bonus, forced due.
    const dTm1 = await finance.service.createDeposit(TM1, { units: 10 }, ACTOR); // 30000
    await finance.service.approve(dTm1.id, {}, ACTOR);
    await db
      .update(depositTranches)
      .set({ bonusCents: 1500, maturesAt: new Date(now - 1000) })
      .where(eq(depositTranches.depositRequestId, dTm1.id));

    // Publish the current month's profit schedule so "today" has rates.
    const month = new Date().toISOString().slice(0, 7);
    await earnings.profit.planMonth(
      { month, memberMonthlyBps: 3000, partnerMonthlyBps: 6000 },
      ACTOR,
    );
    await earnings.profit.publish({ month }, ACTOR);

    // Enable the activation bonus (FIXED $5).
    await earnings.activation.updateConfig(
      { enabled: true, rewardType: 'FIXED', value: 500, lockDays: 30 },
      ACTOR,
    );

    // Wire the runtime exactly as the composition root does.
    logger = fakeLogger();
    const trancheMaturity = createTrancheMaturityScheduler(finance.service);
    const activationSweep = createActivationSweepScheduler(earnings.activation);
    runtime = createSchedulerRuntime({
      intervalMs: 3_600_000,
      logger,
      jobs: [
        { name: 'profit-distribution', run: () => earnings.profitScheduler.run() },
        { name: 'tranche-maturity', run: () => trancheMaturity.run() },
        { name: 'activation-sweep', run: () => activationSweep.run() },
      ],
    });
  });

  afterAll(async () => {
    runtime.stop();
    await client.close();
  });

  beforeEach(() => {
    (logger.error as ReturnType<typeof vi.fn>).mockClear();
  });

  it('exposes the three finance/earnings jobs', () => {
    expect(runtime.listJobs()).toEqual([
      'profit-distribution',
      'tranche-maturity',
      'activation-sweep',
    ]);
    expect(runtime.isRunning()).toBe(false);
  });

  it('the tranche-maturity job credits the matured bonus (idempotent)', async () => {
    expect(await balance(TM1)).toBe(30_000); // principal only, pre-maturity

    await runtime.runJobOnce('tranche-maturity');
    expect(await balance(TM1)).toBe(31_500); // + 1500 bonus

    await runtime.runJobOnce('tranche-maturity'); // idempotent
    expect(await balance(TM1)).toBe(31_500);
  });

  it('the activation-sweep job grants to a newly-qualifying recruiter (idempotent)', async () => {
    expect(await balance(AR1)).toBe(0);

    await runtime.runJobOnce('activation-sweep');
    expect(await balance(AR1)).toBe(500); // FIXED activation bonus

    await runtime.runJobOnce('activation-sweep'); // idempotent
    expect(await balance(AR1)).toBe(500);
  });

  it('the profit-distribution job distributes to funded accounts (idempotent per day)', async () => {
    const before = await balance(PM1);

    await runtime.runJobOnce('profit-distribution');
    const afterFirst = await balance(PM1);
    expect(afterFirst).toBeGreaterThan(before); // credited today's profit

    await runtime.runJobOnce('profit-distribution'); // same day → idempotent
    expect(await balance(PM1)).toBe(afterFirst);
  });

  it('a job failure is isolated (logged, not thrown) and does not affect the runtime', async () => {
    const spy = vi
      .spyOn(earnings.activation, 'processAll')
      .mockRejectedValueOnce(new Error('sweep engine boom'));

    await expect(runtime.runJobOnce('activation-sweep')).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'activation-sweep' }),
      expect.any(String),
    );

    spy.mockRestore();
    // Recovers on the next run.
    await expect(runtime.runJobOnce('activation-sweep')).resolves.toBeUndefined();
  });
});
