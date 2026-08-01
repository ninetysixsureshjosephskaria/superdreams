import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { auditLogs, members, storeInventoryHistory, users } from '@/database/schema';
import { createRewardsModule, type RewardsModule } from '@/modules/rewards';

import { createStoreModule, type StoreModule } from '../index';

const ACTOR = {
  userId: '00000000-0000-0000-0000-0000000000bb',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  correlationId: null,
};

let seq = 0;
async function makeFundedMember(
  db: Database,
  rewards: RewardsModule,
  points: number,
): Promise<{ memberId: string; userId: string }> {
  seq += 1;
  const userRows = await db
    .insert(users)
    .values({ email: `store-user${seq}@store.test`, status: 'ACTIVE' })
    .returning({ id: users.id });
  const userId = userRows[0]!.id;
  const rows = await db
    .insert(members)
    .values({
      userId,
      memberNumber: `M-STORE${String(seq).padStart(4, '0')}`,
      firstName: 'Store',
      lastName: `Member${seq}`,
      email: `store${seq}@store.test`,
      status: 'ACTIVE',
    })
    .returning({ id: members.id });
  const memberId = rows[0]!.id;
  if (points > 0) {
    await rewards.service.allocate(memberId, { points, description: 'Test funding' }, ACTOR);
  }
  return { memberId, userId };
}

describe('dream store module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let store: StoreModule;
  let rewards: RewardsModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    rewards = createRewardsModule(db);
    store = createStoreModule(db, { rewards: rewards.service });
  });

  afterAll(async () => {
    await client.close();
  });

  it('creates a category and product, recording a RESTOCK inventory entry', async () => {
    const category = await store.service.createCategory({ name: 'Test Gadgets' }, ACTOR);
    expect(category.slug).toBe('test-gadgets');

    const product = await store.service.createProduct(
      {
        name: 'Wireless Buds',
        sku: 'SD-TEST-001',
        points: 100,
        stock: 5,
        categoryId: category.id,
        status: 'ACTIVE',
      },
      ACTOR,
    );
    expect(product.stock).toBe(5);
    expect(product.status).toBe('ACTIVE');

    const history = await db
      .select()
      .from(storeInventoryHistory)
      .where(eq(storeInventoryHistory.productId, product.id));
    expect(history).toHaveLength(1);
    expect(history[0]!.changeType).toBe('RESTOCK');
    expect(history[0]!.change).toBe(5);
  });

  it('redeems a product atomically: deducts points, creates order, decrements stock, audits', async () => {
    const { userId, memberId } = await makeFundedMember(db, rewards, 1_000);
    const product = await store.service.createProduct(
      { name: 'Travel Mug', sku: 'SD-TEST-002', points: 100, stock: 5, status: 'ACTIVE' },
      ACTOR,
    );

    const result = await store.service.redeemForUser(
      userId,
      { productId: product.id, quantity: 2 },
      { ...ACTOR, userId },
    );

    expect(result.pointsSpent).toBe(200);
    expect(result.balanceAfter).toBe(800);
    expect(result.order.status).toBe('FULFILLED');
    expect(result.order.items).toHaveLength(1);
    expect(result.order.items[0]!.quantity).toBe(2);

    const balance = await rewards.service.getMemberBalance(memberId);
    expect(balance.pointsBalance).toBe(800);

    const fresh = await store.service.getProduct(product.id);
    expect(fresh.stock).toBe(3);

    const audit = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.module, 'store'), eq(auditLogs.entityId, result.order.id)));
    expect(audit.length).toBeGreaterThanOrEqual(1);
  });

  it('cancels an order: restocks and refunds points', async () => {
    const { userId, memberId } = await makeFundedMember(db, rewards, 500);
    const product = await store.service.createProduct(
      { name: 'Notebook', sku: 'SD-TEST-003', points: 100, stock: 3, status: 'ACTIVE' },
      ACTOR,
    );
    const result = await store.service.redeemForUser(
      userId,
      { productId: product.id, quantity: 1 },
      { ...ACTOR, userId },
    );
    expect((await rewards.service.getMemberBalance(memberId)).pointsBalance).toBe(400);

    const cancelled = await store.service.cancelOrder(result.order.id, ACTOR);
    expect(cancelled.status).toBe('CANCELLED');

    expect((await store.service.getProduct(product.id)).stock).toBe(3);
    expect((await rewards.service.getMemberBalance(memberId)).pointsBalance).toBe(500);
  });

  it('rejects redemption when stock is insufficient (no points moved)', async () => {
    const { userId, memberId } = await makeFundedMember(db, rewards, 1_000);
    const product = await store.service.createProduct(
      { name: 'Rare Item', sku: 'SD-TEST-004', points: 100, stock: 1, status: 'ACTIVE' },
      ACTOR,
    );
    await expect(
      store.service.redeemForUser(
        userId,
        { productId: product.id, quantity: 5 },
        { ...ACTOR, userId },
      ),
    ).rejects.toThrow(/stock/i);
    expect((await rewards.service.getMemberBalance(memberId)).pointsBalance).toBe(1_000);
  });

  it('rejects redemption when the reward balance is insufficient', async () => {
    const { userId } = await makeFundedMember(db, rewards, 50);
    const product = await store.service.createProduct(
      { name: 'Premium Item', sku: 'SD-TEST-005', points: 100, stock: 5, status: 'ACTIVE' },
      ACTOR,
    );
    await expect(
      store.service.redeemForUser(
        userId,
        { productId: product.id, quantity: 1 },
        { ...ACTOR, userId },
      ),
    ).rejects.toThrow();
    expect((await store.service.getProduct(product.id)).stock).toBe(5);
  });
});
