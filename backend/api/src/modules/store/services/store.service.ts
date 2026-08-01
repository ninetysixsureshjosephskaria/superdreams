import { randomUUID } from 'node:crypto';

import type { Database } from '@/database/client';
import { buildPaginatedResult, normalizePagination } from '@/database/helpers';
import { withTransaction } from '@/database/helpers/transaction';
import type { Executor } from '@/database/types';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';
import type { RewardService } from '@/modules/rewards';

import type {
  CategoryData,
  InventoryHistoryData,
  OrderData,
  PaginatedOrders,
  PaginatedProducts,
  ProductData,
  RedeemResult,
  StoreActor,
} from '../dto';
import type { StoreEventBus } from '../events';
import { toCategory, toInventoryHistory, toOrder, toProduct } from '../mappers';
import type {
  AuditActionType,
  CategoryRepository,
  InventoryRepository,
  OrderRepository,
  OrderWithMember,
  ProductRepository,
  StoreAuditRepository,
} from '../repositories';
import {
  adjustStockSchema,
  createCategorySchema,
  createProductSchema,
  listCategoriesQuerySchema,
  listInventoryQuerySchema,
  listOrdersQuerySchema,
  listProductsQuerySchema,
  redeemSchema,
  updateCategorySchema,
  updateProductSchema,
} from '../validators';

const MODULE = 'store';

function ref(prefix: string): string {
  return `${prefix}-${randomUUID().split('-')[0]!.toUpperCase()}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Dream Store business logic. Members redeem reward points for products;
 * redemption reuses the Rewards ledger (never re-implements point logic) and runs
 * atomically with stock decrement, order creation and inventory history. All
 * mutations are validated, audited and emit events.
 */
export class StoreService {
  public constructor(
    private readonly db: Database,
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
    private readonly orders: OrderRepository,
    private readonly inventory: InventoryRepository,
    private readonly audit: StoreAuditRepository,
    private readonly rewards: RewardService,
    private readonly events: StoreEventBus,
  ) {}

  // --- Products --------------------------------------------------------------

  public async listProducts(query: unknown): Promise<PaginatedProducts> {
    const parsed = listProductsQuerySchema.parse(query);
    const { rows, total } = await this.products.search(parsed);
    return buildPaginatedResult(rows.map(toProduct), total, parsed.page, parsed.pageSize);
  }

  /** Member-facing catalog: active products only. */
  public async listCatalog(query: unknown): Promise<PaginatedProducts> {
    const parsed = listProductsQuerySchema.parse(query);
    const { rows, total } = await this.products.search(parsed, { activeOnly: true });
    return buildPaginatedResult(rows.map(toProduct), total, parsed.page, parsed.pageSize);
  }

  public async getProduct(id: string): Promise<ProductData> {
    const row = await this.products.findWithCategory(id);
    if (!row) {
      throw new NotFoundError('Product not found.');
    }
    return toProduct(row);
  }

  public async createProduct(input: unknown, actor: StoreActor): Promise<ProductData> {
    const data = createProductSchema.parse(input);
    if (await this.products.findBySku(data.sku)) {
      throw new ConflictError('A product with this SKU already exists.');
    }
    if (data.categoryId) {
      await this.requireCategory(data.categoryId);
    }
    const created = await this.products.create({
      name: data.name,
      sku: data.sku,
      categoryId: data.categoryId ?? null,
      points: data.points,
      stock: data.stock,
      reorderLevel: data.reorderLevel,
      status: data.status,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    if (data.stock > 0) {
      await this.inventory.record({
        productId: created.id,
        changeType: 'RESTOCK',
        change: data.stock,
        stockAfter: data.stock,
        reason: 'Initial stock',
        orderId: null,
        actorId: actor.userId,
      });
    }
    await this.writeAudit(
      created.id,
      'CREATE',
      { sku: created.sku, points: created.points },
      actor,
      this.db,
    );
    await this.events.publish({
      type: 'ProductCreated',
      productId: created.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.getProduct(created.id);
  }

  public async updateProduct(id: string, input: unknown, actor: StoreActor): Promise<ProductData> {
    const data = updateProductSchema.parse(input);
    const existing = await this.products.findById(id);
    if (!existing) {
      throw new NotFoundError('Product not found.');
    }
    if (data.categoryId) {
      await this.requireCategory(data.categoryId);
    }
    const values: Record<string, unknown> = { updatedBy: actor.userId };
    if (data.name !== undefined) values.name = data.name;
    if (data.categoryId !== undefined) values.categoryId = data.categoryId;
    if (data.points !== undefined) values.points = data.points;
    if (data.reorderLevel !== undefined) values.reorderLevel = data.reorderLevel;
    if (data.status !== undefined) values.status = data.status;
    if (data.description !== undefined) values.description = data.description;
    if (data.imageUrl !== undefined) values.imageUrl = data.imageUrl;
    await this.products.update(id, values);
    await this.writeAudit(id, 'UPDATE', { fields: Object.keys(values) }, actor, this.db);
    await this.events.publish({
      type: 'ProductUpdated',
      productId: id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.getProduct(id);
  }

  public async archiveProduct(id: string, actor: StoreActor): Promise<void> {
    const existing = await this.products.findById(id);
    if (!existing) {
      throw new NotFoundError('Product not found.');
    }
    await this.products.softDelete(id, actor.userId);
    await this.writeAudit(id, 'DELETE', { sku: existing.sku }, actor, this.db);
    await this.events.publish({
      type: 'ProductArchived',
      productId: id,
      actorId: actor.userId,
      at: new Date(),
    });
  }

  // --- Categories ------------------------------------------------------------

  public async listCategories(query: unknown): Promise<CategoryData[]> {
    const parsed = listCategoriesQuerySchema.parse(query);
    const rows = await this.categories.listAll(parsed);
    const counts = await this.products.countByCategory();
    return rows.map((row) => toCategory(row, counts.get(row.id) ?? 0));
  }

  public async createCategory(input: unknown, actor: StoreActor): Promise<CategoryData> {
    const data = createCategorySchema.parse(input);
    const slug = data.slug ?? slugify(data.name);
    if (await this.categories.findBySlug(slug)) {
      throw new ConflictError('A category with this slug already exists.');
    }
    const created = await this.categories.create({
      name: data.name,
      slug,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await this.writeAudit(created.id, 'CREATE', { name: created.name, slug }, actor, this.db);
    await this.events.publish({
      type: 'CategoryCreated',
      categoryId: created.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return toCategory(created, 0);
  }

  public async updateCategory(
    id: string,
    input: unknown,
    actor: StoreActor,
  ): Promise<CategoryData> {
    const data = updateCategorySchema.parse(input);
    const existing = await this.categories.findById(id);
    if (!existing) {
      throw new NotFoundError('Category not found.');
    }
    const values: Record<string, unknown> = { updatedBy: actor.userId };
    if (data.name !== undefined) values.name = data.name;
    if (data.description !== undefined) values.description = data.description;
    if (data.isActive !== undefined) values.isActive = data.isActive;
    if (data.sortOrder !== undefined) values.sortOrder = data.sortOrder;
    const updated = (await this.categories.update(id, values)) ?? existing;
    await this.writeAudit(id, 'UPDATE', { fields: Object.keys(values) }, actor, this.db);
    await this.events.publish({
      type: 'CategoryUpdated',
      categoryId: id,
      actorId: actor.userId,
      at: new Date(),
    });
    const counts = await this.products.countByCategory();
    return toCategory(updated, counts.get(id) ?? 0);
  }

  public async deleteCategory(id: string, actor: StoreActor): Promise<void> {
    const existing = await this.categories.findById(id);
    if (!existing) {
      throw new NotFoundError('Category not found.');
    }
    await this.categories.softDelete(id, actor.userId);
    await this.writeAudit(id, 'DELETE', { name: existing.name }, actor, this.db);
  }

  // --- Inventory -------------------------------------------------------------

  public async listInventory(query: unknown): Promise<PaginatedProducts> {
    const parsed = listInventoryQuerySchema.parse(query);
    const { rows } = await this.products.search({
      page: 1,
      pageSize: 100,
      sortBy: 'name',
      order: 'asc',
      ...(parsed.search ? { search: parsed.search } : {}),
    });
    let items = rows.map(toProduct);
    if (parsed.stockStatus) {
      items = items.filter((product) => product.stockStatus === parsed.stockStatus);
    }
    const { page, pageSize } = normalizePagination(parsed);
    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return buildPaginatedResult(paged, total, page, pageSize);
  }

  public async adjustStock(
    productId: string,
    input: unknown,
    actor: StoreActor,
  ): Promise<ProductData> {
    const data = adjustStockSchema.parse(input);
    await withTransaction(this.db, async (tx) => {
      const product = await this.products.lockById(productId, tx);
      if (!product) {
        throw new NotFoundError('Product not found.');
      }
      const newStock = product.stock + data.change;
      if (newStock < 0) {
        throw new BusinessRuleError('Stock cannot go below zero.');
      }
      await this.products.setStock(productId, newStock, tx);
      await this.inventory.record(
        {
          productId,
          changeType: 'ADJUSTMENT',
          change: data.change,
          stockAfter: newStock,
          reason: data.reason,
          orderId: null,
          actorId: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        productId,
        'UPDATE',
        { stockChange: data.change, stockAfter: newStock },
        actor,
        tx,
      );
    });
    await this.events.publish({
      type: 'StockAdjusted',
      productId,
      change: data.change,
      stockAfter: (await this.products.findById(productId))?.stock ?? 0,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.getProduct(productId);
  }

  public async getInventoryHistory(productId: string): Promise<InventoryHistoryData[]> {
    await this.getProduct(productId);
    return (await this.inventory.listByProduct(productId)).map(toInventoryHistory);
  }

  // --- Orders & redemption ---------------------------------------------------

  public async listOrders(query: unknown): Promise<PaginatedOrders> {
    const parsed = listOrdersQuerySchema.parse(query);
    const { rows, total } = await this.orders.search(parsed);
    const items = await this.hydrateOrders(rows);
    return buildPaginatedResult(items, total, parsed.page, parsed.pageSize);
  }

  public async listMemberOrders(userId: string, query: unknown): Promise<PaginatedOrders> {
    const memberId = await this.rewards.getMemberIdForUser(userId);
    if (!memberId) {
      throw new NotFoundError('No member profile is linked to this account.');
    }
    const parsed = listOrdersQuerySchema.parse(query);
    const { rows, total } = await this.orders.search(parsed, memberId);
    const items = await this.hydrateOrders(rows);
    return buildPaginatedResult(items, total, parsed.page, parsed.pageSize);
  }

  public async getOrder(id: string): Promise<OrderData> {
    return this.requireOrderData(id);
  }

  /** Redeems a product for the authenticated member. */
  public async redeemForUser(
    userId: string,
    input: unknown,
    actor: StoreActor,
  ): Promise<RedeemResult> {
    const memberId = await this.rewards.getMemberIdForUser(userId);
    if (!memberId) {
      throw new NotFoundError('No member profile is linked to this account.');
    }
    return this.redeem(memberId, input, actor);
  }

  /**
   * Atomic redemption: verifies stock and reward balance, deducts points via the
   * Rewards ledger, creates the order + items, decrements stock and records
   * inventory history + audit — all in a single transaction.
   */
  private async redeem(memberId: string, input: unknown, actor: StoreActor): Promise<RedeemResult> {
    const data = redeemSchema.parse(input);

    const outcome = await withTransaction(this.db, async (tx) => {
      const product = await this.products.lockById(data.productId, tx);
      if (!product) {
        throw new NotFoundError('Product not found.');
      }
      if (product.status !== 'ACTIVE') {
        throw new BusinessRuleError('This product is not available for redemption.');
      }
      if (product.stock < data.quantity) {
        throw new BusinessRuleError('Insufficient stock for this product.');
      }
      const totalPoints = product.points * data.quantity;

      // Deduct points via the Rewards ledger (enforces balance; throws if short).
      const spend = await this.rewards.spendPointsWithin(tx, memberId, totalPoints, {
        reference: ref('SD-RDM'),
        description: `Redeemed ${product.name}`,
        actor,
      });

      const reference = ref('SD-ORD');
      const order = await this.orders.create(
        {
          reference,
          memberId,
          status: 'FULFILLED',
          totalPoints,
          rewardTransactionId: spend.transactionId,
          placedBy: actor.userId,
          fulfilledAt: new Date(),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.orders.createItem(
        {
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          points: product.points,
          quantity: data.quantity,
        },
        tx,
      );
      const newStock = product.stock - data.quantity;
      await this.products.setStock(product.id, newStock, tx);
      await this.inventory.record(
        {
          productId: product.id,
          changeType: 'REDEMPTION',
          change: -data.quantity,
          stockAfter: newStock,
          reason: `Order ${reference}`,
          orderId: order.id,
          actorId: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        order.id,
        'CREATE',
        { type: 'redeem', productId: product.id, memberId, points: totalPoints },
        actor,
        tx,
      );
      return {
        orderId: order.id,
        productId: product.id,
        totalPoints,
        balanceAfter: spend.balanceAfter,
      };
    });

    await this.events.publish({
      type: 'ProductRedeemed',
      orderId: outcome.orderId,
      productId: outcome.productId,
      memberId,
      points: outcome.totalPoints,
      at: new Date(),
    });

    return {
      order: await this.requireOrderData(outcome.orderId),
      pointsSpent: outcome.totalPoints,
      balanceAfter: outcome.balanceAfter,
    };
  }

  /**
   * Cancels an order atomically: restocks each line item and refunds the reward
   * points via the Rewards ledger.
   */
  public async cancelOrder(id: string, actor: StoreActor): Promise<OrderData> {
    const result = await withTransaction(this.db, async (tx) => {
      const order = await this.orders.lockById(id, tx);
      if (!order) {
        throw new NotFoundError('Order not found.');
      }
      if (order.status === 'CANCELLED') {
        throw new BusinessRuleError('Order is already cancelled.');
      }
      const items = await this.orders.itemsByOrder(id, tx);
      for (const item of items) {
        const product = await this.products.lockById(item.productId, tx);
        if (product) {
          const newStock = product.stock + item.quantity;
          await this.products.setStock(product.id, newStock, tx);
          await this.inventory.record(
            {
              productId: product.id,
              changeType: 'CANCELLATION',
              change: item.quantity,
              stockAfter: newStock,
              reason: `Order ${order.reference} cancelled`,
              orderId: order.id,
              actorId: actor.userId,
            },
            tx,
          );
        }
      }
      const refund = await this.rewards.refundPointsWithin(tx, order.memberId, order.totalPoints, {
        reference: ref('SD-REF'),
        description: `Refund for order ${order.reference}`,
        actor,
      });
      await this.orders.update(
        id,
        {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          refundTransactionId: refund.transactionId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        id,
        'UPDATE',
        { type: 'cancel', refunded: order.totalPoints },
        actor,
        tx,
      );
      return { memberId: order.memberId, refunded: order.totalPoints };
    });

    await this.events.publish({
      type: 'OrderCancelled',
      orderId: id,
      memberId: result.memberId,
      refunded: result.refunded,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireOrderData(id);
  }

  // --- Internals -------------------------------------------------------------

  private async hydrateOrders(rows: OrderWithMember[]): Promise<OrderData[]> {
    return Promise.all(
      rows.map(async (row) => toOrder(row, await this.orders.itemsByOrder(row.id))),
    );
  }

  private async requireOrderData(id: string): Promise<OrderData> {
    const row = await this.orders.findWithMember(id);
    if (!row) {
      throw new NotFoundError('Order not found.');
    }
    return toOrder(row, await this.orders.itemsByOrder(id));
  }

  private async requireCategory(id: string): Promise<void> {
    const category = await this.categories.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found.');
    }
  }

  private async writeAudit(
    entityId: string,
    action: AuditActionType,
    newValue: Record<string, unknown>,
    actor: StoreActor,
    executor: Executor,
  ): Promise<void> {
    await this.audit.write(
      {
        entityType: 'store',
        entityId,
        action,
        newValue,
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      executor,
    );
  }
}
