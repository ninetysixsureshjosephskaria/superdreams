import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members } from '@/database/schema';
import { createFinanceModule, type FinanceModule } from '@/modules/finance';
import type { FinanceAuthorizationPort } from '@/modules/finance/services/finance.service';
import { createWalletModule, type WalletModule } from '@/modules/wallet';

import { createEarningsModule, type EarningsModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000c1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};
const HOUR = 60 * 60 * 1000;

// Recruiters
const R1 = '00000000-0000-0000-0000-000000000c10'; // 2 within 24h → qualifies (FIXED)
const R2 = '00000000-0000-0000-0000-000000000c11'; // 2 but >24h apart → no
const R3 = '00000000-0000-0000-0000-000000000c12'; // 1 referral → no
const R4 = '00000000-0000-0000-0000-000000000c13'; // 3 within 24h → qualifies (PERCENT)
const R6 = '00000000-0000-0000-0000-000000000c15'; // qualifies but NOT active → no

const ALLOW: FinanceAuthorizationPort = { can: () => Promise.resolve(true) };

async function seedRecruiter(
  db: Database,
  id: string,
  suffix: string,
  status = 'ACTIVE',
): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-ACT${suffix}`,
    firstName: 'Act',
    lastName: suffix,
    email: `act${suffix}@activation.test`,
    status: status as 'ACTIVE',
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

let refSeq = 0;
async function seedReferral(db: Database, recruiterId: string, joinedAt: Date): Promise<void> {
  refSeq += 1;
  await db.insert(members).values({
    id: `00000000-0000-0000-0000-0000000c9${String(refSeq).padStart(3, '0')}`,
    memberNumber: `M-REF${refSeq}`,
    firstName: 'Ref',
    lastName: String(refSeq),
    email: `ref${refSeq}@activation.test`,
    status: 'ACTIVE',
    referredBy: recruiterId,
    createdAt: joinedAt,
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

/** Phase 2E — activation bonus: +2-in-a-day trigger, config, idempotency, TXN-A credit. */
describe('phase 2e activation bonus (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let wallet: WalletModule;
  let finance: FinanceModule;
  let earnings: EarningsModule;

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
    const now = Date.now();
    await Promise.all([
      seedRecruiter(db, R1, '01'),
      seedRecruiter(db, R2, '02'),
      seedRecruiter(db, R3, '03'),
      seedRecruiter(db, R4, '04'),
      seedRecruiter(db, R6, '06', 'PENDING'),
    ]);
    await seedReferral(db, R1, new Date(now - HOUR));
    await seedReferral(db, R1, new Date(now - 2 * HOUR));
    await seedReferral(db, R2, new Date(now - HOUR));
    await seedReferral(db, R2, new Date(now - 50 * HOUR)); // >24h apart
    await seedReferral(db, R3, new Date(now - HOUR));
    await seedReferral(db, R4, new Date(now - HOUR));
    await seedReferral(db, R4, new Date(now - 2 * HOUR));
    await seedReferral(db, R4, new Date(now - 3 * HOUR));
    await seedReferral(db, R6, new Date(now - HOUR));
    await seedReferral(db, R6, new Date(now - 2 * HOUR));
  });

  afterAll(async () => {
    await client.close();
  });

  it('is disabled by default and grants nothing', async () => {
    const config = await earnings.activation.getConfig(ACTOR);
    expect(config.enabled).toBe(false);
    expect((await earnings.activation.processMember({ memberId: R1 }, ACTOR)).granted).toBe(false);
  });

  it('grants a FIXED activation bonus to a qualifying member (idempotent)', async () => {
    await earnings.activation.updateConfig(
      { enabled: true, rewardType: 'FIXED', value: 500, lockDays: 30 },
      ACTOR,
    );
    const r = await earnings.activation.processMember({ memberId: R1 }, ACTOR);
    expect(r.granted).toBe(true);
    expect(r.amountCents).toBe(500);
    expect(await balance(R1)).toBe(500); // TXN-A credit

    // Idempotent — no second grant.
    const again = await earnings.activation.processMember({ memberId: R1 }, ACTOR);
    expect(again.granted).toBe(false);
    expect(await balance(R1)).toBe(500);
  });

  it('does not grant when the window, count, or active status fails', async () => {
    expect((await earnings.activation.processMember({ memberId: R2 }, ACTOR)).granted).toBe(false); // >24h apart
    expect((await earnings.activation.processMember({ memberId: R3 }, ACTOR)).granted).toBe(false); // only 1
    expect((await earnings.activation.processMember({ memberId: R6 }, ACTOR)).granted).toBe(false); // not ACTIVE
  });

  it('grants a PERCENT activation bonus based on balance', async () => {
    // Fund R4 so a percentage has a base.
    const dep = await finance.service.createDeposit(R4, { units: 10 }, ACTOR); // 30000
    await finance.service.approve(dep.id, {}, ACTOR);
    await earnings.activation.updateConfig({ rewardType: 'PERCENT', value: 1000 }, ACTOR); // 10%

    const r = await earnings.activation.processMember({ memberId: R4 }, ACTOR);
    expect(r.granted).toBe(true);
    expect(r.amountCents).toBe(3000); // 10% of 30000
    expect(await balance(R4)).toBe(33_000);
  });

  it('respects the enable/disable switch', async () => {
    await earnings.activation.updateConfig({ enabled: false }, ACTOR);
    // A fresh recruiter that would otherwise qualify.
    const R5 = '00000000-0000-0000-0000-000000000c14';
    await seedRecruiter(db, R5, '05');
    const now = Date.now();
    await seedReferral(db, R5, new Date(now - HOUR));
    await seedReferral(db, R5, new Date(now - 2 * HOUR));
    expect((await earnings.activation.processMember({ memberId: R5 }, ACTOR)).granted).toBe(false);
    await earnings.activation.updateConfig({ enabled: true }, ACTOR);
  });

  it('writes audit entries for activation grants', async () => {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'activation_bonus_grant'));
    expect(rows.length).toBeGreaterThanOrEqual(2); // R1 + R4
  });
});
