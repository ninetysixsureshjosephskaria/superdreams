/**
 * Bulk member generator — reusable, side-effect-free core.
 *
 * Creates fully-populated member accounts (member01…memberNN): a login user, a
 * member profile linked to it, an ACTIVE wallet with a small ledger history, and
 * reward points. Idempotent per email — existing accounts are skipped and counted.
 * Importing this module runs nothing; call {@link seedBulkMembers}.
 *
 * Consumed by the `bulk-members` CLI and the Super Admin "Generate Demo Members"
 * BCC action.
 */
import { eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { members, users } from '@/database/schema';
import { hashPassword } from '@/modules/identity/services';
import { createMembersModule } from '@/modules/members';
import { syncRbacCatalog } from '@/modules/rbac/seed';
import { createRewardsModule } from '@/modules/rewards';
import { createWalletModule } from '@/modules/wallet';

export const SHARED_PASSWORD = 'Member123!';
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

/** Outcome of a generation run — the accounts created plus how many were skipped. */
export interface BulkMemberResult {
  created: Credential[];
  skipped: number;
}

export interface SeedBulkMembersOptions {
  /** Audit actor for the created records. Defaults to any existing admin user. */
  actorUserId?: string;
}

async function resolveActorUserId(db: Database): Promise<string> {
  // Any existing user works as the audit actor; prefer an admin if present.
  const admin = await db.select({ id: users.id }).from(users).limit(1);
  if (admin[0]) return admin[0].id;
  throw new Error('No users exist to act as the seed actor — run the base seed first.');
}

/**
 * Creates `count` member accounts. Idempotent per email — existing `memberNN`
 * accounts are skipped (and counted in {@link BulkMemberResult.skipped}). Returns
 * the accounts created during this run and the skip count.
 */
export async function seedBulkMembers(
  db: Database,
  count: number,
  options: SeedBulkMembersOptions = {},
): Promise<BulkMemberResult> {
  await syncRbacCatalog(db);
  const actorUserId = options.actorUserId ?? (await resolveActorUserId(db));
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
  let skipped = 0;

  for (let i = 1; i <= count; i += 1) {
    const n = String(i).padStart(2, '0');
    const email = `member${n}@superdreams.com`;
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing[0]) {
      skipped += 1;
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
    // Spend and hold are kept strictly below the loaded balance so the ledger
    // never goes negative (load is >= 30k; spend <= 20k, hold <= 5k).
    const spend = randInt(5, 20) * 1000;
    await walletModule.service.debit(
      wallet.id,
      { amountMinor: spend, description: 'Marketplace purchase' },
      actor,
    );
    if (Math.random() > 0.5) {
      await walletModule.service.placeHold(
        wallet.id,
        { amountMinor: randInt(2, 5) * 1000, reason: 'Pending order' },
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
  }

  return { created, skipped };
}
