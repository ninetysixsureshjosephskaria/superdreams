import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, invites as invitesTable, members, users } from '@/database/schema';

import type { NetworkEvent } from '../events';
import { createNetworkModule, type NetworkModule } from '../index';
import type { RoleAssignerPort, UnitsProviderPort } from '../services';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000d1',
  ipAddress: null,
  userAgent: null,
  correlationId: null,
};

// Users
const U_ADMIN = '00000000-0000-0000-0000-0000000000d1';
const U_INVITEE = '00000000-0000-0000-0000-0000000000d2';
const U_INVITEE2 = '00000000-0000-0000-0000-0000000000d3';
// Members
const P = '00000000-0000-0000-0000-000000000d10'; // partner
const A = '00000000-0000-0000-0000-000000000d11'; // referred by P
const B = '00000000-0000-0000-0000-000000000d12'; // referred by A
const INVITEE = '00000000-0000-0000-0000-000000000d13'; // links to U_INVITEE
const INVITEE2 = '00000000-0000-0000-0000-000000000d14'; // links to U_INVITEE2

const assignedRoles: Array<{ userId: string; roleKey: string }> = [];
const roleAssigner: RoleAssignerPort = {
  assignRoleByKey: (userId, roleKey) => {
    assignedRoles.push({ userId, roleKey });
    return Promise.resolve();
  },
};
const units: UnitsProviderPort = { getUnits: () => Promise.resolve(7) };

async function seedUser(db: Database, id: string, email: string): Promise<void> {
  await db.insert(users).values({ id, email, status: 'ACTIVE' });
}
async function seedMember(
  db: Database,
  id: string,
  suffix: string,
  rel: { userId?: string; referredBy?: string; partnerId?: string } = {},
): Promise<void> {
  await db.insert(members).values({
    id,
    memberNumber: `M-NET${suffix}`,
    firstName: 'Net',
    lastName: suffix,
    email: `net${suffix}@network.test`,
    status: 'ACTIVE',
    userId: rel.userId ?? null,
    referredBy: rel.referredBy ?? null,
    partnerId: rel.partnerId ?? null,
    createdBy: ACTOR.userId,
    updatedBy: ACTOR.userId,
  });
}

/** Phase 2D — network relationships, referrals and the secure invite lifecycle. */
describe('phase 2d network / referrals / invites (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let mod: NetworkModule;
  const events: NetworkEvent[] = [];

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mod = createNetworkModule(db, { units, roleAssigner });
    mod.events.subscribe((e) => {
      events.push(e);
    });

    await Promise.all([
      seedUser(db, U_ADMIN, 'admin@network.test'),
      seedUser(db, U_INVITEE, 'invitee@network.test'),
      seedUser(db, U_INVITEE2, 'invitee2@network.test'),
    ]);
    // Tree: P → A → B (seeded relationships).
    await seedMember(db, P, '01');
    await seedMember(db, A, '02', { referredBy: P, partnerId: P });
    await seedMember(db, B, '03', { referredBy: A, partnerId: P });
    await seedMember(db, INVITEE, '04', { userId: U_INVITEE });
    await seedMember(db, INVITEE2, '05', { userId: U_INVITEE2 });
  });

  afterAll(async () => {
    await client.close();
  });

  it('issues an invite associated with the correct inviter (secure, unpredictable code)', async () => {
    const invite = await mod.invites.create({ role: 'MEMBER', assignedPartnerId: P }, ACTOR);
    expect(invite.status).toBe('PENDING');
    expect(invite.role).toBe('MEMBER');
    expect(invite.assignedPartnerId).toBe(P);
    expect(invite.invitedByUserId).toBe(U_ADMIN);
    expect(invite.code.length).toBeGreaterThan(20);

    const second = await mod.invites.create({ role: 'MEMBER', assignedPartnerId: P }, ACTOR);
    expect(second.code).not.toBe(invite.code); // unpredictable / unique
  });

  it('accepts an invite: creates the relationship, provisions the role, and cannot be reused', async () => {
    const invite = await mod.invites.create({ role: 'MEMBER', assignedPartnerId: P }, ACTOR);
    const accepted = await mod.invites.accept(invite.code, U_INVITEE, ACTOR);
    expect(accepted.status).toBe('USED');
    expect(accepted.usedByMemberId).toBe(INVITEE);

    // Correct member/partner relationship created.
    const [row] = await db.select().from(members).where(eq(members.id, INVITEE));
    expect(row?.referredBy).toBe(P);
    expect(row?.partnerId).toBe(P);
    // MEMBER role provisioned.
    expect(assignedRoles.some((r) => r.userId === U_INVITEE && r.roleKey === 'member')).toBe(true);

    // Cannot be reused.
    await expect(mod.invites.accept(invite.code, U_INVITEE, ACTOR)).rejects.toThrow(
      /no longer available/i,
    );
  });

  it('provisions the PARTNER role on a partner invite without setting an upline', async () => {
    const invite = await mod.invites.create({ role: 'PARTNER' }, ACTOR);
    await mod.invites.accept(invite.code, U_INVITEE2, ACTOR);
    expect(assignedRoles.some((r) => r.userId === U_INVITEE2 && r.roleKey === 'partner')).toBe(
      true,
    );
    const [row] = await db.select().from(members).where(eq(members.id, INVITEE2));
    expect(row?.referredBy).toBeNull();
    expect(row?.partnerId).toBeNull();
  });

  it('rejects an unknown or expired invite', async () => {
    await expect(mod.invites.accept('does-not-exist', U_INVITEE, ACTOR)).rejects.toThrow(
      /not found/i,
    );
    const invite = await mod.invites.create({ role: 'MEMBER', assignedPartnerId: P }, ACTOR);
    // Force expiry into the past.
    await db
      .update(invitesTable)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitesTable.code, invite.code));
    await expect(mod.invites.accept(invite.code, U_INVITEE, ACTOR)).rejects.toThrow(/expired/i);
  });

  it('revokes a pending invite and prevents its acceptance', async () => {
    const invite = await mod.invites.create({ role: 'MEMBER', assignedPartnerId: P }, ACTOR);
    const revoked = await mod.invites.revoke(invite.code, ACTOR);
    expect(revoked.status).toBe('REVOKED');
    await expect(mod.invites.accept(invite.code, U_INVITEE, ACTOR)).rejects.toThrow(
      /no longer available/i,
    );
  });

  it('retrieves a member referral summary and correct direct referrals', async () => {
    const summary = await mod.network.getReferralSummary(P);
    expect(summary.referredBy).toBeNull();
    // Direct referrals of P: A (seeded) + INVITEE (accepted).
    expect(summary.directReferralCount).toBe(2);
    // Total downline of P: A, B, INVITEE.
    expect(summary.totalDownlineCount).toBe(3);

    const direct = await mod.network.getDirectReferrals(P);
    const directIds = direct.map((d) => d.memberId).sort();
    expect(directIds).toEqual([A, INVITEE].sort());
  });

  it('computes downline correctly and scopes each member to their own subtree', async () => {
    const pDownline = await mod.network.getDownline(P);
    expect(pDownline.map((n) => n.memberId).sort()).toEqual([A, B, INVITEE].sort());
    expect(pDownline.find((n) => n.memberId === B)?.depth).toBe(2);

    // A member only ever sees their own subtree — A sees B, B sees no one, and
    // neither can see P (their upline). This is the self-service authorization model.
    const aDownline = await mod.network.getDownline(A);
    expect(aDownline.map((n) => n.memberId)).toEqual([B]);
    expect(await mod.network.getDownline(B)).toHaveLength(0);
  });

  it('resolves the caller member only from their own account (no cross-user access)', async () => {
    expect(await mod.network.memberIdForUser(U_INVITEE)).toBe(INVITEE);
    await expect(
      mod.network.memberIdForUser('00000000-0000-0000-0000-0000000000ff'),
    ).rejects.toThrow(/no member is linked/i);
  });

  it('exposes admin network visibility (partner tree + member detail with units)', async () => {
    const partners = await mod.network.listPartnerSummaries();
    const partnerCard = partners.find((p) => p.partnerMemberId === P);
    expect(partnerCard).toBeDefined();
    expect(partnerCard?.directMemberCount).toBe(3); // A, B, INVITEE all have partner_id = P
    expect(partnerCard?.totalNetworkCount).toBe(3);

    const detail = await mod.network.getMemberDetail(A);
    expect(detail.referredBy).toBe(P);
    expect(detail.units).toBe(7); // from the stub units provider
  });

  it('writes audit entries and emits lifecycle events for state changes', async () => {
    const inviteAudits = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'invite'));
    expect(inviteAudits.some((a) => a.action === 'CREATE')).toBe(true);
    expect(inviteAudits.some((a) => a.action === 'UPDATE')).toBe(true); // used / revoked

    const memberAudits = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'member'));
    expect(memberAudits.length).toBeGreaterThan(0); // relationship linked on acceptance

    expect(events.some((e) => e.type === 'InviteCreated')).toBe(true);
    expect(events.some((e) => e.type === 'InviteAccepted')).toBe(true);
    expect(events.some((e) => e.type === 'ReferralLinked')).toBe(true);
  });
});
