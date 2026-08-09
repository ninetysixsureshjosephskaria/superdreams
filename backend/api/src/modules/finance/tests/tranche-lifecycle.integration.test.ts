import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, depositTranches, members, users } from '@/database/schema';
import { BusinessRuleError, ConflictError, ForbiddenError } from '@/errors';
import { createWalletModule, type WalletModule } from '@/modules/wallet';

import { createFinanceModule, type FinanceModule } from '../index';
import type { FinanceAuthorizationPort } from '../services/finance.service';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000e1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};
const U2 = '00000000-0000-0000-0000-0000000000e2';
const M1 = '00000000-0000-0000-0000-000000000e11'; // maturity
const M2 = '00000000-0000-0000-0000-000000000e12'; // early-unlock (owns U2)
const M3 = '00000000-0000-0000-0000-000000000e13'; // insufficient balance

const ALLOW: FinanceAuthorizationPort = { can: () => Promise.resolve(true) };

async function seedMember(
  db: Database,
  id: string,
  suffix: string,
  userId?: string,
): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-TRN${suffix}`,
    firstName: 'Tr',
    lastName: suffix,
    email: `trn${suffix}@tranche.test`,
    status: 'ACTIVE',
    userId: userId ?? null,
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

/** Approves a deposit for `memberId` (creates the FINANCIAL wallet + a LOCKED tranche). */
async function fundedTranche(
  finance: FinanceModule,
  memberId: string,
  units: number,
): Promise<string> {
  const req = await finance.service.createDeposit(memberId, { units }, ACTOR);
  await finance.service.approve(req.id, {}, ACTOR);
  const [tranche] = await finance.service.listTranchesByMember(memberId);
  return tranche!.id;
}

/** Phase 2E — deposit-tranche maturity (bonus credit, idempotent) + early-unlock (fee + forfeit). */
describe('phase 2e tranche lifecycle (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let wallet: WalletModule;
  let finance: FinanceModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    wallet = createWalletModule(db);
    finance = createFinanceModule(db, wallet.service, wallet.repositories.wallets, ALLOW);
    await db.insert(users).values({ id: U2, email: 'u2@tranche.test', status: 'ACTIVE' });
    await Promise.all([
      seedMember(db, M1, '01'),
      seedMember(db, M2, '02', U2),
      seedMember(db, M3, '03'),
    ]);
  });

  afterAll(async () => {
    await client.close();
  });

  it('matures due tranches, credits the bonus exactly once, and is idempotent', async () => {
    const trancheId = await fundedTranche(finance, M1, 10); // principal 30000, bonus 0
    const finWallet = await wallet.repositories.wallets.findByMemberId(M1, 'FINANCIAL');
    // Simulate a deposit bonus attached to the tranche + make it due.
    await db
      .update(depositTranches)
      .set({ bonusCents: 1500, maturesAt: new Date(Date.now() - 1000) })
      .where(eq(depositTranches.id, trancheId));

    const result = await finance.service.matureTranches(ACTOR, new Date());
    expect(result.maturedCount).toBe(1);
    expect(result.bonusCreditedCents).toBe(1500);

    const balance = await wallet.service.getBalance(finWallet!.id);
    expect(balance.availableMinor).toBe(31_500); // 30000 principal + 1500 bonus

    const [matured] = await finance.service.listTranchesByMember(M1);
    expect(matured?.status).toBe('MATURED');

    // Idempotent — a second run credits nothing more.
    const rerun = await finance.service.matureTranches(ACTOR, new Date());
    expect(rerun.maturedCount).toBe(0);
    expect((await wallet.service.getBalance(finWallet!.id)).availableMinor).toBe(31_500);
  });

  it('does not mature tranches that are not yet due', async () => {
    await fundedTranche(finance, M3, 5); // maturesAt ~30 days out, LOCKED
    const result = await finance.service.matureTranches(ACTOR, new Date());
    expect(result.maturedCount).toBe(0);
    const [t] = await finance.service.listTranchesByMember(M3);
    expect(t?.status).toBe('LOCKED');
  });

  it('early-unlock forfeits the bonus and charges the configured fee', async () => {
    const trancheId = await fundedTranche(finance, M2, 10); // principal 30000
    const finWallet = await wallet.repositories.wallets.findByMemberId(M2, 'FINANCIAL');
    await db
      .update(depositTranches)
      .set({ bonusCents: 2000 })
      .where(eq(depositTranches.id, trancheId));

    const unlocked = await finance.service.earlyUnlockMyTranche(U2, trancheId, ACTOR);
    expect(unlocked.status).toBe('LIQUIDATED');
    // Default fee 10% of principal (limits earlyWithdrawFeeBps=1000) — see flagged conflict.
    expect(unlocked.feeCents).toBe(3000);
    expect(unlocked.bonusCents).toBe(0); // forfeited

    const balance = await wallet.service.getBalance(finWallet!.id);
    expect(balance.availableMinor).toBe(27_000); // 30000 - 3000 fee
  });

  it('rejects early-unlock of a tranche the caller does not own', async () => {
    const trancheId = await fundedTranche(finance, M1, 1);
    // M1's tranche cannot be unlocked via U2 (who is M2).
    await expect(finance.service.earlyUnlockMyTranche(U2, trancheId, ACTOR)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('rejects early-unlock of a non-locked tranche', async () => {
    const [matured] = await finance.service.listTranchesByMember(M1);
    // M1's first tranche is MATURED from the earlier test.
    const maturedId = (await finance.service.listTranchesByMember(M1)).find(
      (t) => t.status === 'MATURED',
    )!.id;
    expect(matured).toBeDefined();
    await expect(finance.service.earlyUnlockTranche(maturedId, ACTOR)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('rolls back early-unlock when the wallet cannot cover the fee', async () => {
    const trancheId = await fundedTranche(finance, M3, 10); // wallet 30000 + earlier 5-unit = 45000
    const finWallet = await wallet.repositories.wallets.findByMemberId(M3, 'FINANCIAL');
    // Drain the wallet via an approved withdrawal so the fee cannot be charged.
    const bal = await wallet.service.getBalance(finWallet!.id);
    const wd = await finance.service.createWithdrawal(
      M3,
      { units: bal.availableMinor / 3000 },
      ACTOR,
    );
    await finance.service.approve(wd.id, {}, ACTOR);
    expect((await wallet.service.getBalance(finWallet!.id)).availableMinor).toBe(0);

    await expect(finance.service.earlyUnlockTranche(trancheId, ACTOR)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
    // Tranche remains LOCKED (rolled back).
    const t = (await finance.service.listTranchesByMember(M3)).find((x) => x.id === trancheId);
    expect(t?.status).toBe('LOCKED');
    expect(t?.feeCents).toBe(0);
  });

  it('writes audit entries for tranche state changes', async () => {
    const trancheAudits = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'deposit_tranche'));
    expect(trancheAudits.some((a) => a.action === 'UPDATE')).toBe(true);
    expect(trancheAudits.length).toBeGreaterThanOrEqual(2); // maturity + liquidation
  });
});
