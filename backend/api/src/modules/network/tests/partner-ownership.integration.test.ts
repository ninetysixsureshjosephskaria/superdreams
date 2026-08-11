import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { members, users } from '@/database/schema';
import { NotFoundError } from '@/errors';

import { createNetworkModule, type NetworkModule } from '../index';
import type { RoleAssignerPort, UnitsProviderPort } from '../services';

/**
 * P1.2 — Partner ownership authorization (server-side).
 *
 * Proves the ownership guarantee already provided by the token-scoped
 * `/network/me*` flow: every network read resolves the member from the
 * authenticated user (`memberIdForUser`) and is confined to that member's own
 * referral hierarchy. There is NO client-supplied member id on these reads, so
 * a Partner can only ever see their own network — IDOR is structurally
 * impossible. This test locks that behaviour in as regression protection; it
 * changes no production code.
 */

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000f1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};

// Users (auth accounts).
const U_P = '00000000-0000-0000-0000-0000000000f1'; // partner P's user
const U_Q = '00000000-0000-0000-0000-0000000000f2'; // partner Q's user
const U_D = '00000000-0000-0000-0000-0000000000f3'; // unrelated member D's user
const U_ORPHAN = '00000000-0000-0000-0000-0000000000f4'; // user with no linked member

// Members. Two isolated hierarchies plus an unrelated member.
const P = '00000000-0000-0000-0000-000000000f10'; // partner P (root)
const A = '00000000-0000-0000-0000-000000000f11'; // referred by P
const B = '00000000-0000-0000-0000-000000000f12'; // referred by A (P's grandchild)
const E = '00000000-0000-0000-0000-000000000f13'; // referred by P, then soft-deleted
const Q = '00000000-0000-0000-0000-000000000f20'; // partner Q (root of a separate tree)
const C = '00000000-0000-0000-0000-000000000f21'; // referred by Q
const D = '00000000-0000-0000-0000-000000000f30'; // unrelated member, no relationships

const roleAssigner: RoleAssignerPort = { assignRoleByKey: () => Promise.resolve() };
const units: UnitsProviderPort = { getUnits: () => Promise.resolve(0) };

async function seedUser(db: Database, id: string, email: string): Promise<void> {
  await db.insert(users).values({ id, email, status: 'ACTIVE' });
}

async function seedMember(
  db: Database,
  id: string,
  suffix: string,
  rel: {
    userId?: string;
    referredBy?: string;
    partnerId?: string;
    status?: 'ACTIVE' | 'SUSPENDED';
    deleted?: boolean;
  } = {},
): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-OWN${suffix}`,
    firstName: 'Own',
    lastName: suffix,
    email: `own${suffix}@ownership.test`,
    status: rel.status ?? 'ACTIVE',
    userId: rel.userId ?? null,
    referredBy: rel.referredBy ?? null,
    partnerId: rel.partnerId ?? null,
    deletedAt: rel.deleted ? new Date() : null,
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

const ids = (nodes: { memberId: string }[]): string[] => nodes.map((n) => n.memberId).sort();

describe('P1.2 partner ownership isolation (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: NetworkModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mod = createNetworkModule(db, { units, roleAssigner });

    await Promise.all([
      seedUser(db, U_P, 'p@ownership.test'),
      seedUser(db, U_Q, 'q@ownership.test'),
      seedUser(db, U_D, 'd@ownership.test'),
      seedUser(db, U_ORPHAN, 'orphan@ownership.test'),
    ]);
    // Hierarchy 1: P -> A -> B, plus E (referred by P) which is soft-deleted.
    await seedMember(db, P, 'P', { userId: U_P });
    await seedMember(db, A, 'A', { referredBy: P, partnerId: P });
    await seedMember(db, B, 'B', { referredBy: A, partnerId: A });
    await seedMember(db, E, 'E', { referredBy: P, partnerId: P, deleted: true });
    // Hierarchy 2 (isolated): Q -> C.
    await seedMember(db, Q, 'Q', { userId: U_Q });
    await seedMember(db, C, 'C', { referredBy: Q, partnerId: Q });
    // Unrelated member with no relationships.
    await seedMember(db, D, 'D', { userId: U_D });
  });

  afterAll(async () => {
    await client.close();
  });

  it('resolves the caller to their OWN member id from the token (no client-supplied id)', async () => {
    expect(await mod.network.memberIdForUser(U_P)).toBe(P);
    expect(await mod.network.memberIdForUser(U_Q)).toBe(Q);
    expect(await mod.network.memberIdForUser(U_D)).toBe(D);
  });

  it('Req1/3: Partner P reads their OWN downline (A and B), scoped to their hierarchy', async () => {
    const self = await mod.network.memberIdForUser(U_P);
    const downline = await mod.network.getDownline(self);
    expect(ids(downline)).toEqual([A, B].sort());
  });

  it('Req2: Partner P reads their OWN direct referrals (A only)', async () => {
    const self = await mod.network.memberIdForUser(U_P);
    const direct = await mod.network.getDirectReferrals(self);
    expect(ids(direct)).toEqual([A]);
  });

  it('Req4: Partner A cannot see Partner B(Q) network — hierarchies are isolated', async () => {
    const pSelf = await mod.network.memberIdForUser(U_P);
    const qSelf = await mod.network.memberIdForUser(U_Q);

    const pDownline = ids(await mod.network.getDownline(pSelf));
    const qDownline = ids(await mod.network.getDownline(qSelf));

    expect(pDownline).not.toContain(Q);
    expect(pDownline).not.toContain(C);
    expect(qDownline).toEqual([C]);
    expect(qDownline).not.toContain(P);
    expect(qDownline).not.toContain(A);
    expect(qDownline).not.toContain(B);
  });

  it('Req5: unrelated Member D leaks into no partner network, and sees an empty own downline', async () => {
    const pDownline = ids(await mod.network.getDownline(P));
    const qDownline = ids(await mod.network.getDownline(Q));
    expect(pDownline).not.toContain(D);
    expect(qDownline).not.toContain(D);

    const dSelf = await mod.network.memberIdForUser(U_D);
    expect(await mod.network.getDownline(dSelf)).toEqual([]);
    expect(await mod.network.getDirectReferrals(dSelf)).toEqual([]);
  });

  it('Req9: soft-deleted member E does NOT leak into P’s downline or direct referrals', async () => {
    const self = await mod.network.memberIdForUser(U_P);
    expect(ids(await mod.network.getDownline(self))).not.toContain(E);
    expect(ids(await mod.network.getDirectReferrals(self))).not.toContain(E);
  });

  it('Req12: a user with no linked member cannot resolve to anyone (NotFound, no fallback)', async () => {
    await expect(mod.network.memberIdForUser(U_ORPHAN)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('Req10: reads are pure — referral relationships/attribution are unchanged afterwards', async () => {
    await mod.network.getDownline(P);
    await mod.network.getReferralSummary(P);
    await mod.network.getDirectReferrals(P);

    const [rowA] = await db
      .select({ referredBy: members.referredBy, partnerId: members.partnerId })
      .from(members)
      .where(eq(members.id, A));
    const [rowB] = await db
      .select({ referredBy: members.referredBy, partnerId: members.partnerId })
      .from(members)
      .where(eq(members.id, B));
    expect(rowA).toEqual({ referredBy: P, partnerId: P });
    expect(rowB).toEqual({ referredBy: A, partnerId: A });
  });
});
