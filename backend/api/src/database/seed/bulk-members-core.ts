/**
 * Bulk member generator — reusable, side-effect-free core.
 *
 * Creates fully-populated member accounts: a login user, a member profile
 * (linked to the user), an ACTIVE wallet with a small transaction history, and
 * an allocated reward-points balance. Idempotent per email — existing accounts
 * are skipped. Importing this module runs nothing; call {@link seedBulkMembers}.
 *
 * Consumed by the `bulk-members` CLI and the `seed-members` production startup
 * task.
 */
import { eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { members, roles, users } from '@/database/schema';
import { hashPassword } from '@/modules/identity/services';
import { createMembersModule } from '@/modules/members';
import { syncRbacCatalog } from '@/modules/rbac/seed';
import { createRewardsModule } from '@/modules/rewards';
import { createWalletModule } from '@/modules/wallet';

export const SHARED_PASSWORD = 'Member123!';
/** Sentinel account — if absent, the initial member set has not been created yet. */
export const MEMBER_SENTINEL_EMAIL = 'member01@superdreams.com';
const USD = 'USD';

const FIRST_NAMES = [
  'Olivia',
  'Liam',
  'Emma',
  'Noah',
  'Ava',
  'Ethan',
  'Sophia',
  'Mason',
  'Isabella',
  'Lucas',
  'Mia',
  'Leo',
  'Amelia',
  'Kai',
  'Zoe',
  'Aria',
  'Nina',
  'Theo',
  'Maya',
  'Ivan',
];
const LAST_NAMES = [
  'Bennett',
  'Carter',
  'Dawson',
  'Ellis',
  'Fenwick',
  'Grant',
  'Hayes',
  'Ingram',
  'Jensen',
  'Kapoor',
  'Lambert',
  'Morrow',
  'Novak',
  'Osei',
  'Patel',
  'Quinn',
  'Reyes',
  'Sato',
  'Turner',
  'Vega',
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export interface Credential {
  n: number;
  name: string;
  email: string;
  password: string;
  walletMinor: number;
  rewardPoints: number;
  status: string;
}

async function resolveActorUserId(db: Database): Promise<string> {
  const superRole = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.key, 'super-admin'))
    .limit(1);
  // Any existing user works as the audit actor; prefer an admin if present.
  const admin = await db.select({ id: users.id }).from(users).limit(1);
  if (admin[0]) return admin[0].id;
  if (!superRole[0]) throw new Error('RBAC catalog missing.');
  throw new Error('No users exist to act as the seed actor — run the base seed first.');
}

/**
 * Creates `count` fully-populated member accounts (member01…memberNN) with login
 * users, member profiles, ACTIVE wallets (with a small ledger history), and reward
 * points. Idempotent per email — existing accounts are skipped. Returns the
 * accounts created during this run.
 */
export async function seedBulkMembers(db: Database, count: number): Promise<Credential[]> {
  await syncRbacCatalog(db);
  const actorUserId = await resolveActorUserId(db);
  const actor = {
    userId: actorUserId,
    ipAddress: '127.0.0.1',
    userAgent: 'bulk-members',
    correlationId: null,
  };

  const membersModule = createMembersModule(db);
  const walletModule = createWalletModule(db);
  const rewardsModule = createRewardsModule(db);
  const created: Credential[] = [];

  for (let i = 1; i <= count; i += 1) {
    const n = String(i).padStart(2, '0');
    const email = `member${n}@superdreams.com`;
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing[0]) {
      process.stdout.write(`skip ${email} (already exists)\n`);
      continue;
    }

    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const passwordHash = await hashPassword(SHARED_PASSWORD);

    // 1. Login user.
    const userRows = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id });
    const userId = userRows[0]!.id;

    // 2. Member profile (via the real service), linked to the login user, ACTIVE.
    const member = await membersModule.service.create(
      {
        firstName,
        lastName,
        email,
        profile: { bio: `${firstName} ${lastName} — Super Dreams member.` },
      },
      actor,
    );
    await db.update(members).set({ userId }).where(eq(members.id, member.id));
    await membersModule.service.changeStatus(member.id, { status: 'ACTIVE' }, actor);

    // 3. Wallet with a small, ledger-consistent transaction history.
    const wallet = await walletModule.service.create(
      { memberId: member.id, currencyCode: USD },
      actor,
    );
    await walletModule.service.changeStatus(wallet.id, { status: 'ACTIVE' }, actor);
    const load = randInt(30, 250) * 1000;
    await walletModule.service.credit(
      wallet.id,
      { amountMinor: load, description: 'Initial load' },
      actor,
    );
    const spend = randInt(5, 40) * 1000;
    await walletModule.service.debit(
      wallet.id,
      { amountMinor: spend, description: 'Marketplace purchase' },
      actor,
    );
    if (Math.random() > 0.5) {
      await walletModule.service.placeHold(
        wallet.id,
        { amountMinor: randInt(2, 10) * 1000, reason: 'Pending order' },
        actor,
      );
    }
    await walletModule.service.generateStatement(wallet.id, {}, actor);

    // 4. Reward points.
    const points = randInt(5, 200) * 100;
    await rewardsModule.service.allocate(
      member.id,
      { points, description: 'Welcome & activity rewards' },
      actor,
    );

    created.push({
      n: i,
      name: `${firstName} ${lastName}`,
      email,
      password: SHARED_PASSWORD,
      walletMinor: load - spend,
      rewardPoints: points,
      status: 'ACTIVE',
    });
    process.stdout.write(`created ${email} (${firstName} ${lastName})\n`);
  }

  return created;
}
