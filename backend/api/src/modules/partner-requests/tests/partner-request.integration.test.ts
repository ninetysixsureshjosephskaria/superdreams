import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members, partnerRequests, roles, userRoles, users } from '@/database/schema';
import type { Executor } from '@/database/types';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';

import { PartnerRequestEventBus, type PartnerRequestEvent } from '../events';
import { createPartnerRequestsModule, type PartnerRequestsModule } from '../index';
import { PartnerMemberLookupRepository, PartnerRequestRepository } from '../repositories';
import type { PartnerRequestAuditRepository } from '../repositories';
import {
  PartnerRequestService,
  type PartnerRoleAssignerPort,
  type PartnerRoleCheckerPort,
} from '../services';

/**
 * P1.3 — Member→Partner request / approval workflow (service integration, PGlite).
 *
 * Exercises the full lifecycle against a real Postgres (PGlite) with the real
 * migration 0023. The RBAC role-assignment seam is stubbed through the module's
 * transaction-aware port so the stub performs the real `user_roles` INSERT
 * **through the caller's transaction** — this lets the tests prove atomicity:
 * the grant commits with the request decision and rolls back with it. No
 * production code is modified by this test.
 */

// Auth users.
const U_ACTIVE = '00000000-0000-0000-0000-0000000000a1';
const U_ACTIVE2 = '00000000-0000-0000-0000-0000000000a2';
const U_PENDING = '00000000-0000-0000-0000-0000000000a3';
const U_SUSPENDED = '00000000-0000-0000-0000-0000000000a4';
const U_PARTNER = '00000000-0000-0000-0000-0000000000a5';
const U_ORPHAN = '00000000-0000-0000-0000-0000000000a6';
const U_REF = '00000000-0000-0000-0000-0000000000a7';

// Members.
const M_REF = '00000000-0000-0000-0000-000000000b00'; // referrer/partner of M_ACTIVE
const M_ACTIVE = '00000000-0000-0000-0000-000000000b01'; // ACTIVE, referred by M_REF
const M_ACTIVE2 = '00000000-0000-0000-0000-000000000b02'; // ACTIVE, isolated
const M_PENDING = '00000000-0000-0000-0000-000000000b03'; // status PENDING
const M_SUSPENDED = '00000000-0000-0000-0000-000000000b04'; // status SUSPENDED
const M_PARTNER = '00000000-0000-0000-0000-000000000b05'; // ACTIVE but already a partner

const R_PARTNER = '00000000-0000-0000-0000-000000000c01'; // the `partner` RBAC role row

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

// --- Configurable, transaction-aware RBAC port stubs ------------------------
// `assignWithin` performs the REAL user_roles INSERT through the passed tx, so
// it participates in — and rolls back with — the partner-request transaction.
let failAssign = false;
const assignCalls: string[] = [];
const finalizeCalls: string[] = [];

const roleAssigner: PartnerRoleAssignerPort = {
  resolvePartnerRoleId: () => Promise.resolve(R_PARTNER),
  assignWithin: async (tx: Executor, roleId, userId, actorId) => {
    if (failAssign) {
      throw new Error('role assignment failed');
    }
    assignCalls.push(userId);
    await tx.insert(userRoles).values({ userId, roleId, createdBy: actorId }).onConflictDoNothing();
  },
  finalize: (userId) => {
    finalizeCalls.push(userId);
    return Promise.resolve();
  },
};
const roleChecker: PartnerRoleCheckerPort = {
  isPartner: (userId) => hasPartnerRole(userId),
};

const events: PartnerRequestEvent[] = [];

let db: Database;

async function hasPartnerRole(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, R_PARTNER)))
    .limit(1);
  return rows[0] !== undefined;
}

async function seedUser(database: Database, id: string, email: string): Promise<void> {
  await database.insert(users).values({ id, email, status: 'ACTIVE' });
}

async function seedMember(
  database: Database,
  id: string,
  suffix: string,
  rel: {
    userId?: string;
    referredBy?: string;
    partnerId?: string;
    status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  } = {},
): Promise<void> {
  await database.insert(members).values({
    id,
    memberNumber: `M-PR${suffix}`,
    firstName: 'Req',
    lastName: suffix,
    email: `pr${suffix}@partner.test`,
    status: rel.status ?? 'ACTIVE',
    userId: rel.userId ?? null,
    referredBy: rel.referredBy ?? null,
    partnerId: rel.partnerId ?? null,
    createdBy: ADMIN,
    updatedBy: ADMIN,
  });
}

async function statusOf(id: string): Promise<string | null> {
  const [row] = await db
    .select({ status: partnerRequests.status })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, id));
  return row?.status ?? null;
}

async function auditCount(entityId: string, action?: 'CREATE' | 'UPDATE'): Promise<number> {
  const filters = [eq(auditLogs.entityId, entityId), eq(auditLogs.module, 'partner-requests')];
  if (action) {
    filters.push(eq(auditLogs.action, action));
  }
  const rows = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(and(...filters));
  return rows.length;
}

describe('P1.3 partner-request workflow (PGlite)', () => {
  let client: PGlite;
  let mod: PartnerRequestsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mod = createPartnerRequestsModule(db, { roleAssigner, roleChecker });
    mod.events.subscribe((e) => {
      events.push(e);
    });

    await Promise.all([
      seedUser(db, U_REF, 'ref@partner.test'),
      seedUser(db, U_ACTIVE, 'active@partner.test'),
      seedUser(db, U_ACTIVE2, 'active2@partner.test'),
      seedUser(db, U_PENDING, 'pending@partner.test'),
      seedUser(db, U_SUSPENDED, 'suspended@partner.test'),
      seedUser(db, U_PARTNER, 'partner@partner.test'),
      seedUser(db, U_ORPHAN, 'orphan@partner.test'),
    ]);
    await db.insert(roles).values({ id: R_PARTNER, key: 'partner', name: 'Partner' });
    await seedMember(db, M_REF, 'REF', { userId: U_REF });
    await seedMember(db, M_ACTIVE, 'ACT', {
      userId: U_ACTIVE,
      referredBy: M_REF,
      partnerId: M_REF,
    });
    await seedMember(db, M_ACTIVE2, 'AC2', { userId: U_ACTIVE2 });
    await seedMember(db, M_PENDING, 'PEN', { userId: U_PENDING, status: 'PENDING' });
    await seedMember(db, M_SUSPENDED, 'SUS', { userId: U_SUSPENDED, status: 'SUSPENDED' });
    await seedMember(db, M_PARTNER, 'PAR', { userId: U_PARTNER });
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    await db.delete(partnerRequests);
    await db.delete(auditLogs);
    await db.delete(userRoles);
    failAssign = false;
    assignCalls.length = 0;
    finalizeCalls.length = 0;
    events.length = 0;
    // M_PARTNER's user already holds the partner role.
    await db.insert(userRoles).values({ userId: U_PARTNER, roleId: R_PARTNER, createdBy: ADMIN });
  });

  // --- Submit ---------------------------------------------------------------

  it('1. an ACTIVE member submits a request → PENDING, member derived from the token', async () => {
    const result = await mod.service.submit(U_ACTIVE, { note: 'please' }, actorFor(U_ACTIVE));
    expect(result.memberId).toBe(M_ACTIVE);
    expect(result.status).toBe('PENDING');
    expect(result.note).toBe('please');
    expect(result.decidedBy).toBeNull();
  });

  it('2. submit is idempotent — a second submit returns the same PENDING (no duplicate row)', async () => {
    const first = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    const second = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    expect(second.id).toBe(first.id);
    const rows = await db
      .select({ id: partnerRequests.id })
      .from(partnerRequests)
      .where(eq(partnerRequests.memberId, M_ACTIVE));
    expect(rows).toHaveLength(1);
  });

  it('3. a non-ACTIVE (PENDING status) member cannot submit', async () => {
    await expect(mod.service.submit(U_PENDING, {}, actorFor(U_PENDING))).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it('4. a SUSPENDED member cannot submit', async () => {
    await expect(mod.service.submit(U_SUSPENDED, {}, actorFor(U_SUSPENDED))).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it('5. a member who is already a Partner cannot submit', async () => {
    await expect(mod.service.submit(U_PARTNER, {}, actorFor(U_PARTNER))).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it('6. a user with no member profile cannot submit', async () => {
    await expect(mod.service.submit(U_ORPHAN, {}, actorFor(U_ORPHAN))).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it('7. submit writes a CREATE audit log tagged to the partner-requests module', async () => {
    const result = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    expect(await auditCount(result.id, 'CREATE')).toBe(1);
  });

  it('8. submit publishes a PartnerRequestSubmitted event', async () => {
    const result = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'PartnerRequestSubmitted',
        requestId: result.id,
        memberId: M_ACTIVE,
      }),
    );
  });

  it('9. the partial unique index forbids two concurrent PENDING rows for one member', async () => {
    await db.insert(partnerRequests).values({ memberId: M_ACTIVE, status: 'PENDING' });
    await expect(
      db.insert(partnerRequests).values({ memberId: M_ACTIVE, status: 'PENDING' }),
    ).rejects.toThrow();
  });

  it('10. a REJECTED member may submit a fresh request (terminal rows are excluded from the index)', async () => {
    const first = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    await mod.service.reject(first.id, { reason: 'no' }, admin);
    const again = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    expect(again.id).not.toBe(first.id);
    expect(again.status).toBe('PENDING');
  });

  // --- getMine --------------------------------------------------------------

  it('11. getMine returns the latest request (any status) for the member', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    const mine = await mod.service.getMine(U_ACTIVE);
    expect(mine?.id).toBe(created.id);
  });

  it('12. getMine returns null when the member has no request', async () => {
    expect(await mod.service.getMine(U_ACTIVE2)).toBeNull();
  });

  it('13. getMine throws for a user with no member profile', async () => {
    await expect(mod.service.getMine(U_ORPHAN)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  // --- Admin reads ----------------------------------------------------------

  it('14. list returns paginated requests', async () => {
    await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    await mod.service.submit(U_ACTIVE2, {}, actorFor(U_ACTIVE2));
    const page = await mod.service.list({});
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(2);
  });

  it('15. list filters by status', async () => {
    const a = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    await mod.service.submit(U_ACTIVE2, {}, actorFor(U_ACTIVE2));
    await mod.service.reject(a.id, {}, admin);
    const rejected = await mod.service.list({ status: 'REJECTED' });
    expect(rejected.total).toBe(1);
    expect(rejected.items[0]?.status).toBe('REJECTED');
  });

  it('16. getById returns the request; unknown id throws NotFound', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    expect((await mod.service.getById(created.id)).id).toBe(created.id);
    await expect(
      mod.service.getById('00000000-0000-0000-0000-0000000000cc'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  // --- Approve --------------------------------------------------------------

  it('17. approve grants the partner role AND marks APPROVED with decidedBy/decidedAt', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    const approved = await mod.service.approve(created.id, admin);
    expect(approved.status).toBe('APPROVED');
    expect(approved.decidedBy).toBe(ADMIN);
    expect(approved.decidedAt).not.toBeNull();
    expect(assignCalls).toEqual([U_ACTIVE]);
    expect(await hasPartnerRole(U_ACTIVE)).toBe(true);
    expect(finalizeCalls).toEqual([U_ACTIVE]); // post-commit side effect ran
  });

  it('18. approve is idempotent — a second approve returns APPROVED without re-granting', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    await mod.service.approve(created.id, admin);
    const again = await mod.service.approve(created.id, admin);
    expect(again.status).toBe('APPROVED');
    // The grant + finalize ran only for the first, real approval.
    expect(assignCalls).toEqual([U_ACTIVE]);
    expect(finalizeCalls).toEqual([U_ACTIVE]);
    expect(await hasPartnerRole(U_ACTIVE)).toBe(true);
  });

  it('19. approve writes an UPDATE audit and publishes PartnerRequestApproved', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    events.length = 0;
    await mod.service.approve(created.id, admin);
    expect(await auditCount(created.id, 'UPDATE')).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'PartnerRequestApproved', requestId: created.id }),
    );
  });

  it('20. CRITICAL: role-assignment failure → request stays PENDING and NO partner role', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    failAssign = true;
    await expect(mod.service.approve(created.id, admin)).rejects.toThrow();
    expect(await statusOf(created.id)).toBe('PENDING');
    expect(await hasPartnerRole(U_ACTIVE)).toBe(false);
    expect(finalizeCalls).toEqual([]);
    expect(events.some((e) => e.type === 'PartnerRequestApproved')).toBe(false);
  });

  it('21. approving a REJECTED request throws ConflictError', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    await mod.service.reject(created.id, {}, admin);
    await expect(mod.service.approve(created.id, admin)).rejects.toBeInstanceOf(ConflictError);
  });

  it('22. approving when the member is no longer ACTIVE fails and grants no role', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    await db.update(members).set({ status: 'SUSPENDED' }).where(eq(members.id, M_ACTIVE));
    await expect(mod.service.approve(created.id, admin)).rejects.toBeInstanceOf(BusinessRuleError);
    expect(assignCalls).toEqual([]);
    expect(await hasPartnerRole(U_ACTIVE)).toBe(false);
    expect(await statusOf(created.id)).toBe('PENDING');
    // Restore for later tests.
    await db.update(members).set({ status: 'ACTIVE' }).where(eq(members.id, M_ACTIVE));
  });

  it('23. approving an unknown id throws NotFound', async () => {
    await expect(
      mod.service.approve('00000000-0000-0000-0000-0000000000cd', admin),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  // --- Reject ---------------------------------------------------------------

  it('24. reject marks REJECTED with actor/time/reason and grants no role', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    const rejected = await mod.service.reject(created.id, { reason: 'not yet' }, admin);
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.decidedBy).toBe(ADMIN);
    expect(rejected.decidedAt).not.toBeNull();
    expect(rejected.decisionReason).toBe('not yet');
    expect(assignCalls).toEqual([]);
    expect(await hasPartnerRole(U_ACTIVE)).toBe(false);
  });

  it('25. reject is idempotent — a second reject returns REJECTED', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    await mod.service.reject(created.id, {}, admin);
    const again = await mod.service.reject(created.id, {}, admin);
    expect(again.status).toBe('REJECTED');
  });

  it('26. rejecting an APPROVED request throws ConflictError', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    await mod.service.approve(created.id, admin);
    await expect(mod.service.reject(created.id, {}, admin)).rejects.toBeInstanceOf(ConflictError);
  });

  it('27. reject writes an UPDATE audit and publishes PartnerRequestRejected', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    events.length = 0;
    await mod.service.reject(created.id, { reason: 'x' }, admin);
    expect(await auditCount(created.id, 'UPDATE')).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'PartnerRequestRejected', requestId: created.id }),
    );
  });

  // --- Additive-only integrity ----------------------------------------------

  it('28. decisions never mutate the member’s referral attribution (referredBy/partnerId)', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    await mod.service.approve(created.id, admin);
    const [row] = await db
      .select({ referredBy: members.referredBy, partnerId: members.partnerId })
      .from(members)
      .where(eq(members.id, M_ACTIVE));
    expect(row).toEqual({ referredBy: M_REF, partnerId: M_REF });
  });

  // --- Atomicity: concurrency invariant -------------------------------------

  it('29. concurrent approve vs reject: exactly one terminal state; NEVER REJECTED+role', async () => {
    // Ordering A: approve issued first.
    const reqA = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));
    const outA = await Promise.allSettled([
      mod.service.approve(reqA.id, admin),
      mod.service.reject(reqA.id, { reason: 'race' }, admin),
    ]);
    const fulfilledA = outA.filter((r) => r.status === 'fulfilled');
    expect(fulfilledA).toHaveLength(1); // exactly one decision wins
    const statusA = await statusOf(reqA.id);
    expect(['APPROVED', 'REJECTED']).toContain(statusA); // terminal
    const roleA = await hasPartnerRole(U_ACTIVE);
    // THE INVARIANT: a rejected request can never coexist with a granted role.
    expect(statusA === 'REJECTED' && roleA).toBe(false);
    // And the positive invariant: APPROVED iff role granted.
    expect(statusA === 'APPROVED').toBe(roleA);

    // Ordering B (fresh member/request): reject issued first.
    await db.delete(userRoles).where(eq(userRoles.userId, U_ACTIVE2));
    const reqB = await mod.service.submit(U_ACTIVE2, {}, actorFor(U_ACTIVE2));
    const outB = await Promise.allSettled([
      mod.service.reject(reqB.id, { reason: 'race' }, admin),
      mod.service.approve(reqB.id, admin),
    ]);
    expect(outB.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const statusB = await statusOf(reqB.id);
    const roleB = await hasPartnerRole(U_ACTIVE2);
    expect(statusB === 'REJECTED' && roleB).toBe(false);
    expect(statusB === 'APPROVED').toBe(roleB);
  });

  // --- Atomicity: rollback (failure AFTER the in-tx role INSERT) -------------

  it('30. audit failure after the role INSERT rolls back everything (PENDING, no role, no audit)', async () => {
    const created = await mod.service.submit(U_ACTIVE, {}, actorFor(U_ACTIVE));

    // Build a service whose audit repository throws on the decision write, so the
    // failure occurs AFTER assignWithin has inserted the user_roles row in the tx.
    const failingAudit = {
      write: (entry: { action: string }, _executor: Executor): Promise<void> =>
        entry.action === 'UPDATE' ? Promise.reject(new Error('audit failure')) : Promise.resolve(),
    } as unknown as PartnerRequestAuditRepository;

    const failingService = new PartnerRequestService(
      db,
      new PartnerRequestRepository(db),
      new PartnerMemberLookupRepository(db),
      failingAudit,
      new PartnerRequestEventBus(),
      roleAssigner,
      roleChecker,
    );

    await expect(failingService.approve(created.id, admin)).rejects.toThrow('audit failure');

    expect(await statusOf(created.id)).toBe('PENDING'); // status rolled back
    expect(await hasPartnerRole(U_ACTIVE)).toBe(false); // role INSERT rolled back
    expect(await auditCount(created.id, 'UPDATE')).toBe(0); // no partial audit
    expect(finalizeCalls).toEqual([]); // post-commit side effects never ran
  });
});
