import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { invites as invitesTable, members, users } from '@/database/schema';
import { EmailService, MockEmailProvider } from '@/email';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';
import { createAuthModule } from '@/modules/auth';
import { AuthEventBus } from '@/modules/auth/events';
import { createIdentityModule } from '@/modules/identity';
import { createMembersModule } from '@/modules/members';

import { createNetworkModule, type NetworkModule } from '../index';
import type { RoleAssignerPort, UnitsProviderPort } from '../services';

/**
 * M1a — invitation-based onboarding WITHOUT email delivery (service integration,
 * PGlite). The secure invite is the activation credential: a NEW invited user is
 * created, activated (via the real register → verifyEmail flow, token consumed
 * server-side, never emailed), and linked (role + referral) in one flow. Public
 * self-registration remains email-verified and is asserted unchanged.
 */

const U_ADMIN = '00000000-0000-0000-0000-0000000000f1';
const P_MEMBER = '00000000-0000-0000-0000-000000000f10'; // partner target for MEMBER invites
const PW = 'SuperDreams!123';
const adminActor = { userId: U_ADMIN, ipAddress: null, userAgent: null, correlationId: null };
const ctx = { ipAddress: null, userAgent: null, correlationId: null };

let db: Database;
let mod: NetworkModule;
let assignedRoles: Array<{ userId: string; roleKey: string }>;

async function userByEmail(
  email: string,
): Promise<{ id: string; status: string; verifiedAt: Date | null } | null> {
  const [row] = await db
    .select({ id: users.id, status: users.status, verifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.email, email));
  return row ?? null;
}
async function memberByUser(userId: string): Promise<{
  id: string;
  status: string;
  partnerId: string | null;
  referredBy: string | null;
} | null> {
  const [row] = await db
    .select({
      id: members.id,
      status: members.status,
      partnerId: members.partnerId,
      referredBy: members.referredBy,
    })
    .from(members)
    .where(eq(members.userId, userId));
  return row ?? null;
}
async function inviteStatus(code: string): Promise<string | null> {
  const [row] = await db
    .select({ status: invitesTable.status })
    .from(invitesTable)
    .where(eq(invitesTable.code, code));
  return row?.status ?? null;
}

describe('M1a invitation-based onboarding without email (PGlite)', () => {
  let client: PGlite;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;

    const auth = createAuthModule(
      db,
      createIdentityModule(db),
      new AuthEventBus(),
      new EmailService(new MockEmailProvider(), 'http://localhost:5173'),
    );
    const membersModule = createMembersModule(db);
    const memberProvisioner = {
      ensureForUser: (input: {
        userId: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        referralCode?: string | undefined;
      }) => membersModule.service.provisionForUser(input),
      activateForUser: (userId: string) => membersModule.service.activateByUserId(userId),
    };
    // Registration's own member-role assignment is stubbed (RBAC not under test here).
    auth.registration.setCollaborators({
      roleAssigner: { assignRoleByKey: () => Promise.resolve() },
      memberProvisioner,
    });
    auth.emailVerification.setMemberProvisioner(memberProvisioner);

    // The M1a provisioner: exactly the app-root adapter (register → verifyEmail).
    const provisioner = {
      provisionVerifiedAccount: async (input: unknown): Promise<{ userId: string }> => {
        const reg = await auth.registration.register(input);
        await auth.emailVerification.verifyEmail(reg.verificationToken);
        return { userId: reg.userId };
      },
    };

    assignedRoles = [];
    const roleAssigner: RoleAssignerPort = {
      assignRoleByKey: (userId, roleKey) => {
        assignedRoles.push({ userId, roleKey });
        return Promise.resolve();
      },
    };
    const units: UnitsProviderPort = { getUnits: () => Promise.resolve(0) };

    mod = createNetworkModule(db, { units, roleAssigner, provisioner });

    await db.insert(users).values({ id: U_ADMIN, email: 'admin@invite.test', status: 'ACTIVE' });
    await db.insert(members).values({
      id: P_MEMBER,
      memberNumber: 'M-PARTNER',
      firstName: 'Pat',
      lastName: 'Partner',
      email: 'partner@invite.test',
      status: 'ACTIVE',
      createdBy: U_ADMIN,
      updatedBy: U_ADMIN,
    });
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(() => {
    assignedRoles.length = 0;
  });

  it('1. PARTNER invite → new account is created, ACTIVE, verified, partner role, invite USED', async () => {
    const invite = await mod.invites.create({ role: 'PARTNER' }, adminActor);
    const email = 'p1.partner@invite.test';

    const result = await mod.invites.registerWithInvite(
      invite.code,
      { email, password: PW, firstName: 'New', lastName: 'Partner' },
      ctx,
    );

    expect(result.status).toBe('USED');
    const user = await userByEmail(email);
    expect(user?.status).toBe('ACTIVE');
    expect(user?.verifiedAt).not.toBeNull(); // activated WITHOUT an email round-trip
    const member = await memberByUser(user!.id);
    expect(member?.status).toBe('ACTIVE');
    expect(assignedRoles).toContainEqual({ userId: user!.id, roleKey: 'partner' });
    expect(await inviteStatus(invite.code)).toBe('USED');
  });

  it('2. MEMBER invite with assignedPartnerId → establishes the direct Partner relationship', async () => {
    const invite = await mod.invites.create(
      { role: 'MEMBER', assignedPartnerId: P_MEMBER },
      adminActor,
    );
    const email = 'p1.member@invite.test';

    await mod.invites.registerWithInvite(
      invite.code,
      { email, password: PW, firstName: 'New', lastName: 'Member' },
      ctx,
    );

    const user = await userByEmail(email);
    const member = await memberByUser(user!.id);
    expect(member?.partnerId).toBe(P_MEMBER);
    expect(member?.referredBy).toBe(P_MEMBER);
    expect(assignedRoles).toContainEqual({ userId: user!.id, roleKey: 'member' });
    expect(await inviteStatus(invite.code)).toBe('USED');
  });

  it('3. an unknown invite code creates no account', async () => {
    const email = 'ghost@invite.test';
    await expect(
      mod.invites.registerWithInvite(
        'this-code-does-not-exist',
        { email, password: PW, firstName: 'No', lastName: 'One' },
        ctx,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await userByEmail(email)).toBeNull();
  });

  it('4. an expired invite creates no account', async () => {
    await db.insert(invitesTable).values({
      code: 'EXPIRED-CODE',
      role: 'PARTNER',
      status: 'PENDING',
      invitedByUserId: U_ADMIN,
      expiresAt: new Date(Date.now() - 60_000),
      createdBy: U_ADMIN,
      updatedBy: U_ADMIN,
    });
    const email = 'expired@invite.test';
    await expect(
      mod.invites.registerWithInvite(
        'EXPIRED-CODE',
        { email, password: PW, firstName: 'Ex', lastName: 'Pired' },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(await userByEmail(email)).toBeNull();
  });

  it('5. a used invite cannot be reused and creates no second account', async () => {
    const invite = await mod.invites.create({ role: 'PARTNER' }, adminActor);
    await mod.invites.registerWithInvite(
      invite.code,
      { email: 'first.use@invite.test', password: PW, firstName: 'First', lastName: 'Use' },
      ctx,
    );
    const secondEmail = 'second.use@invite.test';
    await expect(
      mod.invites.registerWithInvite(
        invite.code,
        { email: secondEmail, password: PW, firstName: 'Second', lastName: 'Use' },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await userByEmail(secondEmail)).toBeNull();
  });

  it('6. public self-registration is unchanged — still PENDING/unverified until email verification', async () => {
    const membersModule = createMembersModule(db);
    const auth = createAuthModule(
      db,
      createIdentityModule(db),
      new AuthEventBus(),
      new EmailService(new MockEmailProvider(), 'http://localhost:5173'),
    );
    auth.registration.setCollaborators({
      roleAssigner: { assignRoleByKey: () => Promise.resolve() },
      memberProvisioner: {
        ensureForUser: (i) => membersModule.service.provisionForUser(i),
        activateForUser: (u) => membersModule.service.activateByUserId(u),
      },
    });
    const email = 'public.signup@invite.test';
    const reg = await auth.registration.register({
      email,
      password: PW,
      firstName: 'Public',
      lastName: 'Signup',
    });
    expect(reg.verificationToken).toBeTruthy();
    const user = await userByEmail(email);
    expect(user?.status).toBe('PENDING'); // NOT auto-activated
    expect(user?.verifiedAt).toBeNull(); // still requires email verification
  });
});
