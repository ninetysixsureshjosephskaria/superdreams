import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { storeInventoryChangeType, storeOrderStatus, storeProductStatus } from './enums';
import { users } from './identity';
import { members } from './members';

/**
 * Dream Store. A points-redemption catalog: members spend reward points to
 * redeem products. Redemption reuses the Rewards ledger (never re-implements
 * point logic) and runs atomically with stock decrement, order creation and an
 * append-only inventory history. Mirrors the platform ledger/lifecycle
 * conventions.
 */

/** Product categories that organize the catalog. */
export const storeCategories = pgTable(
  'store_categories',
  {
    ...baseColumns(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('store_categories_slug_uq').on(table.slug)],
);

/** A redeemable product. `stock` is the authoritative on-hand quantity. */
export const storeProducts = pgTable(
  'store_products',
  {
    ...baseColumns(),
    name: text('name').notNull(),
    sku: text('sku').notNull(),
    categoryId: uuid('category_id').references(() => storeCategories.id),
    /** Reward points required to redeem one unit. */
    points: integer('points').notNull(),
    stock: integer('stock').notNull().default(0),
    reorderLevel: integer('reorder_level').notNull().default(0),
    status: storeProductStatus('status').notNull().default('DRAFT'),
    description: text('description'),
    imageUrl: text('image_url'),
  },
  (table) => [
    uniqueIndex('store_products_sku_uq').on(table.sku),
    index('store_products_category_idx').on(table.categoryId),
    index('store_products_status_idx').on(table.status),
  ],
);

/** A redemption order placed by a member. */
export const storeOrders = pgTable(
  'store_orders',
  {
    ...baseColumns(),
    reference: text('reference').notNull(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    status: storeOrderStatus('status').notNull().default('PENDING'),
    /** Total reward points debited for the order. */
    totalPoints: integer('total_points').notNull(),
    /** The reward-ledger transaction produced when the order was redeemed. */
    rewardTransactionId: uuid('reward_transaction_id'),
    /** The reward-ledger transaction produced when the order was refunded. */
    refundTransactionId: uuid('refund_transaction_id'),
    placedBy: uuid('placed_by').references(() => users.id),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('store_orders_reference_uq').on(table.reference),
    index('store_orders_member_id_idx').on(table.memberId),
    index('store_orders_status_idx').on(table.status),
  ],
);

/** Line items for an order (snapshots product name + points at redemption). */
export const storeOrderItems = pgTable(
  'store_order_items',
  {
    ...baseColumns(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => storeOrders.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => storeProducts.id),
    productName: text('product_name').notNull(),
    points: integer('points').notNull(),
    quantity: integer('quantity').notNull().default(1),
  },
  (table) => [index('store_order_items_order_id_idx').on(table.orderId)],
);

/** Append-only record of every stock movement. */
export const storeInventoryHistory = pgTable(
  'store_inventory_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => storeProducts.id),
    changeType: storeInventoryChangeType('change_type').notNull(),
    /** Signed quantity change (negative for redemptions). */
    change: integer('change').notNull(),
    stockAfter: integer('stock_after').notNull(),
    reason: text('reason'),
    orderId: uuid('order_id'),
    actorId: uuid('actor_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('store_inventory_history_product_id_idx').on(table.productId),
    index('store_inventory_history_created_at_idx').on(table.createdAt),
  ],
);
