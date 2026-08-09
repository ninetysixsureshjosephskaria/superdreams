import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members, users, walletTransactions } from '@/database/schema';

import { deltasFor } from '../domain/balance';
import { createWalletModule, type WalletModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000aa',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  correlationId: null,
};

const MEMBER_ID = '00000000-0000-0000-0000-000000000b01';
const OWNER_USER_ID = '00000000-0000-0000-0000-0000000000bb';
const OWNER_MEMBER_ID = '00000000-0000-0000-0000-000000000b02';

async function activeWallet(mod: WalletModule, memberId: string): Promise<string> {
  const wallet = await mod.service.create({ memberId, currencyCode: 'USD' }, ACTOR);
  await mod.service.changeStatus(wallet.id, { status: 'ACTIVE' }, ACTOR);
  return wallet.id;
}

describe('wallet module (PGlite)', () => {
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
      memberNumber: 'M-WALLET01',
      firstName: 'Wanda',
      lastName: 'Maximoff',
      email: 'wanda@wallet.test',
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    await client.close();
  });

  it('creates a wallet with a zeroed balance projection and PENDING status', async () => {
    const wallet = await mod.service.create({ memberId: MEMBER_ID, currencyCode: 'usd' }, ACTOR);
    expect(wallet.walletNumber).toMatch(/^W-/);
    expect(wallet.status).toBe('PENDING');
    expect(wallet.currencyCode).toBe('USD');
    expect(wallet.balance).toEqual({
      currencyCode: 'USD',
      availableMinor: 0,
      heldMinor: 0,
      totalMinor: 0,
    });
    expect(wallet.limits?.minBalanceMinor).toBe(0);
  });

  it('rejects a second wallet for the same member', async () => {
    await expect(mod.service.create({ memberId: MEMBER_ID }, ACTOR)).rejects.toThrow(
      /already has a (loyalty )?wallet/i,
    );
  });

  it('rejects transactions on a non-active wallet', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-PEND',
        firstName: 'Pending',
        lastName: 'Wallet',
        email: 'pending@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const wallet = await mod.service.create({ memberId: member[0]!.id }, ACTOR);
    await expect(mod.service.credit(wallet.id, { amountMinor: 100 }, ACTOR)).rejects.toThrow(
      /must be ACTIVE/i,
    );
  });

  it('credits, debits and adjusts, keeping available balance exact', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-TX',
        firstName: 'Ledger',
        lastName: 'Keeper',
        email: 'ledger@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const walletId = await activeWallet(mod, member[0]!.id);

    const credit = await mod.service.credit(
      walletId,
      { amountMinor: 10_000, description: 'Initial load' },
      ACTOR,
    );
    expect(credit.type).toBe('CREDIT');
    expect(credit.availableAfterMinor).toBe(10_000);

    await mod.service.debit(walletId, { amountMinor: 3_000 }, ACTOR);
    await mod.service.adjust(
      walletId,
      { direction: 'CREDIT', amountMinor: 500, reason: 'Goodwill' },
      ACTOR,
    );
    await mod.service.adjust(
      walletId,
      { direction: 'DEBIT', amountMinor: 500, reason: 'Correction' },
      ACTOR,
    );

    const balance = await mod.service.getBalance(walletId);
    expect(balance.availableMinor).toBe(7_000);
    expect(balance.heldMinor).toBe(0);
    expect(balance.totalMinor).toBe(7_000);
  });

  it('prevents debiting below zero (no negative balance)', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-NEG',
        firstName: 'No',
        lastName: 'Overdraft',
        email: 'neg@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const walletId = await activeWallet(mod, member[0]!.id);
    await mod.service.credit(walletId, { amountMinor: 1_000 }, ACTOR);
    await expect(mod.service.debit(walletId, { amountMinor: 5_000 }, ACTOR)).rejects.toThrow(
      /insufficient/i,
    );
  });

  it('holds and releases funds without changing the total', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-HOLD',
        firstName: 'Holder',
        lastName: 'Funds',
        email: 'hold@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const walletId = await activeWallet(mod, member[0]!.id);
    await mod.service.credit(walletId, { amountMinor: 5_000 }, ACTOR);

    const hold = await mod.service.placeHold(walletId, { amountMinor: 2_000 }, ACTOR);
    let balance = await mod.service.getBalance(walletId);
    expect(balance).toMatchObject({ availableMinor: 3_000, heldMinor: 2_000, totalMinor: 5_000 });

    await mod.service.releaseHold(walletId, hold.id, ACTOR);
    balance = await mod.service.getBalance(walletId);
    expect(balance).toMatchObject({ availableMinor: 5_000, heldMinor: 0, totalMinor: 5_000 });
  });

  it('reverses a transaction and flags the original as REVERSED', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-REV',
        firstName: 'Rev',
        lastName: 'Ersal',
        email: 'rev@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const walletId = await activeWallet(mod, member[0]!.id);
    const credit = await mod.service.credit(walletId, { amountMinor: 4_000 }, ACTOR);

    const reversal = await mod.service.reverse(walletId, credit.id, ACTOR);
    expect(reversal.type).toBe('REVERSAL');
    expect(reversal.reversalOfId).toBe(credit.id);

    const balance = await mod.service.getBalance(walletId);
    expect(balance.availableMinor).toBe(0);

    const [original] = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.id, credit.id));
    expect(original?.status).toBe('REVERSED');

    await expect(mod.service.reverse(walletId, credit.id, ACTOR)).rejects.toThrow(
      /already been reversed/i,
    );
  });

  it('keeps the stored balance consistent with the derived ledger balance', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-INT',
        firstName: 'Integrity',
        lastName: 'Check',
        email: 'integrity@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const walletId = await activeWallet(mod, member[0]!.id);
    await mod.service.credit(walletId, { amountMinor: 9_999 }, ACTOR);
    await mod.service.debit(walletId, { amountMinor: 1_234 }, ACTOR);
    const hold = await mod.service.placeHold(walletId, { amountMinor: 2_000 }, ACTOR);
    await mod.service.releaseHold(walletId, hold.id, ACTOR);

    const validation = await mod.service.validateBalance(walletId);
    expect(validation.consistent).toBe(true);
    expect(validation.derivedAvailableMinor).toBe(validation.storedAvailableMinor);
    expect(validation.derivedHeldMinor).toBe(validation.storedHeldMinor);

    // Every ledger snapshot equals the running fold up to that entry.
    const ledger = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId));
    ledger.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let available = 0;
    let held = 0;
    for (const entry of ledger) {
      const delta = deltasFor(entry.type, entry.direction, entry.amountMinor);
      available += delta.availableMinor;
      held += delta.heldMinor;
      expect(entry.availableAfterMinor).toBe(available);
      expect(entry.heldAfterMinor).toBe(held);
    }
  });

  it('handles concurrent credits without losing updates', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-CONC',
        firstName: 'Race',
        lastName: 'Free',
        email: 'conc@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const walletId = await activeWallet(mod, member[0]!.id);

    await Promise.all(
      Array.from({ length: 20 }, () => mod.service.credit(walletId, { amountMinor: 100 }, ACTOR)),
    );

    const balance = await mod.service.getBalance(walletId);
    expect(balance.availableMinor).toBe(2_000);
    const validation = await mod.service.validateBalance(walletId);
    expect(validation.consistent).toBe(true);
  });

  it('lists and filters the ledger with pagination', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-LIST',
        firstName: 'Page',
        lastName: 'Nator',
        email: 'list@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const walletId = await activeWallet(mod, member[0]!.id);
    await mod.service.credit(walletId, { amountMinor: 1_000 }, ACTOR);
    await mod.service.credit(walletId, { amountMinor: 2_000 }, ACTOR);
    await mod.service.debit(walletId, { amountMinor: 500 }, ACTOR);

    const firstPage = await mod.service.listTransactions(walletId, { page: 1, pageSize: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(3);

    const debits = await mod.service.listTransactions(walletId, { type: 'DEBIT' });
    expect(debits.items.every((t) => t.type === 'DEBIT')).toBe(true);
    expect(debits.items).toHaveLength(1);
  });

  it('generates a statement summarising credits and debits', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-STMT',
        firstName: 'State',
        lastName: 'Ment',
        email: 'stmt@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const walletId = await activeWallet(mod, member[0]!.id);
    await mod.service.credit(walletId, { amountMinor: 8_000 }, ACTOR);
    await mod.service.debit(walletId, { amountMinor: 3_000 }, ACTOR);

    const statement = await mod.service.generateStatement(walletId, {}, ACTOR);
    expect(statement.totalCreditsMinor).toBe(8_000);
    expect(statement.totalDebitsMinor).toBe(3_000);
    expect(statement.closingBalanceMinor).toBe(5_000);
    expect(statement.transactionCount).toBe(2);

    const statements = await mod.service.listStatements(walletId);
    expect(statements).toHaveLength(1);
  });

  it('closes a wallet and blocks further transactions', async () => {
    const member = await db
      .insert(members)
      .values({
        memberNumber: 'M-WALLET-CLOSE',
        firstName: 'Close',
        lastName: 'Down',
        email: 'close@wallet.test',
        status: 'ACTIVE',
      })
      .returning();
    const walletId = await activeWallet(mod, member[0]!.id);
    await mod.service.changeStatus(walletId, { status: 'CLOSED' }, ACTOR);
    await expect(mod.service.credit(walletId, { amountMinor: 100 }, ACTOR)).rejects.toThrow(
      /must be ACTIVE/i,
    );
  });

  it('resolves the wallet owned by a linked identity user, by kind (ownership path)', async () => {
    await db.insert(users).values({ id: OWNER_USER_ID, email: 'owner-user@wallet.test' });
    await db.insert(members).values({
      id: OWNER_MEMBER_ID,
      memberNumber: 'M-WALLET-OWNER',
      firstName: 'Owner',
      lastName: 'Self',
      email: 'owner@wallet.test',
      userId: OWNER_USER_ID,
      status: 'ACTIVE',
    });
    const wallet = await mod.service.create({ memberId: OWNER_MEMBER_ID }, ACTOR);

    const mine = await mod.service.getByUserId(OWNER_USER_ID);
    expect(mine?.id).toBe(wallet.id);
    expect(mine?.kind).toBe('LOYALTY');
    expect(await mod.service.getByUserId('11111111-1111-1111-1111-111111111111')).toBeNull();

    // Phase 2F member funds view: the FINANCIAL wallet is a separate wallet the
    // member resolves via kind. It must not shadow the default LOYALTY lookup.
    const financial = await mod.service.create(
      { memberId: OWNER_MEMBER_ID, kind: 'FINANCIAL' },
      ACTOR,
    );
    const mineFinancial = await mod.service.getByUserId(OWNER_USER_ID, 'FINANCIAL');
    expect(mineFinancial?.id).toBe(financial.id);
    expect(mineFinancial?.kind).toBe('FINANCIAL');
    expect((await mod.service.getByUserId(OWNER_USER_ID))?.id).toBe(wallet.id);
  });

  it('audits balance-changing operations', async () => {
    const rows = await db.select().from(auditLogs);
    expect(rows.some((row) => row.module === 'wallet' && row.entityType === 'wallet')).toBe(true);
    expect(
      rows.some((row) => row.module === 'wallet' && row.entityType === 'wallet_transaction'),
    ).toBe(true);
  });
});
