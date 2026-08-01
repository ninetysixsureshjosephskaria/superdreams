import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { StoreController } from '../controllers/store.controller';
import type { StoreService } from '../services';

const PREFIX = '/api/v1';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;

const PRODUCT_STATUS = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

const productBody = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    sku: { type: 'string' },
    categoryId: uuidParam,
    points: { type: 'integer', minimum: 0 },
    stock: { type: 'integer', minimum: 0 },
    reorderLevel: { type: 'integer', minimum: 0 },
    status: { type: 'string', enum: PRODUCT_STATUS },
    description: { type: 'string' },
    imageUrl: { type: 'string' },
  },
} as const;

const listProductsSchema: FastifySchema = {
  tags: ['Dream Store'],
  summary: 'List products',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      categoryId: uuidParam,
      status: { type: 'string', enum: PRODUCT_STATUS },
      sortBy: { type: 'string', enum: ['createdAt', 'name', 'points', 'stock'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const createProductSchema: FastifySchema = {
  tags: ['Dream Store'],
  summary: 'Create a product',
  security: secured,
  body: { ...productBody, required: ['name', 'sku', 'points'] },
};
const updateProductSchema: FastifySchema = {
  tags: ['Dream Store'],
  summary: 'Update a product',
  security: secured,
  params: idParams,
  body: productBody,
};
const adjustStockSchema: FastifySchema = {
  tags: ['Dream Store'],
  summary: 'Adjust product stock',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    required: ['change', 'reason'],
    properties: { change: { type: 'integer' }, reason: { type: 'string' } },
  },
};
const categoryBody = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string' },
    isActive: { type: 'boolean' },
    sortOrder: { type: 'integer', minimum: 0 },
  },
} as const;
const createCategorySchema: FastifySchema = {
  tags: ['Dream Store'],
  summary: 'Create a category',
  security: secured,
  body: { ...categoryBody, required: ['name'] },
};
const updateCategorySchema: FastifySchema = {
  tags: ['Dream Store'],
  summary: 'Update a category',
  security: secured,
  params: idParams,
  body: categoryBody,
};
const listOrdersSchema: FastifySchema = {
  tags: ['Dream Store'],
  summary: 'List redemption orders',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      status: { type: 'string', enum: ['PENDING', 'FULFILLED', 'CANCELLED'] },
      memberId: uuidParam,
      sortBy: { type: 'string', enum: ['createdAt', 'totalPoints', 'status'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};
const redeemSchema: FastifySchema = {
  tags: ['Dream Store'],
  summary: 'Redeem a product (member)',
  security: secured,
  body: {
    type: 'object',
    required: ['productId'],
    properties: { productId: uuidParam, quantity: { type: 'integer', minimum: 1, maximum: 10 } },
  },
};

const tagged: FastifySchema = { tags: ['Dream Store'], security: secured };
const idOnly: FastifySchema = { tags: ['Dream Store'], security: secured, params: idParams };

export interface RegisterStoreRoutesOptions {
  service: StoreService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/** Registers Dream Store routes. Admin routes require RBAC; `/dream-store/{catalog,redeem,me/*}` are auth-only. */
export function registerStoreRoutes(
  app: FastifyInstance,
  options: RegisterStoreRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new StoreController(service);
  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];
  const P = PERMISSIONS;

  app.register(
    (instance, _options, done) => {
      // Member self-service (auth-only).
      instance.get(
        '/dream-store/catalog',
        { schema: listProductsSchema, preHandler: authed },
        controller.catalog,
      );
      instance.get(
        '/dream-store/me/orders',
        { schema: listOrdersSchema, preHandler: authed },
        controller.myOrders,
      );
      instance.post(
        '/dream-store/redeem',
        { schema: redeemSchema, preHandler: authed },
        controller.redeem,
      );

      // Products (admin).
      instance.get(
        '/dream-store/products',
        { schema: listProductsSchema, preHandler: protect(P.STORE_READ) },
        controller.listProducts,
      );
      instance.post(
        '/dream-store/products',
        { schema: createProductSchema, preHandler: protect(P.STORE_PRODUCT_MANAGE) },
        controller.createProduct,
      );
      instance.get(
        '/dream-store/products/:id',
        { schema: idOnly, preHandler: protect(P.STORE_READ) },
        controller.getProduct,
      );
      instance.patch(
        '/dream-store/products/:id',
        { schema: updateProductSchema, preHandler: protect(P.STORE_PRODUCT_MANAGE) },
        controller.updateProduct,
      );
      instance.delete(
        '/dream-store/products/:id',
        { schema: idOnly, preHandler: protect(P.STORE_PRODUCT_MANAGE) },
        controller.deleteProduct,
      );
      instance.patch(
        '/dream-store/products/:id/stock',
        { schema: adjustStockSchema, preHandler: protect(P.STORE_INVENTORY_MANAGE) },
        controller.adjustStock,
      );
      instance.get(
        '/dream-store/products/:id/inventory-history',
        { schema: idOnly, preHandler: protect(P.STORE_READ) },
        controller.inventoryHistory,
      );

      // Categories (admin).
      instance.get(
        '/dream-store/categories',
        { schema: tagged, preHandler: protect(P.STORE_READ) },
        controller.listCategories,
      );
      instance.post(
        '/dream-store/categories',
        { schema: createCategorySchema, preHandler: protect(P.STORE_CATEGORY_MANAGE) },
        controller.createCategory,
      );
      instance.patch(
        '/dream-store/categories/:id',
        { schema: updateCategorySchema, preHandler: protect(P.STORE_CATEGORY_MANAGE) },
        controller.updateCategory,
      );
      instance.delete(
        '/dream-store/categories/:id',
        { schema: idOnly, preHandler: protect(P.STORE_CATEGORY_MANAGE) },
        controller.deleteCategory,
      );

      // Inventory (admin).
      instance.get(
        '/dream-store/inventory',
        { schema: listProductsSchema, preHandler: protect(P.STORE_READ) },
        controller.listInventory,
      );

      // Orders (admin).
      instance.get(
        '/dream-store/orders',
        { schema: listOrdersSchema, preHandler: protect(P.STORE_READ) },
        controller.listOrders,
      );
      instance.get(
        '/dream-store/orders/:id',
        { schema: idOnly, preHandler: protect(P.STORE_READ) },
        controller.getOrder,
      );
      instance.post(
        '/dream-store/orders/:id/cancel',
        { schema: idOnly, preHandler: protect(P.STORE_ORDER_MANAGE) },
        controller.cancelOrder,
      );

      done();
    },
    { prefix: PREFIX },
  );
}
