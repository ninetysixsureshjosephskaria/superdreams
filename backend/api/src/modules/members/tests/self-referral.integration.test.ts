import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { members as membersTable, users } from '@/database/schema';
import { createEarningsModule, type EarningsModule } from '@/modules/earnings';
import type { NetworkUnitsPort } from '@/modules/earnings/services';
import { createFinanceModule, type FinanceModule } from '@/modules/finance';
import type { FinanceAuthorizationPort } from '@/modules/finance/services/finance.service';
import { createNetworkModule, type NetworkModule } from '@/modules/network';
import type { RoleAssignerPort, UnitsProviderPort } from '@/modules/network/services';
import { createWalletModule, type WalletModule } from '@/modules/wallet';

import { createMembersModule, type MembersModule } from '../index';
import type { MemberRow } from '../mappers';

const ACTOR_ID = '00000000-0000-0000-0000-0000000000ff';

const ALLOW: FinanceAuthorizationPort = { can: () => Promise.resolve(true) };
const networkUnits: NetworkUnitsPort = { totalNetworkUnits: () => Promise.resolve(100) };

// Network module stubs (units/role-assigner are irrelevant to the read paths here).
const unitsStub: UnitsProviderPort = { getUnits: () => Promise.resolve(0) };
const roleAssignerStub: RoleAssignerPort = { assignRoleByKey: () => Promise.resolve() };

/** Phase 2H — self-service referral lifecycle (provision → verify → apply). */
describe('phase 2h self-service referral (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let members: MembersModule;
  let network: NetworkModule;
  let wallet: WalletModule;
  let finance: FinanceModule;
  let earnings: EarningsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    members = createMembersModule(db);
    network = createNetworkModule(db, { units: unitsStub, roleAssigner: roleAssignerStub });
    wallet = createWalletModule(db);
    finance = createFinanceModule(db, wallet.service, wallet.repositories.wallets, ALLOW);
    earnings = createEarningsModule(db, {
      wallet: wallet.service,
      walletRepo: wallet.repositories.wallets,
      networkUnits,
      partners: { partnerMemberIds: () => Promise.resolve(new Set<string>()) },
    });
  });

  afterAll(async () => {
    await client.close();
  });

  // --- helpers ---------------------------------------------------------------

  async function seedUser(): Promise<string> {
    const id = randomUUID();
    await db.insert(users).values({ id, email: `${id}@ref.test`, status: 'ACTIVE' });
    return id;
  }

  /** Provisions a new member for a fresh auth user, optionally with an inbound code. */
  async function register(referralCode?: string): Promise<{ userId: string; memberId: string }> {
    const userId = await seedUser();
    await members.service.provisionForUser({
      userId,
      email: `${userId}@ref.test`,
      firstName: 'Ref',
      lastName: 'Erral',
      referralCode,
    });
    const member = await members.repositories.members.findByUserId(userId);
    if (!member) {
      throw new Error('member not provisioned');
    }
    return { userId, memberId: member.id };
  }

  /** Registers then activates (email verification), returning the member id + code. */
  async function registerActive(
    referralCode?: string,
  ): Promise<{ userId: string; memberId: string; code: string }> {
    const { userId, memberId } = await register(referralCode);
    await members.service.activateByUserId(userId);
    const member = await members.repositories.members.findByUserId(userId);
    return { userId, memberId, code: member!.referralCode! };
  }

  /** Seeds a member row directly (for referrers we need in a specific state). */
  async function seedMemberRow(opts: {
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
    referralCode?: string;
    referredBy?: string;
    pendingReferrerId?: string;
    userId?: string;
  }): Promise<string> {
    const id = randomUUID();
    await db.insert(membersTable).values({
      id,
      memberNumber: `M-${id.slice(0, 8).toUpperCase()}`,
      firstName: 'Seed',
      lastName: 'Member',
      email: `${id}@seed.test`,
      status: opts.status,
      referralCode: opts.referralCode ?? null,
      referredBy: opts.referredBy ?? null,
      pendingReferrerId: opts.pendingReferrerId ?? null,
      userId: opts.userId ?? null,
      createdBy: ACTOR_ID,
      updatedBy: ACTOR_ID,
    });
    return id;
  }

  async function row(memberId: string): Promise<MemberRow> {
    const found = await members.repositories.members.findById(memberId);
    if (!found) {
      throw new Error(`member ${memberId} not found`);
    }
    return found;
  }

  async function financialUnits(memberId: string): Promise<number> {
    const w = await wallet.repositories.wallets.findByMemberId(memberId, 'FINANCIAL');
    if (!w) {
      return 0;
    }
    return (await wallet.service.getBalance(w.id)).availableMinor;
  }

  // --- tests -----------------------------------------------------------------

  it('gives an existing member a referral code after provisionForUser', async () => {
    const { memberId } = await register();
    const member = await row(memberId);
    expect(member.referralCode).toMatch(/^[A-Z0-9]{12}$/);
  });

  it('keeps the referral code stable across repeated ensure/provision', async () => {
    const { userId, memberId } = await register();
    const first = (await row(memberId)).referralCode;
    // Re-provision (idempotent early-return branch) must not rotate the code.
    await members.service.provisionForUser({
      userId,
      email: `${userId}@ref.test`,
      firstName: 'Ref',
      lastName: 'Erral',
    });
    const second = (await row(memberId)).referralCode;
    expect(second).toBe(first);
  });

  it('normal registration without a referral works with NULL relationships', async () => {
    const { memberId } = await register();
    const member = await row(memberId);
    expect(member.referredBy).toBeNull();
    expect(member.partnerId).toBeNull();
    expect(member.pendingReferrerId).toBeNull();
    expect(member.referralCode).toBeTruthy();
  });

  it('captures pendingReferrerId at registration but leaves referredBy/partnerId NULL', async () => {
    const a = await registerActive();
    const b = await register(a.code);
    const member = await row(b.memberId);
    expect(member.pendingReferrerId).toBe(a.memberId);
    expect(member.referredBy).toBeNull();
    expect(member.partnerId).toBeNull();
  });

  it('applies referredBy=partnerId=referrer exactly once at verification', async () => {
    const a = await registerActive();
    const b = await register(a.code);
    await members.service.activateByUserId(b.userId);

    const applied = await row(b.memberId);
    expect(applied.referredBy).toBe(a.memberId);
    expect(applied.partnerId).toBe(a.memberId);
    expect(applied.pendingReferrerId).toBeNull();
    expect(applied.status).toBe('ACTIVE');

    // Repeated verification is a no-op — relationship unchanged, not duplicated.
    await members.service.activateByUserId(b.userId);
    const again = await row(b.memberId);
    expect(again.referredBy).toBe(a.memberId);
    expect(again.partnerId).toBe(a.memberId);
    expect(again.pendingReferrerId).toBeNull();
  });

  it('does not block registration on an invalid/unknown code (no attribution)', async () => {
    const { userId, memberId } = await register('NONEXISTENT9');
    const member = await row(memberId);
    expect(member.pendingReferrerId).toBeNull();
    await members.service.activateByUserId(userId);
    const activated = await row(memberId);
    expect(activated.referredBy).toBeNull();
    expect(activated.partnerId).toBeNull();
  });

  it('gives no attribution when the referrer is INACTIVE', async () => {
    await seedMemberRow({ status: 'INACTIVE', referralCode: 'INACTIVERFR1' });
    const { memberId } = await register('INACTIVERFR1');
    const member = await row(memberId);
    expect(member.pendingReferrerId).toBeNull();
  });

  it('gives no attribution when the referrer is SUSPENDED', async () => {
    await seedMemberRow({ status: 'SUSPENDED', referralCode: 'SUSPENDEDRF1' });
    const { memberId } = await register('SUSPENDEDRF1');
    const member = await row(memberId);
    expect(member.pendingReferrerId).toBeNull();
  });

  it('prevents self-referral at apply time', async () => {
    // Construct a member whose pending referrer is itself, then verify.
    const userId = await seedUser();
    const memberId = await seedMemberRow({ status: 'PENDING', userId });
    await db
      .update(membersTable)
      .set({ pendingReferrerId: memberId })
      .where(eq(membersTable.id, memberId));

    await members.service.activateByUserId(userId);
    const member = await row(memberId);
    expect(member.referredBy).toBeNull();
    expect(member.pendingReferrerId).toBeNull(); // guard cleared it, not applied
  });

  it('rejects a referral that would close a cycle', async () => {
    // H referred J earlier (J.referredBy = H). Now H tries to be referred by J.
    const userId = await seedUser();
    const h = await seedMemberRow({ status: 'PENDING', userId });
    const j = await seedMemberRow({ status: 'ACTIVE', referredBy: h });
    await db.update(membersTable).set({ pendingReferrerId: j }).where(eq(membersTable.id, h));

    await members.service.activateByUserId(userId);
    const member = await row(h);
    expect(member.referredBy).toBeNull(); // cycle guard rejected the apply
    expect(member.pendingReferrerId).toBeNull(); // cleared so it is not retried forever
  });

  it('exposes the relationship through the network read model', async () => {
    const a = await registerActive();
    const b = await register(a.code);
    await members.service.activateByUserId(b.userId);

    // A sees B in direct referrals.
    const directs = await network.network.getDirectReferrals(a.memberId);
    expect(directs.some((node) => node.memberId === b.memberId)).toBe(true);

    // B sees A as its referrer/upline, and its own code, via the referral summary.
    const bSummary = await network.network.getReferralSummary(b.memberId);
    expect(bSummary.referrer?.memberId).toBe(a.memberId);
    expect(bSummary.referredBy).toBe(a.memberId);

    // A's own summary returns its referral code and no upline.
    const aSummary = await network.network.getReferralSummary(a.memberId);
    expect(aSummary.referralCode).toBe(a.code);
    expect(aSummary.referrer).toBeNull();
  });

  it('feeds the earnings engine: an attributed deposit credits the referrer', async () => {
    // A is B's partner AND referrer (approved decision 1), so both commission and
    // one-time referral accrue to A on B's first approved deposit.
    const a = await registerActive();
    const b = await register(a.code);
    await members.service.activateByUserId(b.userId);

    const before = await financialUnits(a.memberId);

    const deposit = await finance.service.createDeposit(
      b.memberId,
      { units: 10 }, // $300 = 30000 cents
      { userId: ACTOR_ID, ipAddress: null, userAgent: null, correlationId: null },
    );
    await finance.service.approve(
      deposit.id,
      {},
      { userId: ACTOR_ID, ipAddress: null, userAgent: null, correlationId: null },
    );

    const result = await earnings.commission.processDepositEarnings(
      { depositRequestId: deposit.id },
      { userId: ACTOR_ID, ipAddress: null, userAgent: null, correlationId: null },
    );

    // 5% commission (networkUnits=100 tier) + 2% referral on 30000 cents.
    expect(result.commission?.amountCents).toBe(1500);
    expect(result.referral?.amountCents).toBe(600);

    const after = await financialUnits(a.memberId);
    expect(after - before).toBe(2100);
  });
});
