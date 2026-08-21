import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import {
  auditLogs,
  campaigns,
  memberRewards,
  members,
  notifications,
  users,
  walletBalances,
  wallets,
} from '@/database/schema';

import { createReportsModule, type ReportsModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000aa',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  correlationId: null,
};

const PORTAL_USER_ID = '00000000-0000-0000-0000-0000000000c1';
const PORTAL_MEMBER_ID = '00000000-0000-0000-0000-0000000000d1';
const PORTAL_WALLET_ID = '00000000-0000-0000-0000-0000000000e1';

describe('reports module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: ReportsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mod = createReportsModule(db);

    // The acting admin needs a real identity row (report metadata FKs to users).
    await db.insert(users).values({ id: ACTOR.userId, email: 'admin@reports.test' });

    // --- Seed business data directly (reports only ever read it) --------------
    await db.insert(members).values([
      {
        id: '00000000-0000-0000-0000-000000000101',
        memberNumber: 'M-1',
        firstName: 'A',
        lastName: 'One',
        email: 'a1@reports.test',
        status: 'ACTIVE',
        joinedAt: new Date('2026-01-10T00:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000102',
        memberNumber: 'M-2',
        firstName: 'B',
        lastName: 'Two',
        email: 'b2@reports.test',
        status: 'ACTIVE',
        joinedAt: new Date('2026-06-10T00:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000103',
        memberNumber: 'M-3',
        firstName: 'C',
        lastName: 'Three',
        email: 'c3@reports.test',
        status: 'SUSPENDED',
        joinedAt: new Date('2026-06-20T00:00:00Z'),
      },
    ]);

    await db.insert(wallets).values([
      {
        id: '00000000-0000-0000-0000-000000000201',
        walletNumber: 'W-1',
        memberId: '00000000-0000-0000-0000-000000000101',
        currencyCode: 'USD',
        status: 'ACTIVE',
      },
    ]);
    await db.insert(walletBalances).values([
      {
        walletId: '00000000-0000-0000-0000-000000000201',
        currencyCode: 'USD',
        availableMinor: 50_000,
        heldMinor: 1_000,
        totalMinor: 51_000,
      },
    ]);

    await db.insert(memberRewards).values([
      {
        memberId: '00000000-0000-0000-0000-000000000101',
        pointsBalance: 800,
        lifetimeEarned: 1_000,
        lifetimeRedeemed: 200,
      },
    ]);

    await db.insert(campaigns).values([
      { code: 'C-1', name: 'Camp 1', type: 'PROMOTIONAL', status: 'ACTIVE' },
      { code: 'C-2', name: 'Camp 2', type: 'REWARD', status: 'DRAFT' },
    ]);

    await db.insert(notifications).values([
      { channel: 'IN_APP', body: 'hi', status: 'DELIVERED' },
      { channel: 'EMAIL', body: 'hi', status: 'FAILED' },
    ]);

    await db.insert(auditLogs).values([
      { entityType: 'member', action: 'CREATE', module: 'members', userId: ACTOR.userId },
      { entityType: 'wallet', action: 'UPDATE', module: 'wallet', userId: ACTOR.userId },
    ]);

    // Portal member linked to a login user (for member-portal summaries).
    await db.insert(users).values({ id: PORTAL_USER_ID, email: 'portal@reports.test' });
    await db.insert(members).values({
      id: PORTAL_MEMBER_ID,
      memberNumber: 'M-PORTAL',
      firstName: 'Sam',
      lastName: 'Portal',
      email: 'sam@reports.test',
      userId: PORTAL_USER_ID,
      status: 'ACTIVE',
    });
    await db.insert(wallets).values({
      id: PORTAL_WALLET_ID,
      walletNumber: 'W-PORTAL',
      memberId: PORTAL_MEMBER_ID,
      currencyCode: 'USD',
      status: 'ACTIVE',
    });
    await db.insert(walletBalances).values({
      walletId: PORTAL_WALLET_ID,
      currencyCode: 'USD',
      availableMinor: 12_000,
      heldMinor: 0,
      totalMinor: 12_000,
    });
    await db.insert(memberRewards).values({
      memberId: PORTAL_MEMBER_ID,
      pointsBalance: 300,
      lifetimeEarned: 300,
      lifetimeRedeemed: 0,
    });
  });

  afterAll(async () => {
    await client.close();
  });

  it('lists seeded report definitions with their categories', async () => {
    const page = await mod.service.listReports({});
    expect(page.total).toBeGreaterThanOrEqual(6);
    const members = page.items.find((d) => d.code === 'MEMBERS_SUMMARY');
    expect(members?.categoryCode).toBe('OPERATIONAL');
  });

  it('never surfaces the monetary WALLET report in the user-facing catalog', async () => {
    // Points/rewards product: the WALLET summary is not listed, and an explicit
    // source=WALLET filter returns nothing — the report is undiscoverable here.
    const all = await mod.service.listReports({});
    expect(all.items.find((d) => d.code === 'WALLET_SUMMARY')).toBeUndefined();
    expect(all.items.some((d) => d.source === 'WALLET')).toBe(false);

    const filtered = await mod.service.listReports({ source: 'WALLET' });
    expect(filtered.items).toHaveLength(0);
    expect(filtered.total).toBe(0);
  });

  it('runs the members summary with correct aggregates', async () => {
    const result = await mod.service.runReport({ code: 'MEMBERS_SUMMARY' }, ACTOR);
    const total = result.rows.reduce((sum, row) => sum + Number(row.count), 0);
    // 3 seeded members + 1 portal member.
    expect(total).toBe(4);
    expect(result.summary.total).toBe(4);
    expect(result.summary.active).toBe(3);
  });

  it('applies date-range filters to new-member counts', async () => {
    const result = await mod.service.runReport(
      { code: 'MEMBERS_SUMMARY', filters: { dateFrom: '2026-06-01T00:00:00.000Z' } },
      ACTOR,
    );
    // Only the two members joined on/after 2026-06-01 (the portal member has now()).
    expect(Number(result.summary.newInRange)).toBeGreaterThanOrEqual(2);
    expect(Number(result.summary.newInRange)).toBeLessThan(Number(result.summary.total));
  });

  it('reads maintained projections for wallet and reward totals', async () => {
    const wallet = await mod.service.runReport({ code: 'WALLET_SUMMARY' }, ACTOR);
    const available = wallet.rows.find((r) => String(r.metric).startsWith('Total available'));
    expect(Number(available?.value)).toBe(62_000); // 50_000 + 12_000

    const rewards = await mod.service.runReport({ code: 'REWARDS_SUMMARY' }, ACTOR);
    expect(rewards.summary.pointsBalance).toBe(1_100); // 800 + 300
  });

  it('summarises notifications by channel', async () => {
    const result = await mod.service.runReport({ code: 'NOTIFICATIONS_SUMMARY' }, ACTOR);
    expect(result.summary.total).toBe(2);
    expect(result.summary.delivered).toBe(1);
    expect(result.summary.failed).toBe(1);
  });

  it('rejects an unknown report code', async () => {
    await expect(mod.service.runReport({ code: 'DOES_NOT_EXIST' }, ACTOR)).rejects.toThrow(
      /not found/i,
    );
  });

  it('generates a CSV export and serves it for download', async () => {
    const created = await mod.service.createExport(
      { code: 'MEMBERS_SUMMARY', format: 'CSV' },
      ACTOR,
    );
    expect(created.status).toBe('COMPLETED');
    expect(created.rowCount).toBeGreaterThan(0);

    const file = await mod.service.downloadExport(created.id);
    expect(file.contentType).toContain('text/csv');
    expect(file.content.split('\r\n')[0]).toBe('Status,Members');
    expect(file.fileName).toBe('members_summary.csv');
  });

  it('records execution history for runs and exports', async () => {
    const history = await mod.service.listHistory({});
    expect(history.total).toBeGreaterThan(0);
    expect(history.items.some((h) => h.trigger === 'RUN')).toBe(true);
    expect(history.items.some((h) => h.trigger === 'EXPORT')).toBe(true);
  });

  it('builds a dashboard with KPIs, seeded widgets and recent activity', async () => {
    const dashboard = await mod.service.getDashboard(ACTOR.userId);
    expect(dashboard.kpis.members.total).toBe(4);
    expect(dashboard.kpis.walletAvailableMinor).toBe(62_000);
    expect(dashboard.kpis.activeCampaigns).toBe(1);
    expect(dashboard.kpis.rewardPoints).toBe(1_100);
    expect(dashboard.widgets.length).toBeGreaterThanOrEqual(5);
    expect(dashboard.layout.length).toBe(dashboard.widgets.length);
    expect(dashboard.recentActivity.length).toBeGreaterThan(0);
  });

  it('persists a per-user dashboard layout', async () => {
    const layout = await mod.service.updateDashboardLayout(
      ACTOR.userId,
      { layout: [{ widgetCode: 'KPI_TOTAL_MEMBERS', position: 0 }] },
      ACTOR,
    );
    expect(layout).toHaveLength(1);
    const dashboard = await mod.service.getDashboard(ACTOR.userId);
    expect(dashboard.layout).toEqual([{ widgetCode: 'KPI_TOTAL_MEMBERS', position: 0 }]);
  });

  it('creates and runs a due schedule producing an export', async () => {
    const schedule = await mod.service.createSchedule(
      { code: 'WALLET_SUMMARY', name: 'Daily wallet', frequency: 'DAILY', format: 'CSV' },
      ACTOR,
    );
    expect(schedule.nextRunAt).not.toBeNull();

    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const ran = await mod.service.runDueSchedules(ACTOR, future);
    expect(ran).toBeGreaterThanOrEqual(1);

    const exports = await mod.service.listExports({ code: 'WALLET_SUMMARY' });
    expect(exports.items.some((e) => e.status === 'COMPLETED')).toBe(true);
  });

  it('saves reports, filters and favorites', async () => {
    const saved = await mod.service.saveReport(
      ACTOR.userId,
      { name: 'My members', code: 'MEMBERS_SUMMARY', isShared: true },
      ACTOR,
    );
    expect(saved.definitionCode).toBe('MEMBERS_SUMMARY');
    const savedList = await mod.service.listSavedReports(ACTOR.userId, {});
    expect(savedList.items.some((s) => s.id === saved.id)).toBe(true);

    const filter = await mod.service.createSavedFilter(
      ACTOR.userId,
      { reportCode: 'MEMBERS_SUMMARY', name: 'Active only', filters: { status: 'ACTIVE' } },
      ACTOR,
    );
    expect(filter.name).toBe('Active only');

    const fav = await mod.service.addFavorite(ACTOR.userId, { definitionCode: 'WALLET_SUMMARY' });
    expect(fav.added).toBe(true);
    const favorites = await mod.service.listFavorites(ACTOR.userId);
    expect(favorites.some((f) => f.definitionCode === 'WALLET_SUMMARY')).toBe(true);
  });

  it('serves member-portal summaries scoped to the caller', async () => {
    const wallet = await mod.service.memberWalletSummary(PORTAL_USER_ID);
    expect(wallet.hasWallet).toBe(true);
    expect(wallet.availableMinor).toBe(12_000);

    const rewards = await mod.service.memberRewardSummary(PORTAL_USER_ID);
    expect(rewards.pointsBalance).toBe(300);
  });

  it('rejects member-portal access for accounts without a member profile', async () => {
    await expect(mod.service.memberWalletSummary(ACTOR.userId)).rejects.toThrow(/member profile/i);
  });

  it('audits report execution and exports', async () => {
    const rows = await db.select().from(auditLogs);
    expect(rows.some((r) => r.module === 'reports' && r.entityType === 'report')).toBe(true);
  });
});
