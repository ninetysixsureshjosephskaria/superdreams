import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/database/client';
import { depositTranches, members } from '@/database/schema';
import type { FinanceEvent } from '@/modules/finance';
import { createFinanceModule, type FinanceModule } from '@/modules/finance';
import type { FinanceAuthorizationPort } from '@/modules/finance/services/finance.service';
import { createWalletModule, type WalletModule } from '@/modules/wallet';

import { createDepositEarningsHandler, createEarningsModule, type EarningsModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000e1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};
const P = '00000000-0000-0000-0000-000000000e10'; // partner (commission beneficiary)
const R = '00000000-0000-0000-0000-000000000e11'; // referrer (referral beneficiary)
const M = '00000000-0000-0000-0000-000000000e12'; // depositor (partner=P, referredBy=R)
const M_REF1 = '00000000-0000-0000-0000-000000000e13'; // M's referral #1 (for activation)
const M_REF2 = '00000000-0000-0000-0000-000000000e14'; // M's referral #2

const HOUR = 60 * 60 * 1000;
const ALLOW: FinanceAuthorizationPort = { can: () => Promise.resolve(true) };
const reportErrorSpy = vi.fn();

async function seedMember(
  db: Database,
  id: string,
  suffix: string,
  rel: { partnerId?: string; referredBy?: string; createdAt?: Date } = {},
): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-ORC${suffix}`,
    firstName: 'Orc',
    lastName: suffix,
    email: `orc${suffix}@orchestration.test`,
    status: 'ACTIVE',
    partnerId: rel.partnerId ?? null,
    referredBy: rel.referredBy ?? null,
    ...(rel.createdAt ? { createdAt: rel.createdAt } : {}),
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

/**
 * LIVE-readiness Blocker 1 — the deposit-approval → earnings orchestration seam.
 * Subscribes the real handler to the real finance event bus, so approving a
 * deposit drives commission/referral, bonus application and activation via the
 * exact production path (finance publishes `DepositApproved` post-commit).
 */
describe('deposit-approval earnings orchestration (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let wallet: WalletModule;
  let finance: FinanceModule;
  let earnings: EarningsModule;

  async function approveDeposit(memberId: string, units: number): Promise<string> {
    const req = await finance.service.createDeposit(memberId, { units }, ACTOR);
    await finance.service.approve(req.id, {}, ACTOR); // fires DepositApproved → handler
    return req.id;
  }
  async function balance(memberId: string): Promise<number> {
    const w = await wallet.repositories.wallets.findByMemberId(memberId, 'FINANCIAL');
    return w ? (await wallet.service.getBalance(w.id)).availableMinor : 0;
  }
  async function trancheFor(depositId: string): Promise<typeof depositTranches.$inferSelect> {
    const [row] = await db
      .select()
      .from(depositTranches)
      .where(eq(depositTranches.depositRequestId, depositId));
    return row!;
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
      networkUnits: { totalNetworkUnits: () => Promise.resolve(100) }, // → 5% commission tier
      partners: { partnerMemberIds: () => Promise.resolve(new Set<string>()) },
    });

    // Wire the orchestration seam exactly as the composition root does.
    finance.events.subscribe(
      createDepositEarningsHandler({
        commission: earnings.commission,
        bonus: earnings.bonus,
        activation: earnings.activation,
        reportError: (failure) => {
          reportErrorSpy(failure);
        },
      }),
    );

    await seedMember(db, P, '01');
    await seedMember(db, R, '02');
    await seedMember(db, M, '03', { partnerId: P, referredBy: R });
    // M recruits two members within 24h → qualifies for the activation bonus.
    const now = Date.now();
    await seedMember(db, M_REF1, '04', { referredBy: M, createdAt: new Date(now - HOUR) });
    await seedMember(db, M_REF2, '05', { referredBy: M, createdAt: new Date(now - 2 * HOUR) });

    // A LIVE deposit-bonus campaign + an enabled FIXED activation bonus.
    await earnings.bonus.create(
      {
        name: 'All 10%',
        scope: 'ALL_DEPOSITS',
        frequency: 'MULTI',
        rateBps: 1000,
        permanent: true,
      },
      ACTOR,
    );
    await earnings.activation.updateConfig(
      { enabled: true, rewardType: 'FIXED', value: 500, lockDays: 30 },
      ACTOR,
    );
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(() => {
    reportErrorSpy.mockClear();
  });

  it('an approved deposit auto-credits commission + one-time referral', async () => {
    await approveDeposit(M, 10); // $300 = 30000 cents

    expect(await balance(P)).toBe(1500); // 5% commission
    expect(await balance(R)).toBe(600); // 2% referral
    expect(reportErrorSpy).not.toHaveBeenCalled();
  });

  it('applies the eligible bonus campaign to the deposit tranche', async () => {
    const [firstDeposit] = await finance.service.listByMember(M);
    expect((await trancheFor(firstDeposit!.id)).bonusCents).toBe(3000); // 10% of 30000
  });

  it('evaluates activation qualification and grants the bonus', async () => {
    // M's wallet = 30000 deposit principal + 500 FIXED activation bonus.
    expect(await balance(M)).toBe(30_500);
  });

  it('a duplicate DepositApproved event does not double-credit', async () => {
    const [firstDeposit] = await finance.service.listByMember(M);
    const duplicate: FinanceEvent = {
      type: 'DepositApproved',
      requestId: firstDeposit!.id,
      memberId: M,
      walletId: 'unused',
      trancheId: 'unused',
      transactionId: 'unused',
      amountCents: 30_000,
      actorId: ACTOR.userId,
      at: new Date(),
    };
    const handler = createDepositEarningsHandler({
      commission: earnings.commission,
      bonus: earnings.bonus,
      activation: earnings.activation,
      reportError: (failure) => {
        reportErrorSpy(failure);
      },
    });
    await handler(duplicate);

    expect(await balance(P)).toBe(1500); // unchanged
    expect(await balance(R)).toBe(600); // unchanged
    expect(await balance(M)).toBe(30_500); // unchanged
    expect((await trancheFor(firstDeposit!.id)).bonusCents).toBe(3000); // unchanged
  });

  it('a failed stage is reported (not silent) and leaves no partial financial state', async () => {
    // Force the bonus stage to throw on the next (auto-fired) run only.
    const spy = vi
      .spyOn(earnings.bonus, 'applyForDeposit')
      .mockImplementationOnce(() => Promise.reject(new Error('bonus engine boom')));

    const depositId = await approveDeposit(M, 10); // second deposit

    // Commission still credited (ran before the failing stage) → durable + consistent.
    expect(await balance(P)).toBe(3000); // 1500 + 1500
    // The failure was surfaced, not swallowed.
    expect(reportErrorSpy).toHaveBeenCalledTimes(1);
    expect(reportErrorSpy).toHaveBeenCalledWith(expect.objectContaining({ stage: 'bonus' }));
    // No partial state from the failed stage: the tranche carries no bonus.
    expect((await trancheFor(depositId)).bonusCents).toBe(0);

    // Re-driving is safe: bonus now applies, commission does NOT double-credit.
    spy.mockRestore();
    const handler = createDepositEarningsHandler({
      commission: earnings.commission,
      bonus: earnings.bonus,
      activation: earnings.activation,
      reportError: (failure) => {
        reportErrorSpy(failure);
      },
    });
    await handler({
      type: 'DepositApproved',
      requestId: depositId,
      memberId: M,
      walletId: 'unused',
      trancheId: 'unused',
      transactionId: 'unused',
      amountCents: 30_000,
      actorId: ACTOR.userId,
      at: new Date(),
    });

    expect((await trancheFor(depositId)).bonusCents).toBe(3000); // now applied
    expect(await balance(P)).toBe(3000); // commission unchanged (idempotent)
  });
});
