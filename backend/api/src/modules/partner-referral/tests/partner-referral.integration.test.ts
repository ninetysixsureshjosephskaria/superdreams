import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { withTransaction } from '@/database/helpers/transaction';
import {
  auditLogs,
  memberRewards,
  members,
  partnerReferralEarnings,
  rewardTransactions,
  users,
} from '@/database/schema';
import { BusinessRuleError } from '@/errors';
import { createRewardsModule, type RewardsModule } from '@/modules/rewards';

import type { ReferralActor } from '../dto';
import { PartnerReferralEventBus, type PartnerReferralEvent } from '../events';
import {
  createPartnerReferralModule,
  type PartnerReferralEarningRow,
  type PartnerReferralModule,
} from '../index';
import type {
  PartnerRoleCheckerPort,
  ReferralRateProviderPort,
  RewardCreditPort,
  RewardReversePort,
} from '../services';

/**
 * P3 — Partner Referral earning engine (service integration, PGlite).
 *
 * Exercises resolveEarner / creditWithin / onSourceReversed against a real Postgres
 * (PGlite) with the real migration 0025. Partner credits and clawbacks use the REAL
 * rewards `awardPointsWithin` / `reverseWithin` seams, so atomicity, zero-suppression,
 * idempotency, and B3 roll-back are proven end-to-end. The module is exercised in
 * isolation — it is NOT yet wired into Games/Campaigns. No production code is modified
 * by this test.
 */

// Users
const U_EARNER = '00000000-0000-0000-0000-0000000000a1';
const U_PARTNER = '00000000-0000-0000-0000-0000000000a2';
const U_GRAND = '00000000-0000-0000-0000-0000000000a3';
const U_ORPHAN = '00000000-0000-0000-0000-0000000000a4';
const U_EARNER_INACT = '00000000-0000-0000-0000-0000000000a5';
const U_INACT = '00000000-0000-0000-0000-0000000000a6';
const U_EARNER_NONP = '00000000-0000-0000-0000-0000000000a7';
const U_NONP = '00000000-0000-0000-0000-0000000000a8';

// Members
const M_EARNER = '00000000-0000-0000-0000-0000000000b1'; // ACTIVE, partner = M_PARTNER
const M_PARTNER = '00000000-0000-0000-0000-0000000000b2'; // ACTIVE partner, partner = M_GRAND
const M_GRAND = '00000000-0000-0000-0000-0000000000b3'; // ACTIVE partner (the partner's partner)
const M_ORPHAN = '00000000-0000-0000-0000-0000000000b4'; // ACTIVE, no partner
const M_EARNER_INACT = '00000000-0000-0000-0000-0000000000b5'; // ACTIVE, partner = M_INACT
const M_INACT = '00000000-0000-0000-0000-0000000000b6'; // PENDING (not active)
const M_EARNER_NONP = '00000000-0000-0000-0000-0000000000b7'; // ACTIVE, partner = M_NONP
const M_NONP = '00000000-0000-0000-0000-0000000000b8'; // ACTIVE, but NOT a partner (no role)

const ACTOR = U_EARNER;
const actorFor = (userId: string): ReferralActor => ({
  userId,
  ipAddress: null,
  userAgent: null,
  correlationId: null,
});
const actor = actorFor(ACTOR);

// Users that hold the `partner` role.
const PARTNER_USERS = new Set([U_PARTNER, U_GRAND]);

const events: PartnerReferralEvent[] = [];
let db: Database;
let rewards: RewardsModule;
let rateBps = 500;
let refSeq = 0;
const uniqueRef = (prefix: string): string => `${prefix}-${(refSeq += 1)}`;

async function seedUser(id: string, email: string): Promise<void> {
  await db.insert(users).values({ id, email, status: 'ACTIVE' });
}

async function seedMember(
  id: string,
  suffix: string,
  userId: string,
  status: 'ACTIVE' | 'PENDING',
  partnerId: string | null,
): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-PRF${suffix}`,
    firstName: 'Prf',
    lastName: suffix,
    email: `prf${suffix}@referral.test`,
    status,
    userId,
    partnerId,
    createdBy: U_EARNER,
    updatedBy: U_EARNER,
  });
}

async function balanceOf(memberId: string): Promise<number | null> {
  const [row] = await db
    .select({ b: memberRewards.pointsBalance })
    .from(memberRewards)
    .where(eq(memberRewards.memberId, memberId));
  return row?.b ?? null;
}

async function ledgerCount(
  memberId: string,
  type: 'EARN' | 'REVERSAL' | 'REDEEM',
): Promise<number> {
  const rows = await db
    .select({ id: rewardTransactions.id })
    .from(rewardTransactions)
    .where(and(eq(rewardTransactions.memberId, memberId), eq(rewardTransactions.type, type)));
  return rows.length;
}

async function linkBySource(
  sourceTransactionId: string,
): Promise<PartnerReferralEarningRow | null> {
  const [row] = await db
    .select()
    .from(partnerReferralEarnings)
    .where(eq(partnerReferralEarnings.sourceTransactionId, sourceTransactionId));
  return row ?? null;
}

async function referralAuditCount(entityId: string, action?: 'CREATE' | 'UPDATE'): Promise<number> {
  const filters = [eq(auditLogs.entityId, entityId), eq(auditLogs.module, 'partner-referral')];
  if (action) {
    filters.push(eq(auditLogs.action, action));
  }
  const rows = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(and(...filters));
  return rows.length;
}

/** A source EARN + the referral credit, both in ONE transaction (mirrors the real path). */
async function earnAndCredit(
  earnerMemberId: string,
  points: number,
): Promise<{ sourceTransactionId: string; referralId: string | null }> {
  const resolved = await mod.service.resolveEarner(earnerMemberId); // pre-tx read
  return withTransaction(db, async (tx) => {
    const src = await rewards.service.awardPointsWithin(tx, earnerMemberId, points, {
      reference: uniqueRef('SRC'),
      description: 'source earn',
      actor: actorFor(earnerMemberId),
    });
    const row = await mod.service.creditWithin(tx, {
      resolved,
      sourceTransactionId: src.transactionId,
      earnerMemberId,
      sourcePoints: points,
      actor: actorFor(earnerMemberId),
    });
    return { sourceTransactionId: src.transactionId, referralId: row?.id ?? null };
  });
}

let mod: PartnerReferralModule;

describe('P3 partner-referral engine (PGlite)', () => {
  let client: PGlite;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;

    rewards = createRewardsModule(db);

    const rewardCredit: RewardCreditPort = {
      awardPointsWithin: (tx, memberId, points, options) =>
        rewards.service.awardPointsWithin(tx, memberId, points, options),
    };
    const rewardReverse: RewardReversePort = {
      reverseWithin: (tx, memberId, transactionId, a) =>
        rewards.service.reverseWithin(tx, memberId, transactionId, a),
    };
    const roleChecker: PartnerRoleCheckerPort = {
      isPartner: (userId) => Promise.resolve(PARTNER_USERS.has(userId)),
    };
    const rateProvider: ReferralRateProviderPort = {
      getRateBps: () => Promise.resolve(rateBps),
    };

    mod = createPartnerReferralModule(db, {
      rewardCredit,
      rewardReverse,
      roleChecker,
      rateProvider,
      events: new PartnerReferralEventBus(),
    });
    mod.events.subscribe((e) => {
      events.push(e);
    });

    await Promise.all([
      seedUser(U_EARNER, 'earner@referral.test'),
      seedUser(U_PARTNER, 'partner@referral.test'),
      seedUser(U_GRAND, 'grand@referral.test'),
      seedUser(U_ORPHAN, 'orphan@referral.test'),
      seedUser(U_EARNER_INACT, 'einact@referral.test'),
      seedUser(U_INACT, 'inact@referral.test'),
      seedUser(U_EARNER_NONP, 'enonp@referral.test'),
      seedUser(U_NONP, 'nonp@referral.test'),
    ]);
    // Order matters for self-FK: partners before the members that reference them.
    await seedMember(M_GRAND, 'GRAND', U_GRAND, 'ACTIVE', null);
    await seedMember(M_PARTNER, 'PARTNER', U_PARTNER, 'ACTIVE', M_GRAND);
    await seedMember(M_EARNER, 'EARNER', U_EARNER, 'ACTIVE', M_PARTNER);
    await seedMember(M_ORPHAN, 'ORPHAN', U_ORPHAN, 'ACTIVE', null);
    await seedMember(M_INACT, 'INACT', U_INACT, 'PENDING', null);
    await seedMember(M_EARNER_INACT, 'EINACT', U_EARNER_INACT, 'ACTIVE', M_INACT);
    await seedMember(M_NONP, 'NONP', U_NONP, 'ACTIVE', null);
    await seedMember(M_EARNER_NONP, 'ENONP', U_EARNER_NONP, 'ACTIVE', M_NONP);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    await db.delete(partnerReferralEarnings);
    await db.delete(rewardTransactions);
    await db.delete(memberRewards);
    await db.delete(auditLogs);
    events.length = 0;
    rateBps = 500;
  });

  // --- resolveEarner --------------------------------------------------------

  it('1. resolves the direct active Partner + rate for an eligible earner', async () => {
    const resolved = await mod.service.resolveEarner(M_EARNER);
    expect(resolved).not.toBeNull();
    expect(resolved?.partnerMemberId).toBe(M_PARTNER);
    expect(resolved?.rateBps).toBe(500);
  });

  it('2. resolves null when the earner has no partner', async () => {
    expect(await mod.service.resolveEarner(M_ORPHAN)).toBeNull();
  });

  it('3. resolves null when the partner is not ACTIVE', async () => {
    expect(await mod.service.resolveEarner(M_EARNER_INACT)).toBeNull();
  });

  it('4. resolves null when the partner does not hold the partner role', async () => {
    expect(await mod.service.resolveEarner(M_EARNER_NONP)).toBeNull();
  });

  it('5. honours a changed configurable rate', async () => {
    rateBps = 750;
    expect((await mod.service.resolveEarner(M_EARNER))?.rateBps).toBe(750);
  });

  // --- creditWithin ---------------------------------------------------------

  it('6. credits the partner floor(source×rate/10000), records linkage + audit', async () => {
    const { sourceTransactionId, referralId } = await earnAndCredit(M_EARNER, 1000);
    expect(referralId).not.toBeNull();
    expect(await balanceOf(M_PARTNER)).toBe(50); // floor(1000 * 500 / 10000)
    expect(await ledgerCount(M_PARTNER, 'EARN')).toBe(1);
    const link = await linkBySource(sourceTransactionId);
    expect(link?.partnerMemberId).toBe(M_PARTNER);
    expect(link?.earnerMemberId).toBe(M_EARNER);
    expect(link?.rateBps).toBe(500);
    expect(link?.sourcePoints).toBe(1000);
    expect(link?.partnerPoints).toBe(50);
    expect(link?.reversedAt).toBeNull();
    expect(await referralAuditCount(referralId!, 'CREATE')).toBe(1);
  });

  it('7. zero result is suppressed — no partner reward and no linkage row', async () => {
    const { sourceTransactionId, referralId } = await earnAndCredit(M_EARNER, 10); // 10*500/10000 = 0.5 → 0
    expect(referralId).toBeNull();
    expect(await balanceOf(M_PARTNER)).toBeNull(); // partner never credited
    expect(await linkBySource(sourceTransactionId)).toBeNull();
  });

  it('8. no resolved partner → creditWithin is a no-op', async () => {
    const { sourceTransactionId, referralId } = await earnAndCredit(M_ORPHAN, 1000);
    expect(referralId).toBeNull();
    expect(await linkBySource(sourceTransactionId)).toBeNull();
  });

  it('9. one referral per source transaction — a duplicate credit violates the unique index', async () => {
    const resolved = await mod.service.resolveEarner(M_EARNER);
    await expect(
      withTransaction(db, async (tx) => {
        const src = await rewards.service.awardPointsWithin(tx, M_EARNER, 1000, {
          reference: uniqueRef('SRC'),
          description: 'src',
          actor,
        });
        await mod.service.creditWithin(tx, {
          resolved,
          sourceTransactionId: src.transactionId,
          earnerMemberId: M_EARNER,
          sourcePoints: 1000,
          actor,
        });
        // Second credit for the SAME source transaction → UNIQUE(source_transaction_id).
        await mod.service.creditWithin(tx, {
          resolved,
          sourceTransactionId: src.transactionId,
          earnerMemberId: M_EARNER,
          sourcePoints: 1000,
          actor,
        });
      }),
    ).rejects.toThrow();
  });

  it('10. single level only — the partner’s own partner (grand) is never credited', async () => {
    await earnAndCredit(M_EARNER, 1000);
    expect(await balanceOf(M_PARTNER)).toBe(50); // direct partner credited
    expect(await balanceOf(M_GRAND)).toBeNull(); // upline beyond the direct partner untouched
  });

  it('11. the earner’s own balance reflects only their source earning (no self-credit)', async () => {
    await earnAndCredit(M_EARNER, 1000);
    expect(await balanceOf(M_EARNER)).toBe(1000);
  });

  // --- onSourceReversed (P3.11 + B3) ----------------------------------------

  it('12. reversing the source claws back the partner referral atomically', async () => {
    const { sourceTransactionId, referralId } = await earnAndCredit(M_EARNER, 1000);
    expect(await balanceOf(M_PARTNER)).toBe(50);

    await withTransaction(db, async (tx) => {
      await rewards.service.reverseWithin(tx, M_EARNER, sourceTransactionId, actor);
      await mod.service.onSourceReversed(tx, sourceTransactionId, actor);
    });

    expect(await balanceOf(M_PARTNER)).toBe(0); // 50 clawed back
    expect(await ledgerCount(M_PARTNER, 'REVERSAL')).toBe(1);
    const link = await linkBySource(sourceTransactionId);
    expect(link?.reversedAt).not.toBeNull();
    expect(link?.reversalTransactionId).not.toBeNull();
    expect(await referralAuditCount(referralId!, 'UPDATE')).toBe(1);
  });

  it('13. onSourceReversed is a no-op when the source produced no referral', async () => {
    const { sourceTransactionId } = await earnAndCredit(M_ORPHAN, 1000);
    await withTransaction(db, (tx) => mod.service.onSourceReversed(tx, sourceTransactionId, actor));
    // Nothing to assert beyond "did not throw"; no referral row exists.
    expect(await linkBySource(sourceTransactionId)).toBeNull();
  });

  it('14. onSourceReversed is idempotent — a second call does not double-claw', async () => {
    const { sourceTransactionId } = await earnAndCredit(M_EARNER, 1000);
    await withTransaction(db, async (tx) => {
      await rewards.service.reverseWithin(tx, M_EARNER, sourceTransactionId, actor);
      await mod.service.onSourceReversed(tx, sourceTransactionId, actor);
    });
    // Second reversal attempt (linkage already reversed) → no-op.
    await withTransaction(db, (tx) => mod.service.onSourceReversed(tx, sourceTransactionId, actor));
    expect(await balanceOf(M_PARTNER)).toBe(0);
    expect(await ledgerCount(M_PARTNER, 'REVERSAL')).toBe(1); // only one clawback
  });

  it('15. B3 — clawback with insufficient partner points fails the WHOLE source reversal', async () => {
    const { sourceTransactionId } = await earnAndCredit(M_EARNER, 1000); // partner +50
    // Partner spends the referral points, dropping the balance to 0.
    await withTransaction(db, (tx) =>
      rewards.service.spendPointsWithin(tx, M_PARTNER, 50, {
        reference: uniqueRef('SPND'),
        description: 'spend',
        actor,
      }),
    );
    expect(await balanceOf(M_PARTNER)).toBe(0);

    // Reversing the source now requires clawing back 50 the partner no longer has.
    await expect(
      withTransaction(db, async (tx) => {
        await rewards.service.reverseWithin(tx, M_EARNER, sourceTransactionId, actor);
        await mod.service.onSourceReversed(tx, sourceTransactionId, actor);
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    // Everything rolled back: source EARN still POSTED, referral not reversed.
    expect(await balanceOf(M_EARNER)).toBe(1000); // source reversal rolled back
    expect(await balanceOf(M_PARTNER)).toBe(0); // no negative balance / no debt
    const link = await linkBySource(sourceTransactionId);
    expect(link?.reversedAt).toBeNull(); // clawback rolled back
    expect(await ledgerCount(M_PARTNER, 'REVERSAL')).toBe(0);
    expect(await ledgerCount(M_EARNER, 'REVERSAL')).toBe(0);
  });

  // --- events ---------------------------------------------------------------

  it('16. the referral event bus delivers to subscribers', async () => {
    await mod.events.publish({
      type: 'PartnerReferralEarned',
      referralEarningId: 'r1',
      sourceTransactionId: 's1',
      earnerMemberId: M_EARNER,
      partnerMemberId: M_PARTNER,
      partnerTransactionId: 't1',
      rateBps: 500,
      partnerPoints: 50,
      at: new Date(),
    });
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'PartnerReferralEarned', partnerMemberId: M_PARTNER }),
    );
  });
});
