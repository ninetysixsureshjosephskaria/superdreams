import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { games, members, users } from '@/database/schema';
import { createRewardsModule, type RewardsModule } from '@/modules/rewards';

import { createGamesModule, type GamesModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000cc',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  correlationId: null,
};

let seq = 0;
async function makeFundedMember(
  db: Database,
  rewards: RewardsModule,
  points: number,
): Promise<{ memberId: string; userId: string }> {
  seq += 1;
  const userRows = await db
    .insert(users)
    .values({ email: `game-user${seq}@games.test`, status: 'ACTIVE' })
    .returning({ id: users.id });
  const userId = userRows[0]!.id;
  const rows = await db
    .insert(members)
    .values({
      userId,
      memberNumber: `M-GAME${String(seq).padStart(4, '0')}`,
      firstName: 'Game',
      lastName: `Member${seq}`,
      email: `game${seq}@games.test`,
      status: 'ACTIVE',
    })
    .returning({ id: members.id });
  const memberId = rows[0]!.id;
  if (points > 0) {
    await rewards.service.allocate(memberId, { points, description: 'Test funding' }, ACTOR);
  }
  return { memberId, userId };
}

async function makeGame(
  db: Database,
  overrides: Partial<typeof games.$inferInsert> = {},
): Promise<string> {
  seq += 1;
  const rows = await db
    .insert(games)
    .values({
      code: `GAME_${seq}`,
      name: `Game ${seq}`,
      entryCost: 50,
      minReward: 100,
      maxReward: 1_000,
      maxScore: 100,
      status: 'ACTIVE',
      ...overrides,
    })
    .returning({ id: games.id });
  return rows[0]!.id;
}

describe('games module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: GamesModule;
  let rewards: RewardsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    rewards = createRewardsModule(db);
    mod = createGamesModule(db, { rewards: rewards.service });
  });

  afterAll(async () => {
    await client.close();
  });

  it('lists only active games', async () => {
    await makeGame(db, { status: 'ACTIVE' });
    await makeGame(db, { status: 'INACTIVE' });
    const list = await mod.service.listGames();
    expect(list.every((g) => g.status === 'ACTIVE')).toBe(true);
  });

  it('starts a session and charges the entry cost via the rewards ledger', async () => {
    const { userId, memberId } = await makeFundedMember(db, rewards, 500);
    const gameId = await makeGame(db, { entryCost: 50 });

    const play = await mod.service.startForUser(userId, gameId, { ...ACTOR, userId });
    expect(play.entryCharged).toBe(50);
    expect(play.balanceAfter).toBe(450);
    expect(play.session.status).toBe('STARTED');
    expect((await rewards.service.getMemberBalance(memberId)).pointsBalance).toBe(450);
  });

  it('submits a score and awards points scaled by the score', async () => {
    const { userId, memberId } = await makeFundedMember(db, rewards, 500);
    const gameId = await makeGame(db, {
      entryCost: 50,
      minReward: 100,
      maxReward: 1_100,
      maxScore: 100,
    });

    const play = await mod.service.startForUser(userId, gameId, { ...ACTOR, userId });
    // score 50 of 100 → 100 + (1000 * 0.5) = 600
    const result = await mod.service.submitScoreForUser(
      userId,
      play.session.id,
      { score: 50 },
      { ...ACTOR, userId },
    );
    expect(result.pointsAwarded).toBe(600);
    // 500 - 50 entry + 600 win = 1050
    expect(result.balanceAfter).toBe(1_050);
    expect((await rewards.service.getMemberBalance(memberId)).pointsBalance).toBe(1_050);
  });

  it('rejects submitting a score twice for the same session', async () => {
    const { userId } = await makeFundedMember(db, rewards, 500);
    const gameId = await makeGame(db, { entryCost: 0 });
    const play = await mod.service.startForUser(userId, gameId, { ...ACTOR, userId });
    await mod.service.submitScoreForUser(
      userId,
      play.session.id,
      { score: 10 },
      { ...ACTOR, userId },
    );
    await expect(
      mod.service.submitScoreForUser(userId, play.session.id, { score: 20 }, { ...ACTOR, userId }),
    ).rejects.toThrow(/completed/i);
  });

  it('rejects starting a game without enough points (no session created)', async () => {
    const { userId, memberId } = await makeFundedMember(db, rewards, 10);
    const gameId = await makeGame(db, { entryCost: 50 });
    await expect(mod.service.startForUser(userId, gameId, { ...ACTOR, userId })).rejects.toThrow();
    expect((await rewards.service.getMemberBalance(memberId)).pointsBalance).toBe(10);
  });

  it('records play history for the member', async () => {
    const { userId } = await makeFundedMember(db, rewards, 500);
    const gameId = await makeGame(db, { entryCost: 0 });
    const play = await mod.service.startForUser(userId, gameId, { ...ACTOR, userId });
    await mod.service.submitScoreForUser(
      userId,
      play.session.id,
      { score: 100 },
      { ...ACTOR, userId },
    );

    const history = await mod.service.getHistory(userId, { page: 1, pageSize: 25 });
    expect(history.items.length).toBeGreaterThanOrEqual(1);
    expect(history.items[0]!.gameId).toBe(gameId);

    // sanity: the game row exists and is active
    const gameRow = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    expect(gameRow[0]!.status).toBe('ACTIVE');
  });
});
