import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import {
  auditLogs,
  gameRewards,
  gameScores,
  gameSessions,
  games,
  memberRewards,
  members,
  partnerReferralEarnings,
  rewardAdjustments,
  rewardHistory,
  rewardRedemptions,
  rewardTransactions,
  users,
} from '@/database/schema';
import { BusinessRuleError, NotFoundError } from '@/errors';
import { createReferralRewardBridge, type RewardBridge } from '@/modules/campaigns';
import { createGamesModule, type GamesModule } from '@/modules/games';
import {
  createRewardsModule,
  type RewardsModule,
  type RewardEvent,
  type PartnerReferralReversalPort,
} from '@/modules/rewards';

import {
  createPartnerReferralModule,
  type PartnerReferralEarningRow,
  type PartnerReferralModule,
  type ReferralActor,
} from '../index';
import type {
  PartnerRoleCheckerPort,
  ReferralRateProviderPort,
  RewardCreditPort,
  RewardReversePort,
} from '../services';
import { partnerReferralDeps } from '../wiring';

/**
 * P3 Milestone 4 — WIRING integration (PGlite).
 *
 * Proves the Partner Referral engine is correctly wired into the real Games earning
 * path, the real Campaign reward bridge, and the real Rewards reversal path — all
 * against a real Postgres (PGlite) with migration 0025. Each proof asserts the
 * partner credit/clawback shares the SAME transaction as the member's source EARN.
 */

const U_EARNER = '00000000-0000-0000-0000-0000000000c1';
const U_PARTNER = '00000000-0000-0000-0000-0000000000c2';
const U_ORPHAN = '00000000-0000-0000-0000-0000000000c3';

const M_EARNER = '00000000-0000-0000-0000-0000000000d1'; // ACTIVE, partner = M_PARTNER
const M_PARTNER = '00000000-0000-0000-0000-0000000000d2'; // ACTIVE partner
const M_ORPHAN = '00000000-0000-0000-0000-0000000000d3'; // ACTIVE, no partner

const actorFor = (userId: string): ReferralActor => ({
  userId,
  ipAddress: null,
  userAgent: null,
  correlationId: null,
});
const earnerActor = actorFor(U_EARNER);

const PARTNER_USERS = new Set([U_PARTNER]);

let db: Database;
let rewards: RewardsModule;
let referral: PartnerReferralModule;
let games_: GamesModule;
let bridge: RewardBridge;
let rateBps = 500;
let gameSeq = 0;
const rewardEvents: RewardEvent[] = [];

async function seedUser(id: string, email: string): Promise<void> {
  await db.insert(users).values({ id, email, status: 'ACTIVE' });
}
async function seedMember(
  id: string,
  suffix: string,
  userId: string,
  partnerId: string | null,
): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-WIR${suffix}`,
    firstName: 'Wir',
    lastName: suffix,
    email: `wir${suffix}@wiring.test`,
    status: 'ACTIVE',
    userId,
    partnerId,
    createdBy: U_EARNER,
    updatedBy: U_EARNER,
  });
}
async function makeGame(): Promise<string> {
  const rows = await db
    .insert(games)
    .values({
      code: `WIRE_${(gameSeq += 1)}`,
      name: 'Wire Game',
      entryCost: 0,
      minReward: 1_000,
      maxReward: 1_000, // any score awards exactly 1000
      maxScore: 100,
      status: 'ACTIVE',
    })
    .returning({ id: games.id });
  return rows[0]!.id;
}
async function balanceOf(memberId: string): Promise<number | null> {
  const [row] = await db
    .select({ b: memberRewards.pointsBalance })
    .from(memberRewards)
    .where(eq(memberRewards.memberId, memberId));
  return row?.b ?? null;
}
async function earnTxnId(memberId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: rewardTransactions.id })
    .from(rewardTransactions)
    .where(and(eq(rewardTransactions.memberId, memberId), eq(rewardTransactions.type, 'EARN')));
  return row?.id ?? null;
}
async function ledgerCount(memberId: string, type: 'EARN' | 'REVERSAL'): Promise<number> {
  const rows = await db
    .select({ id: rewardTransactions.id })
    .from(rewardTransactions)
    .where(and(eq(rewardTransactions.memberId, memberId), eq(rewardTransactions.type, type)));
  return rows.length;
}
async function referralRowCount(): Promise<number> {
  const rows = await db.select({ id: partnerReferralEarnings.id }).from(partnerReferralEarnings);
  return rows.length;
}
async function referralForSource(
  sourceTransactionId: string,
): Promise<PartnerReferralEarningRow | null> {
  const [row] = await db
    .select()
    .from(partnerReferralEarnings)
    .where(eq(partnerReferralEarnings.sourceTransactionId, sourceTransactionId));
  return row ?? null;
}
async function rewardHistoryCount(memberId: string, action: string): Promise<number> {
  const rows = await db
    .select({ id: rewardHistory.id })
    .from(rewardHistory)
    .where(and(eq(rewardHistory.memberId, memberId), eq(rewardHistory.action, action)));
  return rows.length;
}

describe('P3 wiring: Games + Campaigns + Rewards reversal (PGlite)', () => {
  let client: PGlite;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;

    // Rewards with the late-bound referral reversal port (mirrors production wiring).
    const referralHolder: { module?: PartnerReferralModule } = {};
    const referralReversal: PartnerReferralReversalPort = {
      onSourceReversed: (tx, sourceTransactionId, a) =>
        referralHolder.module
          ? referralHolder.module.service.onSourceReversed(tx, sourceTransactionId, a)
          : Promise.resolve(),
    };
    rewards = createRewardsModule(db, { referralReversal });
    rewards.events.subscribe((e) => {
      rewardEvents.push(e);
    });

    const rewardCredit: RewardCreditPort = {
      awardPointsWithin: (tx, m, p, o) => rewards.service.awardPointsWithin(tx, m, p, o),
    };
    const rewardReverse: RewardReversePort = {
      reverseWithin: (tx, m, t, a) => rewards.service.reverseWithin(tx, m, t, a),
    };
    const roleChecker: PartnerRoleCheckerPort = {
      isPartner: (userId) => Promise.resolve(PARTNER_USERS.has(userId)),
    };
    const rateProvider: ReferralRateProviderPort = { getRateBps: () => Promise.resolve(rateBps) };

    referral = createPartnerReferralModule(db, {
      rewardCredit,
      rewardReverse,
      roleChecker,
      rateProvider,
    });
    referralHolder.module = referral;

    games_ = createGamesModule(db, { rewards: rewards.service, partnerReferral: referral.service });
    bridge = createReferralRewardBridge(db, rewards.service, referral.service);

    await Promise.all([
      seedUser(U_EARNER, 'earner@wiring.test'),
      seedUser(U_PARTNER, 'partner@wiring.test'),
      seedUser(U_ORPHAN, 'orphan@wiring.test'),
    ]);
    await seedMember(M_PARTNER, 'PARTNER', U_PARTNER, null);
    await seedMember(M_EARNER, 'EARNER', U_EARNER, M_PARTNER);
    await seedMember(M_ORPHAN, 'ORPHAN', U_ORPHAN, null);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    // FK-safe order: game children reference reward_transactions; referral rows and
    // game rows reference reward_transactions too, so clear them before the ledger.
    await db.delete(gameScores);
    await db.delete(gameRewards);
    await db.delete(gameSessions);
    await db.delete(partnerReferralEarnings);
    await db.delete(rewardRedemptions);
    await db.delete(rewardAdjustments);
    await db.delete(rewardTransactions);
    await db.delete(rewardHistory);
    await db.delete(memberRewards);
    await db.delete(auditLogs);
    await db.delete(games);
    rewardEvents.length = 0;
    rateBps = 500;
  });

  // --- Games ----------------------------------------------------------------

  it('1. Games win → member EARN + partner EARN atomically (same tx)', async () => {
    const gameId = await makeGame();
    const play = await games_.service.startForUser(U_EARNER, gameId, earnerActor);
    await games_.service.submitScoreForUser(U_EARNER, play.session.id, { score: 100 }, earnerActor);

    expect(await balanceOf(M_EARNER)).toBe(1_000); // member win
    expect(await balanceOf(M_PARTNER)).toBe(50); // floor(1000 * 500 / 10000)
    const src = await earnTxnId(M_EARNER);
    const link = await referralForSource(src!);
    expect(link?.partnerMemberId).toBe(M_PARTNER);
    expect(link?.partnerPoints).toBe(50);
  });

  it('2. Games win with NO eligible partner → member EARN unchanged, no referral row', async () => {
    const gameId = await makeGame();
    const play = await games_.service.startForUser(U_ORPHAN, gameId, actorFor(U_ORPHAN));
    await games_.service.submitScoreForUser(
      U_ORPHAN,
      play.session.id,
      { score: 100 },
      actorFor(U_ORPHAN),
    );
    expect(await balanceOf(M_ORPHAN)).toBe(1_000); // member earning intact
    expect(await referralRowCount()).toBe(0);
  });

  it('3. Games atomicity — a failing partner credit rolls back the member win', async () => {
    const gameId = await makeGame();
    // A games module whose referral service throws inside creditWithin.
    const failing = {
      resolveEarner: (id: string) => referral.service.resolveEarner(id),
      creditWithin: () => Promise.reject(new Error('referral boom')),
    } as unknown as typeof referral.service;
    const failingGames = createGamesModule(db, {
      rewards: rewards.service,
      partnerReferral: failing,
    });
    const play = await failingGames.service.startForUser(U_EARNER, gameId, earnerActor);
    await expect(
      failingGames.service.submitScoreForUser(
        U_EARNER,
        play.session.id,
        { score: 100 },
        earnerActor,
      ),
    ).rejects.toThrow('referral boom');
    expect(await balanceOf(M_EARNER)).toBeNull(); // member win rolled back
    expect(await referralRowCount()).toBe(0);
  });

  it('4. configured rate is used and captured on the referral record', async () => {
    rateBps = 750;
    const gameId = await makeGame();
    const play = await games_.service.startForUser(U_EARNER, gameId, earnerActor);
    await games_.service.submitScoreForUser(U_EARNER, play.session.id, { score: 100 }, earnerActor);
    expect(await balanceOf(M_PARTNER)).toBe(75); // floor(1000 * 750 / 10000)
    const link = await referralForSource((await earnTxnId(M_EARNER))!);
    expect(link?.rateBps).toBe(750);
  });

  // --- Campaigns (real reward bridge) ---------------------------------------

  it('5. Campaign reward bridge → member EARN + history + event PRESERVED, + partner EARN', async () => {
    await bridge.allocate(
      M_EARNER,
      { points: 1_000, programId: null, description: 'Campaign X' },
      earnerActor,
    );
    expect(await balanceOf(M_EARNER)).toBe(1_000); // member reward
    expect(await balanceOf(M_PARTNER)).toBe(50); // partner referral, same tx
    // Preserved allocate() side effects:
    expect(await rewardHistoryCount(M_EARNER, 'reward.allocated')).toBe(1);
    expect(rewardEvents.some((e) => e.type === 'RewardAllocated')).toBe(true);
    const link = await referralForSource((await earnTxnId(M_EARNER))!);
    expect(link?.partnerPoints).toBe(50);
  });

  it('6. Campaign reward for a member with no partner → member reward intact, no referral', async () => {
    await bridge.allocate(
      M_ORPHAN,
      { points: 1_000, programId: null, description: 'Campaign Y' },
      actorFor(U_ORPHAN),
    );
    expect(await balanceOf(M_ORPHAN)).toBe(1_000);
    expect(await rewardHistoryCount(M_ORPHAN, 'reward.allocated')).toBe(1);
    expect(await referralRowCount()).toBe(0);
  });

  // --- One referral per source (idempotency) --------------------------------

  it('7. one referral earning per source transaction', async () => {
    const gameId = await makeGame();
    const play = await games_.service.startForUser(U_EARNER, gameId, earnerActor);
    await games_.service.submitScoreForUser(U_EARNER, play.session.id, { score: 100 }, earnerActor);
    expect(await referralRowCount()).toBe(1);
  });

  // --- Rewards reversal wiring (P3.11 + B3) ---------------------------------

  it('8. reverse() on a wired source claws back the partner referral atomically', async () => {
    const gameId = await makeGame();
    const play = await games_.service.startForUser(U_EARNER, gameId, earnerActor);
    await games_.service.submitScoreForUser(U_EARNER, play.session.id, { score: 100 }, earnerActor);
    const src = (await earnTxnId(M_EARNER))!;
    expect(await balanceOf(M_PARTNER)).toBe(50);

    await rewards.service.reverse(M_EARNER, src, earnerActor);

    expect(await balanceOf(M_EARNER)).toBe(0); // member win reversed
    expect(await balanceOf(M_PARTNER)).toBe(0); // partner referral clawed back
    expect(await ledgerCount(M_PARTNER, 'REVERSAL')).toBe(1);
    const link = await referralForSource(src);
    expect(link?.reversedAt).not.toBeNull();
  });

  it('9. B3 — reverse() fails atomically when the partner cannot be clawed back', async () => {
    const gameId = await makeGame();
    const play = await games_.service.startForUser(U_EARNER, gameId, earnerActor);
    await games_.service.submitScoreForUser(U_EARNER, play.session.id, { score: 100 }, earnerActor);
    const src = (await earnTxnId(M_EARNER))!;

    // Partner spends the referral points.
    await rewards.service.redeem(M_PARTNER, { points: 50 }, earnerActor);
    expect(await balanceOf(M_PARTNER)).toBe(0);

    await expect(rewards.service.reverse(M_EARNER, src, earnerActor)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
    // Whole reversal rolled back: source still POSTED, referral not reversed.
    expect(await balanceOf(M_EARNER)).toBe(1_000);
    expect(await ledgerCount(M_EARNER, 'REVERSAL')).toBe(0);
    const link = await referralForSource(src);
    expect(link?.reversedAt).toBeNull();
  });

  // --- Admin allocate stays excluded ----------------------------------------

  it('10. admin reward.allocate never produces a partner referral', async () => {
    await rewards.service.allocate(
      M_EARNER,
      { points: 1_000, description: 'Admin grant' },
      earnerActor,
    );
    expect(await balanceOf(M_EARNER)).toBe(1_000);
    expect(await referralRowCount()).toBe(0); // excluded — allocate() has no referral hook
  });

  // --- Campaign bridge preserves allocate()'s NotFoundError -----------------

  it('12. campaign bridge for a non-existent member throws NotFoundError, writes nothing', async () => {
    const ghost = '00000000-0000-0000-0000-0000000000ee'; // never seeded
    await expect(
      bridge.allocate(ghost, { points: 1_000, programId: null, description: 'ghost' }, earnerActor),
    ).rejects.toBeInstanceOf(NotFoundError);
    // Atomic: the in-tx member check throws before any ledger write.
    expect(await balanceOf(ghost)).toBeNull();
    expect(await ledgerCount(ghost, 'EARN')).toBe(0);
    expect(await referralRowCount()).toBe(0);
  });

  // --- Settings-backed rate provider ----------------------------------------

  it('11. the settings-backed rate provider returns the configured bps or the 500 default', async () => {
    const authorization = { hasRole: () => Promise.resolve(true) };
    const make = (value: number | undefined): Promise<number> =>
      partnerReferralDeps(rewards.service, {
        authorization,
        settings: {
          getValue: <T>(_key: string): Promise<T | undefined> =>
            Promise.resolve(value as T | undefined),
        },
      }).rateProvider.getRateBps();

    expect(await make(750)).toBe(750); // configured
    expect(await make(undefined)).toBe(500); // default when unset
    expect(await make(-5)).toBe(500); // default when invalid
  });
});
