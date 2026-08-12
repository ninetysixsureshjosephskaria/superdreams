import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import {
  auditLogs,
  memberRewards,
  members,
  redemptionRequests,
  rewardRedemptions,
  rewardTransactions,
  users,
} from '@/database/schema';
import type { Executor } from '@/database/types';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';
import { createRewardsModule, type RewardsModule } from '@/modules/rewards';

import { RedemptionRequestEventBus, type RedemptionRequestEvent } from '../events';
import { createRedemptionRequestsModule, type RedemptionRequestsModule } from '../index';
import { RedemptionMemberLookupRepository, RedemptionRequestRepository } from '../repositories';
import type { RedemptionRequestAuditRepository } from '../repositories';
import { RedemptionRequestService, type RewardRedeemPort } from '../services';

/**
 * P2 — Member points-redemption request/approval workflow (service integration, PGlite).
 *
 * Exercises the full lifecycle against a real Postgres (PGlite) with the real
 * migration 0024. The approval debit uses the REAL rewards `redeemWithin(tx,…)`
 * seam, so the tests prove atomicity end-to-end: points are debited (and a
 * completed `reward_redemptions` row created) only on approval, in one
 * transaction that rolls back on any failure — no hold while PENDING, no debit on
 * reject, and insufficient-balance-at-approval leaves the request PENDING. No
 * production code is modified by this test.
 */

const U_A = '00000000-0000-0000-0000-0000000000e1';
const U_B = '00000000-0000-0000-0000-0000000000e2';
const U_LOW = '00000000-0000-0000-0000-0000000000e3';
const U_ORPHAN = '00000000-0000-0000-0000-0000000000e4';

const M_A = '00000000-0000-0000-0000-000000000d01'; // ACTIVE, balance 1000
const M_B = '00000000-0000-0000-0000-000000000d02'; // ACTIVE, balance 1000
const M_LOW = '00000000-0000-0000-0000-000000000d03'; // ACTIVE, balance 50

const ADMIN = '00000000-0000-0000-0000-0000000000ff';

interface Actor {
  userId: string;
  ipAddress: null;
  userAgent: null;
  correlationId: null;
}
const admin: Actor = { userId: ADMIN, ipAddress: null, userAgent: null, correlationId: null };
const actorFor = (userId: string): Actor => ({
  userId,
  ipAddress: null,
  userAgent: null,
  correlationId: null,
});

const events: RedemptionRequestEvent[] = [];
let db: Database;
let rewards: RewardsModule;
let redeemPort: RewardRedeemPort;

async function seedUser(id: string, email: string): Promise<void> {
  await db.insert(users).values({ id, email, status: 'ACTIVE' });
}

async function seedMember(id: string, suffix: string, userId: string): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-RDM${suffix}`,
    firstName: 'Rdm',
    lastName: suffix,
    email: `rdm${suffix}@redemption.test`,
    status: 'ACTIVE',
    userId,
    createdBy: ADMIN,
    updatedBy: ADMIN,
  });
}

async function setBalance(memberId: string, points: number): Promise<void> {
  await db.insert(memberRewards).values({
    memberId,
    pointsBalance: points,
    lifetimeEarned: points,
    lifetimeRedeemed: 0,
    createdBy: ADMIN,
    updatedBy: ADMIN,
  });
}

async function balanceOf(memberId: string): Promise<number | null> {
  const [row] = await db
    .select({ b: memberRewards.pointsBalance })
    .from(memberRewards)
    .where(eq(memberRewards.memberId, memberId));
  return row?.b ?? null;
}

async function statusOf(id: string): Promise<string | null> {
  const [row] = await db
    .select({ status: redemptionRequests.status })
    .from(redemptionRequests)
    .where(eq(redemptionRequests.id, id));
  return row?.status ?? null;
}

async function redemptionRowCount(memberId: string): Promise<number> {
  const rows = await db
    .select({ id: rewardRedemptions.id })
    .from(rewardRedemptions)
    .where(eq(rewardRedemptions.memberId, memberId));
  return rows.length;
}

async function debitLedgerCount(memberId: string): Promise<number> {
  const rows = await db
    .select({ id: rewardTransactions.id })
    .from(rewardTransactions)
    .where(and(eq(rewardTransactions.memberId, memberId), eq(rewardTransactions.type, 'REDEEM')));
  return rows.length;
}

async function auditCount(entityId: string, action?: 'CREATE' | 'UPDATE'): Promise<number> {
  const filters = [eq(auditLogs.entityId, entityId), eq(auditLogs.module, 'redemption-requests')];
  if (action) {
    filters.push(eq(auditLogs.action, action));
  }
  const rows = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(and(...filters));
  return rows.length;
}

describe('P2 redemption-request workflow (PGlite)', () => {
  let client: PGlite;
  let mod: RedemptionRequestsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;

    rewards = createRewardsModule(db);
    redeemPort = {
      redeemWithin: (tx, memberId, points, options) =>
        rewards.service.redeemWithin(tx, memberId, points, options),
    };
    mod = createRedemptionRequestsModule(db, { rewardRedeem: redeemPort });
    mod.events.subscribe((e) => {
      events.push(e);
    });

    await Promise.all([
      seedUser(U_A, 'a@redemption.test'),
      seedUser(U_B, 'b@redemption.test'),
      seedUser(U_LOW, 'low@redemption.test'),
      seedUser(U_ORPHAN, 'orphan@redemption.test'),
    ]);
    await seedMember(M_A, 'A', U_A);
    await seedMember(M_B, 'B', U_B);
    await seedMember(M_LOW, 'LOW', U_LOW);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    await db.delete(redemptionRequests);
    await db.delete(rewardRedemptions);
    await db.delete(rewardTransactions);
    await db.delete(memberRewards);
    await db.delete(auditLogs);
    events.length = 0;
    await setBalance(M_A, 1000);
    await setBalance(M_B, 1000);
    await setBalance(M_LOW, 50);
  });

  // --- Submit ---------------------------------------------------------------

  it('1. an active member submits a request → PENDING, member from token, NO debit', async () => {
    const result = await mod.service.submit(
      U_A,
      { pointsRequested: 300, note: 'trip' },
      actorFor(U_A),
    );
    expect(result.memberId).toBe(M_A);
    expect(result.status).toBe('PENDING');
    expect(result.pointsRequested).toBe(300);
    expect(result.decidedBy).toBeNull();
    expect(await balanceOf(M_A)).toBe(1000); // no hold / no debit at submit
    expect(await redemptionRowCount(M_A)).toBe(0);
  });

  it('2. submit is idempotent — a second submit returns the same PENDING (no duplicate)', async () => {
    const first = await mod.service.submit(U_A, { pointsRequested: 100 }, actorFor(U_A));
    const second = await mod.service.submit(U_A, { pointsRequested: 999 }, actorFor(U_A));
    expect(second.id).toBe(first.id);
    expect(second.pointsRequested).toBe(100); // the existing request, unchanged
    const rows = await db
      .select({ id: redemptionRequests.id })
      .from(redemptionRequests)
      .where(eq(redemptionRequests.memberId, M_A));
    expect(rows).toHaveLength(1);
  });

  it('3. a user with no member profile cannot submit', async () => {
    await expect(
      mod.service.submit(U_ORPHAN, { pointsRequested: 100 }, actorFor(U_ORPHAN)),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('4. a member may submit even when the current balance is insufficient (checked at approval)', async () => {
    const result = await mod.service.submit(U_LOW, { pointsRequested: 100 }, actorFor(U_LOW));
    expect(result.status).toBe('PENDING'); // balance is 50; submit still succeeds
  });

  it('5. the partial unique index forbids two concurrent PENDING rows for one member', async () => {
    await db
      .insert(redemptionRequests)
      .values({ memberId: M_A, pointsRequested: 10, status: 'PENDING' });
    await expect(
      db
        .insert(redemptionRequests)
        .values({ memberId: M_A, pointsRequested: 20, status: 'PENDING' }),
    ).rejects.toThrow();
  });

  it('6. submit writes a CREATE audit and publishes RedemptionRequestSubmitted', async () => {
    const result = await mod.service.submit(U_A, { pointsRequested: 100 }, actorFor(U_A));
    expect(await auditCount(result.id, 'CREATE')).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'RedemptionRequestSubmitted',
        requestId: result.id,
        memberId: M_A,
      }),
    );
  });

  // --- getMine / list / getById ---------------------------------------------

  it('7. getMine returns the latest request; null when none; orphan throws', async () => {
    expect(await mod.service.getMine(U_B)).toBeNull();
    const created = await mod.service.submit(U_A, { pointsRequested: 100 }, actorFor(U_A));
    expect((await mod.service.getMine(U_A))?.id).toBe(created.id);
    await expect(mod.service.getMine(U_ORPHAN)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('8. list returns paginated requests and filters by status', async () => {
    const a = await mod.service.submit(U_A, { pointsRequested: 100 }, actorFor(U_A));
    await mod.service.submit(U_B, { pointsRequested: 100 }, actorFor(U_B));
    await mod.service.reject(a.id, {}, admin);
    expect((await mod.service.list({})).total).toBe(2);
    const rejected = await mod.service.list({ status: 'REJECTED' });
    expect(rejected.total).toBe(1);
    expect(rejected.items[0]?.status).toBe('REJECTED');
  });

  it('9. getById returns the request; unknown id throws NotFound', async () => {
    const created = await mod.service.submit(U_A, { pointsRequested: 100 }, actorFor(U_A));
    expect((await mod.service.getById(created.id)).id).toBe(created.id);
    await expect(
      mod.service.getById('00000000-0000-0000-0000-0000000000cc'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  // --- Approve --------------------------------------------------------------

  it('10. approve debits points, creates a completed redemption, marks APPROVED + audit', async () => {
    const created = await mod.service.submit(U_A, { pointsRequested: 300 }, actorFor(U_A));
    const approved = await mod.service.approve(created.id, admin);
    expect(approved.status).toBe('APPROVED');
    expect(approved.decidedBy).toBe(ADMIN);
    expect(approved.decidedAt).not.toBeNull();
    expect(await balanceOf(M_A)).toBe(700); // 1000 - 300 debited
    expect(await redemptionRowCount(M_A)).toBe(1); // completed reward_redemptions row
    expect(await debitLedgerCount(M_A)).toBe(1); // REDEEM/DEBIT ledger row
    expect(await auditCount(created.id, 'UPDATE')).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'RedemptionRequestApproved', requestId: created.id }),
    );
  });

  it('11. approve is idempotent — a second approve does not debit again', async () => {
    const created = await mod.service.submit(U_A, { pointsRequested: 300 }, actorFor(U_A));
    await mod.service.approve(created.id, admin);
    const again = await mod.service.approve(created.id, admin);
    expect(again.status).toBe('APPROVED');
    expect(await balanceOf(M_A)).toBe(700); // still one debit
    expect(await redemptionRowCount(M_A)).toBe(1);
  });

  it('12. CRITICAL (D8): insufficient balance at approval → stays PENDING, NO debit, NO redemption/audit', async () => {
    const created = await mod.service.submit(U_LOW, { pointsRequested: 100 }, actorFor(U_LOW)); // balance 50
    await expect(mod.service.approve(created.id, admin)).rejects.toBeInstanceOf(BusinessRuleError);
    expect(await statusOf(created.id)).toBe('PENDING'); // NOT auto-rejected
    expect(await balanceOf(M_LOW)).toBe(50); // unchanged — no debit
    expect(await redemptionRowCount(M_LOW)).toBe(0);
    expect(await debitLedgerCount(M_LOW)).toBe(0);
    expect(await auditCount(created.id, 'UPDATE')).toBe(0);
    expect(events.some((e) => e.type === 'RedemptionRequestApproved')).toBe(false);
  });

  it('13. approving a REJECTED request throws ConflictError', async () => {
    const created = await mod.service.submit(U_A, { pointsRequested: 100 }, actorFor(U_A));
    await mod.service.reject(created.id, {}, admin);
    await expect(mod.service.approve(created.id, admin)).rejects.toBeInstanceOf(ConflictError);
  });

  it('14. approving an unknown id throws NotFound', async () => {
    await expect(
      mod.service.approve('00000000-0000-0000-0000-0000000000cd', admin),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  // --- Reject ---------------------------------------------------------------

  it('15. reject marks REJECTED with reason and NEVER touches the points ledger', async () => {
    const created = await mod.service.submit(U_A, { pointsRequested: 300 }, actorFor(U_A));
    const rejected = await mod.service.reject(created.id, { reason: 'not now' }, admin);
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.decisionReason).toBe('not now');
    expect(rejected.decidedBy).toBe(ADMIN);
    expect(await balanceOf(M_A)).toBe(1000); // unchanged
    expect(await redemptionRowCount(M_A)).toBe(0);
    expect(await debitLedgerCount(M_A)).toBe(0);
    expect(await auditCount(created.id, 'UPDATE')).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'RedemptionRequestRejected', requestId: created.id }),
    );
  });

  it('16. reject is idempotent; rejecting an APPROVED request throws ConflictError', async () => {
    const created = await mod.service.submit(U_A, { pointsRequested: 100 }, actorFor(U_A));
    await mod.service.reject(created.id, {}, admin);
    expect((await mod.service.reject(created.id, {}, admin)).status).toBe('REJECTED');
    const created2 = await mod.service.submit(U_B, { pointsRequested: 100 }, actorFor(U_B));
    await mod.service.approve(created2.id, admin);
    await expect(mod.service.reject(created2.id, {}, admin)).rejects.toBeInstanceOf(ConflictError);
  });

  it('17. a REJECTED member may submit a fresh request (D10)', async () => {
    const first = await mod.service.submit(U_A, { pointsRequested: 100 }, actorFor(U_A));
    await mod.service.reject(first.id, {}, admin);
    const again = await mod.service.submit(U_A, { pointsRequested: 200 }, actorFor(U_A));
    expect(again.id).not.toBe(first.id);
    expect(again.status).toBe('PENDING');
  });

  // --- Atomicity: concurrency + rollback ------------------------------------

  it('18. concurrent approve vs reject: exactly one terminal state; NEVER REJECTED+debited', async () => {
    // Ordering A: approve first.
    const reqA = await mod.service.submit(U_A, { pointsRequested: 300 }, actorFor(U_A));
    const outA = await Promise.allSettled([
      mod.service.approve(reqA.id, admin),
      mod.service.reject(reqA.id, { reason: 'race' }, admin),
    ]);
    expect(outA.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const statusA = await statusOf(reqA.id);
    expect(['APPROVED', 'REJECTED']).toContain(statusA);
    const balA = await balanceOf(M_A);
    const rowsA = await redemptionRowCount(M_A);
    // INVARIANT: a rejected request never coexists with a debit / redemption row.
    expect(statusA === 'REJECTED' && (balA !== 1000 || rowsA > 0)).toBe(false);
    // Positive invariant: APPROVED ⇔ debited.
    expect(statusA === 'APPROVED').toBe(balA === 700 && rowsA === 1);

    // Ordering B (fresh member): reject first.
    const reqB = await mod.service.submit(U_B, { pointsRequested: 400 }, actorFor(U_B));
    const outB = await Promise.allSettled([
      mod.service.reject(reqB.id, { reason: 'race' }, admin),
      mod.service.approve(reqB.id, admin),
    ]);
    expect(outB.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const statusB = await statusOf(reqB.id);
    const balB = await balanceOf(M_B);
    expect(statusB === 'REJECTED' && balB !== 1000).toBe(false);
    expect(statusB === 'APPROVED').toBe(balB === 600);
  });

  it('19. failure AFTER the in-tx debit (audit throws) rolls back everything', async () => {
    const created = await mod.service.submit(U_A, { pointsRequested: 300 }, actorFor(U_A));

    // A service whose audit repo throws on the decision UPDATE — the failure lands
    // AFTER redeemWithin has debited + created the redemption row in the same tx.
    const failingAudit = {
      write: (entry: { action: string }, _executor: Executor): Promise<void> =>
        entry.action === 'UPDATE' ? Promise.reject(new Error('audit failure')) : Promise.resolve(),
    } as unknown as RedemptionRequestAuditRepository;

    const failingService = new RedemptionRequestService(
      db,
      new RedemptionRequestRepository(db),
      new RedemptionMemberLookupRepository(db),
      failingAudit,
      new RedemptionRequestEventBus(),
      redeemPort,
    );

    await expect(failingService.approve(created.id, admin)).rejects.toThrow('audit failure');
    expect(await statusOf(created.id)).toBe('PENDING'); // status rolled back
    expect(await balanceOf(M_A)).toBe(1000); // debit rolled back
    expect(await redemptionRowCount(M_A)).toBe(0); // redemption row rolled back
    expect(await debitLedgerCount(M_A)).toBe(0); // ledger row rolled back
    expect(await auditCount(created.id, 'UPDATE')).toBe(0);
  });

  it('20. decisions never touch another member’s balance', async () => {
    const created = await mod.service.submit(U_A, { pointsRequested: 300 }, actorFor(U_A));
    await mod.service.approve(created.id, admin);
    expect(await balanceOf(M_B)).toBe(1000); // untouched
  });
});
