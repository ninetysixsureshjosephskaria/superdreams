import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { members } from '@/database/schema';
import { BusinessRuleError, ConflictError, ForbiddenError } from '@/errors';
import { createWalletModule, type WalletModule } from '@/modules/wallet';

import { createFinanceModule, type FinanceModule } from '../index';
import type { FinanceAuthorizationPort } from '../services/finance.service';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000a1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};

const M1 = '00000000-0000-0000-0000-000000000101'; // deposit → withdraw chain
const M2 = '00000000-0000-0000-0000-000000000102'; // reject
const M3 = '00000000-0000-0000-0000-000000000103'; // withdraw with no wallet
const M4 = '00000000-0000-0000-0000-000000000104'; // forbidden approval

const ALLOW: FinanceAuthorizationPort = { can: () => Promise.resolve(true) };
const DENY: FinanceAuthorizationPort = { can: () => Promise.resolve(false) };

async function seedMember(db: Database, id: string, suffix: string): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-FIN${suffix}`,
    firstName: 'Fin',
    lastName: suffix,
    email: `fin${suffix}@finance.test`,
    status: 'ACTIVE',
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

/**
 * Phase 2B — deposit / withdrawal requests move real money only on approval, and
 * do so atomically through the wallet compose seam (credit/debit + tranche in one
 * transaction). Amounts are USD cents; 1 unit = $30.
 */
describe('phase 2b finance requests & tranches (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let wallet: WalletModule;
  let finance: FinanceModule;
  let financeDenied: FinanceModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    wallet = createWalletModule(db);
    finance = createFinanceModule(db, wallet.service, wallet.repositories.wallets, ALLOW);
    financeDenied = createFinanceModule(db, wallet.service, wallet.repositories.wallets, DENY);
    await Promise.all([
      seedMember(db, M1, '01'),
      seedMember(db, M2, '02'),
      seedMember(db, M3, '03'),
      seedMember(db, M4, '04'),
    ]);
  });

  afterAll(async () => {
    await client.close();
  });

  it('approving a deposit credits a new FINANCIAL wallet and creates a locked tranche atomically', async () => {
    const request = await finance.service.createDeposit(M1, { units: 10 }, ACTOR);
    expect(request.type).toBe('DEPOSIT');
    expect(request.status).toBe('PENDING');
    expect(request.amountCents).toBe(30_000);
    expect(request.units).toBe(10);

    const approved = await finance.service.approve(request.id, {}, ACTOR);
    expect(approved.status).toBe('APPROVED');
    expect(approved.walletId).not.toBeNull();

    // FINANCIAL wallet was created ACTIVE and credited.
    const finWallet = await wallet.repositories.wallets.findByMemberId(M1, 'FINANCIAL');
    expect(finWallet?.status).toBe('ACTIVE');
    const balance = await wallet.service.getBalance(finWallet!.id);
    expect(balance.availableMinor).toBe(30_000);

    // A 30-day locked tranche was created for the principal.
    const tranches = await finance.service.listTranchesByMember(M1);
    expect(tranches).toHaveLength(1);
    expect(tranches[0]?.status).toBe('LOCKED');
    expect(tranches[0]?.principalCents).toBe(30_000);
    expect(tranches[0]?.lockDays).toBe(30);
    expect(tranches[0]?.depositRequestId).toBe(request.id);
  });

  it('rejects re-deciding an already-approved request', async () => {
    const [request] = await finance.service.listByMember(M1);
    await expect(finance.service.approve(request!.id, {}, ACTOR)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('rejects a withdrawal that exceeds the available balance', async () => {
    await expect(finance.service.createWithdrawal(M1, { units: 20 }, ACTOR)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it('approving a withdrawal debits the wallet', async () => {
    const request = await finance.service.createWithdrawal(M1, { units: 5 }, ACTOR);
    expect(request.type).toBe('WITHDRAW');
    const approved = await finance.service.approve(request.id, {}, ACTOR);
    expect(approved.status).toBe('APPROVED');

    const finWallet = await wallet.repositories.wallets.findByMemberId(M1, 'FINANCIAL');
    const balance = await wallet.service.getBalance(finWallet!.id);
    expect(balance.availableMinor).toBe(15_000); // 30_000 - 15_000
  });

  it('rejecting a deposit moves no money', async () => {
    const request = await finance.service.createDeposit(M2, { units: 3 }, ACTOR);
    const rejected = await finance.service.reject(
      request.id,
      { reason: 'Unverified source' },
      ACTOR,
    );
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.reason).toBe('Unverified source');
    // No FINANCIAL wallet was created for a rejected deposit.
    const finWallet = await wallet.repositories.wallets.findByMemberId(M2, 'FINANCIAL');
    expect(finWallet).toBeNull();
  });

  it('rejects a withdrawal when the member has no financial wallet', async () => {
    await expect(finance.service.createWithdrawal(M3, { units: 1 }, ACTOR)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it('forbids approval without the type-specific permission and leaves the request pending', async () => {
    const request = await finance.service.createDeposit(M4, { units: 2 }, ACTOR);
    await expect(financeDenied.service.approve(request.id, {}, ACTOR)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    const stillPending = await finance.service.getById(request.id);
    expect(stillPending.status).toBe('PENDING');
    // No wallet / tranche side effects from the forbidden attempt.
    expect(await wallet.repositories.wallets.findByMemberId(M4, 'FINANCIAL')).toBeNull();
    expect(await finance.service.listTranchesByMember(M4)).toHaveLength(0);
  });

  it('lists requests for the admin action queue with filters', async () => {
    const deposits = await finance.service.list({ type: 'DEPOSIT' });
    expect(deposits.items.every((r) => r.type === 'DEPOSIT')).toBe(true);
    const pending = await finance.service.list({ status: 'PENDING' });
    expect(pending.items.every((r) => r.status === 'PENDING')).toBe(true);
  });

  it('exposes the reference-defined limits defaults', async () => {
    const limits = await finance.service.getLimits(ACTOR);
    expect(limits.minDepositUnits).toBe(1);
    expect(limits.maxDepositUnits).toBe(10_000);
    expect(limits.minWithdrawCents).toBe(3000); // $30
    expect(limits.earlyWithdrawAllowed).toBe(true);
    expect(limits.earlyWithdrawFeeBps).toBe(1000); // 10%
  });

  it('enforces the deposit maximum and rejects an inconsistent limits update', async () => {
    await finance.service.updateLimits({ maxDepositUnits: 5 }, ACTOR);
    await expect(finance.service.createDeposit(M2, { units: 6 }, ACTOR)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
    // A deposit within the new ceiling still succeeds.
    const ok = await finance.service.createDeposit(M2, { units: 3 }, ACTOR);
    expect(ok.status).toBe('PENDING');
    // max < min is rejected.
    await expect(finance.service.updateLimits({ minDepositUnits: 10 }, ACTOR)).rejects.toThrow(
      /greater than or equal to the minimum/i,
    );
    // Restore the default ceiling for any later assertions.
    await finance.service.updateLimits({ maxDepositUnits: 10_000 }, ACTOR);
  });
});
