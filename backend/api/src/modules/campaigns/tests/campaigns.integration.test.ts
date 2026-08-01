import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members } from '@/database/schema';
import { createRewardsModule, type RewardsModule } from '@/modules/rewards';

import { createCampaignsModule, type CampaignsModule, type RewardBridge } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000aa',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  correlationId: null,
};

let memberSeq = 0;
async function makeMember(
  db: Database,
  status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE',
): Promise<string> {
  memberSeq += 1;
  const rows = await db
    .insert(members)
    .values({
      memberNumber: `M-CMP${String(memberSeq).padStart(4, '0')}`,
      firstName: 'Campaign',
      lastName: `Member${memberSeq}`,
      email: `campaign${memberSeq}@campaigns.test`,
      status,
    })
    .returning({ id: members.id });
  return rows[0]!.id;
}

describe('campaigns module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let rewards: RewardsModule;
  let mod: CampaignsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    rewards = createRewardsModule(db);
    const rewardBridge: RewardBridge = {
      async allocate(memberId, params, actor) {
        const txn = await rewards.service.allocate(
          memberId,
          {
            points: params.points,
            ...(params.programId ? { programId: params.programId } : {}),
            description: params.description,
          },
          actor,
        );
        return txn.id;
      },
    };
    mod = createCampaignsModule(db, { rewardBridge });
  });

  afterAll(async () => {
    await client.close();
  });

  it('creates a campaign with rules + reward, then activates it', async () => {
    const campaign = await mod.service.create(
      {
        code: 'welcome-campaign',
        name: 'Welcome Campaign',
        type: 'REWARD',
        audienceType: 'ALL_MEMBERS',
        rules: [{ type: 'MEMBER_STATUS', value: 'ACTIVE' }],
        reward: { points: 250, description: 'Welcome points' },
      },
      ACTOR,
    );
    expect(campaign.code).toBe('WELCOME-CAMPAIGN');
    expect(campaign.status).toBe('DRAFT');
    expect(campaign.rules).toHaveLength(1);
    expect(campaign.reward?.points).toBe(250);

    const active = await mod.service.changeStatus(campaign.id, { status: 'ACTIVE' }, ACTOR);
    expect(active.status).toBe('ACTIVE');
  });

  it('rejects a duplicate campaign code', async () => {
    await expect(
      mod.service.create({ code: 'welcome-campaign', name: 'Dup', type: 'REWARD' }, ACTOR),
    ).rejects.toThrow(/already exists/i);
  });

  it('enforces the lifecycle state machine', async () => {
    const campaign = await mod.service.create(
      { code: 'life', name: 'Lifecycle', type: 'PROMOTIONAL' },
      ACTOR,
    );
    // DRAFT -> PAUSED is not permitted.
    await expect(
      mod.service.changeStatus(campaign.id, { status: 'PAUSED' }, ACTOR),
    ).rejects.toThrow(/cannot change/i);

    await mod.service.changeStatus(campaign.id, { status: 'ACTIVE' }, ACTOR);
    const paused = await mod.service.changeStatus(campaign.id, { status: 'PAUSED' }, ACTOR);
    expect(paused.status).toBe('PAUSED');
    const completed = await mod.service.changeStatus(campaign.id, { status: 'COMPLETED' }, ACTOR);
    expect(completed.status).toBe('COMPLETED');
  });

  it('schedules a campaign and moves DRAFT to SCHEDULED', async () => {
    const campaign = await mod.service.create(
      { code: 'sched', name: 'Scheduled', type: 'SEASONAL' },
      ACTOR,
    );
    const scheduled = await mod.service.schedule(
      campaign.id,
      { scheduleType: 'SCHEDULED', startAt: '2026-12-01T00:00:00.000Z' },
      ACTOR,
    );
    expect(scheduled.status).toBe('SCHEDULED');
    expect(scheduled.schedule?.scheduleType).toBe('SCHEDULED');
  });

  it('adds targets (auto-enrolled) and lists enrollments', async () => {
    const campaign = await mod.service.create(
      {
        code: 'manual',
        name: 'Manual',
        type: 'ENGAGEMENT',
        audienceType: 'MANUAL',
        reward: { points: 100 },
      },
      ACTOR,
    );
    const m1 = await makeMember(db);
    const m2 = await makeMember(db);
    await mod.service.addTargets(campaign.id, { memberIds: [m1, m2] }, ACTOR);

    const detail = await mod.service.getDetail(campaign.id);
    expect(detail.enrollment.enrolled).toBe(2);

    const enrollments = await mod.service.listEnrollments(campaign.id, {});
    expect(enrollments.total).toBe(2);
    expect(enrollments.items.every((e) => e.status === 'ENROLLED')).toBe(true);
  });

  it('lets an eligible member self-enroll and blocks an ineligible one', async () => {
    const campaign = await mod.service.create(
      {
        code: 'open',
        name: 'Open',
        type: 'PROMOTIONAL',
        audienceType: 'ALL_MEMBERS',
        rules: [{ type: 'MEMBER_STATUS', value: 'ACTIVE' }],
        reward: { points: 100 },
      },
      ACTOR,
    );
    await mod.service.changeStatus(campaign.id, { status: 'ACTIVE' }, ACTOR);

    const activeMember = await makeMember(db, 'ACTIVE');
    const enrollment = await mod.service.enroll(campaign.id, activeMember, ACTOR);
    expect(enrollment.status).toBe('ENROLLED');

    const suspended = await makeMember(db, 'SUSPENDED');
    await expect(mod.service.enroll(campaign.id, suspended, ACTOR)).rejects.toThrow(
      /not eligible/i,
    );
  });

  it('executes a campaign and issues rewards through the Rewards service', async () => {
    const campaign = await mod.service.create(
      {
        code: 'exec',
        name: 'Execute',
        type: 'REWARD',
        audienceType: 'MANUAL',
        reward: { points: 500 },
      },
      ACTOR,
    );
    await mod.service.changeStatus(campaign.id, { status: 'ACTIVE' }, ACTOR);
    const m1 = await makeMember(db);
    const m2 = await makeMember(db);
    await mod.service.addTargets(campaign.id, { memberIds: [m1, m2] }, ACTOR);

    // Dry run issues nothing.
    const dry = await mod.service.execute(campaign.id, { dryRun: true }, ACTOR);
    expect(dry.rewardsIssued).toBe(2);
    expect((await rewards.service.getMemberBalance(m1)).pointsBalance).toBe(0);

    const execution = await mod.service.execute(campaign.id, {}, ACTOR);
    expect(execution.rewardsIssued).toBe(2);
    expect(execution.pointsIssued).toBe(1_000);

    expect((await rewards.service.getMemberBalance(m1)).pointsBalance).toBe(500);
    expect((await rewards.service.getMemberBalance(m2)).pointsBalance).toBe(500);

    // Re-executing is idempotent (members already REWARDED).
    const rerun = await mod.service.execute(campaign.id, {}, ACTOR);
    expect(rerun.rewardsIssued).toBe(0);

    const detail = await mod.service.getDetail(campaign.id);
    expect(detail.enrollment.rewarded).toBe(2);
  });

  it('rejects executing a non-active campaign', async () => {
    const campaign = await mod.service.create(
      { code: 'draft-exec', name: 'Draft', type: 'REWARD', reward: { points: 10 } },
      ACTOR,
    );
    await expect(mod.service.execute(campaign.id, {}, ACTOR)).rejects.toThrow(/only active/i);
  });

  it('searches and filters campaigns', async () => {
    const byStatus = await mod.service.list({ status: 'ACTIVE' });
    expect(byStatus.items.every((c) => c.status === 'ACTIVE')).toBe(true);
    const search = await mod.service.list({ search: 'welcome' });
    expect(search.items.some((c) => c.code === 'WELCOME-CAMPAIGN')).toBe(true);
    const byType = await mod.service.list({ type: 'REWARD' });
    expect(byType.items.every((c) => c.type === 'REWARD')).toBe(true);
  });

  it('audits campaign mutations', async () => {
    const rows = await db.select().from(auditLogs);
    expect(rows.some((r) => r.module === 'campaigns' && r.entityType === 'campaign')).toBe(true);
  });
});
