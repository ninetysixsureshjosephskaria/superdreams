import { eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { members, roles, userRoles, users } from '@/database/schema';
import { hashPassword } from '@/modules/identity/services';
import { createMembersModule } from '@/modules/members';
import type { MemberStatus } from '@/modules/members/dto';
import { syncRbacCatalog } from '@/modules/rbac/seed';
import { createWalletModule } from '@/modules/wallet';

import { registerSeed } from './index';

/**
 * Development-only sample data so both frontends have something to show. Creates
 * two login users (a super-admin for the BCC and a portal member), a spread of
 * members, and wallets with real, ledger-consistent transaction history.
 *
 * Idempotent: skips entirely if the demo admin already exists. Never registered
 * for staging/production.
 */

export const DEMO_PASSWORD = 'SuperDreams!123';
export const DEMO_ADMIN_EMAIL = 'admin@demo.superdreams.local';
export const DEMO_PORTAL_EMAIL = 'sam@demo.superdreams.local';

const USD = 'USD';

async function seedDemo(db: Database): Promise<void> {
  const already = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEMO_ADMIN_EMAIL))
    .limit(1);
  if (already[0]) {
    return;
  }

  // Ensure the RBAC catalog (permissions + super-admin role) exists first.
  await syncRbacCatalog(db);

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const [admin] = await db
    .insert(users)
    .values({
      email: DEMO_ADMIN_EMAIL,
      passwordHash,
      firstName: 'Ada',
      lastName: 'Admin',
      displayName: 'Ada Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id });

  const [portal] = await db
    .insert(users)
    .values({
      email: DEMO_PORTAL_EMAIL,
      passwordHash,
      firstName: 'Sam',
      lastName: 'Member',
      displayName: 'Sam Member',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id });

  if (!admin || !portal) {
    throw new Error('Demo seed failed to create users.');
  }

  const [superAdminRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.key, 'super-admin'))
    .limit(1);
  if (superAdminRole) {
    await db
      .insert(userRoles)
      .values({ userId: admin.id, roleId: superAdminRole.id, createdBy: admin.id })
      .onConflictDoNothing();
  }

  const actor = {
    userId: admin.id,
    ipAddress: '127.0.0.1',
    userAgent: 'demo-seed',
    correlationId: null,
  };

  const membersModule = createMembersModule(db);
  const walletModule = createWalletModule(db);

  /** Creates a member and drives it to the requested status. */
  async function makeMember(
    firstName: string,
    lastName: string,
    email: string,
    status: MemberStatus,
  ): Promise<string> {
    const member = await membersModule.service.create(
      {
        firstName,
        lastName,
        email,
        profile: { bio: `${firstName} ${lastName} — demo member.` },
      },
      actor,
    );
    if (status !== 'PENDING') {
      await membersModule.service.changeStatus(member.id, { status: 'ACTIVE' }, actor);
    }
    if (status === 'SUSPENDED') {
      await membersModule.service.changeStatus(
        member.id,
        { status: 'SUSPENDED', reason: 'Demo suspension' },
        actor,
      );
    }
    return member.id;
  }

  async function makeActiveWallet(memberId: string): Promise<string> {
    const wallet = await walletModule.service.create({ memberId, currencyCode: USD }, actor);
    await walletModule.service.changeStatus(wallet.id, { status: 'ACTIVE' }, actor);
    return wallet.id;
  }

  // --- Regular members with varied wallets ---------------------------------

  const ada = await makeMember('Ada', 'Lovelace', 'ada@demo.superdreams.local', 'ACTIVE');
  const adaWallet = await makeActiveWallet(ada);
  await walletModule.service.credit(
    adaWallet,
    { amountMinor: 50_000, description: 'Initial load' },
    actor,
  );
  await walletModule.service.debit(
    adaWallet,
    { amountMinor: 12_050, description: 'Marketplace purchase' },
    actor,
  );
  await walletModule.service.placeHold(
    adaWallet,
    { amountMinor: 4_000, reason: 'Pending order' },
    actor,
  );

  const grace = await makeMember('Grace', 'Hopper', 'grace@demo.superdreams.local', 'ACTIVE');
  const graceWallet = await makeActiveWallet(grace);
  await walletModule.service.credit(
    graceWallet,
    { amountMinor: 100_000, description: 'Payroll' },
    actor,
  );
  await walletModule.service.adjust(
    graceWallet,
    { direction: 'CREDIT', amountMinor: 2_500, reason: 'Goodwill credit' },
    actor,
  );
  await walletModule.service.generateStatement(graceWallet, {}, actor);

  const katherine = await makeMember(
    'Katherine',
    'Johnson',
    'katherine@demo.superdreams.local',
    'ACTIVE',
  );
  const katherineWallet = await makeActiveWallet(katherine);
  await walletModule.service.credit(
    katherineWallet,
    { amountMinor: 25_000, description: 'Refund' },
    actor,
  );
  await walletModule.service.debit(
    katherineWallet,
    { amountMinor: 25_000, description: 'Withdrawal to zero' },
    actor,
  );

  // A member whose wallet is later suspended.
  const alan = await makeMember('Alan', 'Turing', 'alan@demo.superdreams.local', 'ACTIVE');
  const alanWallet = await makeActiveWallet(alan);
  await walletModule.service.credit(
    alanWallet,
    { amountMinor: 30_000, description: 'Initial load' },
    actor,
  );
  await walletModule.service.changeStatus(
    alanWallet,
    { status: 'SUSPENDED', reason: 'Demo review' },
    actor,
  );

  // A pending member with a pending wallet (no transactions).
  const edsger = await makeMember('Edsger', 'Dijkstra', 'edsger@demo.superdreams.local', 'PENDING');
  await walletModule.service.create({ memberId: edsger, currencyCode: 'EUR' }, actor);

  // A member with no wallet at all.
  await makeMember('Barbara', 'Liskov', 'barbara@demo.superdreams.local', 'ACTIVE');

  // --- Portal member (linked to the portal login user) ---------------------

  const [portalMember] = await db
    .insert(members)
    .values({
      memberNumber: 'M-PORTAL01',
      firstName: 'Sam',
      lastName: 'Member',
      email: 'sam.member@demo.superdreams.local',
      userId: portal.id,
      status: 'ACTIVE',
      createdBy: admin.id,
      updatedBy: admin.id,
    })
    .returning({ id: members.id });
  if (!portalMember) {
    throw new Error('Demo seed failed to create the portal member.');
  }

  const portalWallet = await makeActiveWallet(portalMember.id);
  await walletModule.service.credit(
    portalWallet,
    { amountMinor: 75_000, description: 'Welcome bonus' },
    actor,
  );
  await walletModule.service.credit(
    portalWallet,
    { amountMinor: 20_000, description: 'Cashback reward' },
    actor,
  );
  await walletModule.service.debit(
    portalWallet,
    { amountMinor: 9_025, description: 'Coffee subscription' },
    actor,
  );
  await walletModule.service.placeHold(
    portalWallet,
    { amountMinor: 10_000, reason: 'Pending authorization' },
    actor,
  );
  await walletModule.service.generateStatement(portalWallet, {}, actor);
}

registerSeed({
  name: 'demo-data',
  environments: ['development'],
  run: seedDemo,
});
