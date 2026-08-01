import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members, rewardTransactions } from '@/database/schema';

import { pointsDelta } from '../domain/points';
import { createRewardsModule, type RewardsModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000aa',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  correlationId: null,
};

let memberSeq = 0;
async function makeMember(db: Database): Promise<string> {
  memberSeq += 1;
  const rows = await db
    .insert(members)
    .values({
      memberNumber: `M-RWD${String(memberSeq).padStart(4, '0')}`,
      firstName: 'Reward',
      lastName: `Member${memberSeq}`,
      email: `reward${memberSeq}@rewards.test`,
      status: 'ACTIVE',
    })
    .returning({ id: members.id });
  return rows[0]!.id;
}

describe('rewards module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: RewardsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mod = createRewardsModule(db);
  });

  afterAll(async () => {
    await client.close();
  });

  it('creates a program with rules + expiry, then activates it', async () => {
    const program = await mod.service.createProgram(
      {
        code: 'welcome',
        name: 'Welcome Bonus',
        type: 'FIXED',
        categoryCode: 'GENERAL',
        rules: [{ name: 'Signup', type: 'FIXED', points: 500 }],
        expiry: { policy: 'ROLLING', rollingDays: 365 },
      },
      ACTOR,
    );
    expect(program.code).toBe('WELCOME');
    expect(program.status).toBe('DRAFT');
    expect(program.categoryCode).toBe('GENERAL');
    expect(program.rules).toHaveLength(1);
    expect(program.expiry?.policy).toBe('ROLLING');

    const activated = await mod.service.changeProgramStatus(
      program.id,
      { status: 'ACTIVE' },
      ACTOR,
    );
    expect(activated.status).toBe('ACTIVE');
  });

  it('rejects a duplicate program code', async () => {
    await expect(
      mod.service.createProgram({ code: 'welcome', name: 'Dup', type: 'FIXED' }, ACTOR),
    ).rejects.toThrow(/already exists/i);
  });

  it('earns points explicitly and via a FIXED rule', async () => {
    const memberId = await makeMember(db);
    const earn = await mod.service.allocate(
      memberId,
      { points: 1_000, description: 'Bonus' },
      ACTOR,
    );
    expect(earn.type).toBe('EARN');
    expect(earn.balanceAfter).toBe(1_000);

    const program = await mod.service.createProgram(
      {
        code: 'rule-prog',
        name: 'Rule Program',
        type: 'FIXED',
        rules: [{ name: 'Flat', type: 'FIXED', points: 250 }],
      },
      ACTOR,
    );
    const ruleId = program.rules[0]!.id;
    const ruleEarn = await mod.service.allocate(memberId, { ruleId }, ACTOR);
    expect(ruleEarn.points).toBe(250);

    const balance = await mod.service.getMemberBalance(memberId);
    expect(balance.pointsBalance).toBe(1_250);
    expect(balance.lifetimeEarned).toBe(1_250);
  });

  it('redeems points (partial) and enforces the balance', async () => {
    const memberId = await makeMember(db);
    await mod.service.allocate(memberId, { points: 800 }, ACTOR);

    const redemption = await mod.service.redeem(
      memberId,
      { points: 300, note: 'Coffee voucher' },
      ACTOR,
    );
    expect(redemption.points).toBe(300);
    expect(redemption.status).toBe('COMPLETED');

    const balance = await mod.service.getMemberBalance(memberId);
    expect(balance.pointsBalance).toBe(500);
    expect(balance.lifetimeRedeemed).toBe(300);

    await expect(mod.service.redeem(memberId, { points: 5_000 }, ACTOR)).rejects.toThrow(
      /insufficient/i,
    );
  });

  it('applies manual adjustments in both directions', async () => {
    const memberId = await makeMember(db);
    await mod.service.allocate(memberId, { points: 100 }, ACTOR);
    await mod.service.adjust(
      memberId,
      { direction: 'CREDIT', points: 50, reason: 'Goodwill' },
      ACTOR,
    );
    await mod.service.adjust(
      memberId,
      { direction: 'DEBIT', points: 30, reason: 'Correction' },
      ACTOR,
    );

    const balance = await mod.service.getMemberBalance(memberId);
    expect(balance.pointsBalance).toBe(120);

    await expect(
      mod.service.adjust(
        memberId,
        { direction: 'DEBIT', points: 9_999, reason: 'Too much' },
        ACTOR,
      ),
    ).rejects.toThrow(/insufficient/i);
  });

  it('reverses a transaction and flags the original REVERSED', async () => {
    const memberId = await makeMember(db);
    const earn = await mod.service.allocate(memberId, { points: 400 }, ACTOR);

    const reversal = await mod.service.reverse(memberId, earn.id, ACTOR);
    expect(reversal.type).toBe('REVERSAL');
    expect(reversal.reversalOfId).toBe(earn.id);

    const balance = await mod.service.getMemberBalance(memberId);
    expect(balance.pointsBalance).toBe(0);

    const [original] = await db
      .select()
      .from(rewardTransactions)
      .where(eq(rewardTransactions.id, earn.id));
    expect(original?.status).toBe('REVERSED');

    await expect(mod.service.reverse(memberId, earn.id, ACTOR)).rejects.toThrow(/already/i);
  });

  it('keeps the stored balance consistent with the derived ledger balance', async () => {
    const memberId = await makeMember(db);
    await mod.service.allocate(memberId, { points: 1_000 }, ACTOR);
    await mod.service.redeem(memberId, { points: 250 }, ACTOR);
    await mod.service.adjust(memberId, { direction: 'CREDIT', points: 75, reason: 'Bonus' }, ACTOR);

    const validation = await mod.service.validateBalance(memberId);
    expect(validation.consistent).toBe(true);
    expect(validation.derivedBalance).toBe(validation.storedBalance);

    const ledger = await db
      .select()
      .from(rewardTransactions)
      .where(eq(rewardTransactions.memberId, memberId));
    ledger.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let running = 0;
    for (const entry of ledger) {
      running += pointsDelta(entry.type, entry.direction, entry.points);
      expect(entry.balanceAfter).toBe(running);
    }
  });

  it('expires points past their expiry date', async () => {
    const memberId = await makeMember(db);
    await mod.service.allocate(memberId, { points: 600, expiresInDays: 1 }, ACTOR);
    await mod.service.allocate(memberId, { points: 400 }, ACTOR); // no expiry

    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = await mod.service.processExpirations({ asOf: future }, ACTOR);
    expect(result.expiredPoints).toBeGreaterThanOrEqual(600);

    const balance = await mod.service.getMemberBalance(memberId);
    expect(balance.pointsBalance).toBe(400);

    // Re-running is idempotent (lots already processed).
    const rerun = await mod.service.processExpirations({ asOf: future }, ACTOR);
    expect(rerun.expiredPoints).toBe(0);
  });

  it('handles concurrent allocations without losing updates', async () => {
    const memberId = await makeMember(db);
    await Promise.all(
      Array.from({ length: 15 }, () => mod.service.allocate(memberId, { points: 20 }, ACTOR)),
    );
    const balance = await mod.service.getMemberBalance(memberId);
    expect(balance.pointsBalance).toBe(300);
    expect((await mod.service.validateBalance(memberId)).consistent).toBe(true);
  });

  it('searches programs and filters the transaction ledger', async () => {
    const programs = await mod.service.listPrograms({ search: 'welcome' });
    expect(programs.items.some((p) => p.code === 'WELCOME')).toBe(true);

    const memberId = await makeMember(db);
    await mod.service.allocate(memberId, { points: 100 }, ACTOR);
    await mod.service.redeem(memberId, { points: 40 }, ACTOR);

    const earns = await mod.service.getMemberHistory(memberId, { type: 'EARN' });
    expect(earns.items.every((t) => t.type === 'EARN')).toBe(true);
    expect(earns.items).toHaveLength(1);

    const all = await mod.service.listTransactions({ memberId });
    expect(all.total).toBeGreaterThanOrEqual(2);
  });

  it('audits points-changing operations', async () => {
    const rows = await db.select().from(auditLogs);
    expect(rows.some((r) => r.module === 'rewards' && r.entityType === 'reward_transaction')).toBe(
      true,
    );
    expect(rows.some((r) => r.module === 'rewards' && r.entityType === 'reward_program')).toBe(
      true,
    );
  });
});
