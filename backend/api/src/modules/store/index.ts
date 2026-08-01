import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';
import { createRewardsModule, type RewardService } from '@/modules/rewards';

import { StoreEventBus } from './events';
import {
  CategoryRepository,
  InventoryRepository,
  OrderRepository,
  ProductRepository,
  StoreAuditRepository,
} from './repositories';
import { registerStoreRoutes } from './routes';
import { StoreService } from './services';

export interface StoreModule {
  events: StoreEventBus;
  service: StoreService;
}

/** Composition root for the Dream Store module. Redemption reuses the Rewards ledger. */
export function createStoreModule(
  db: Database,
  options: { events?: StoreEventBus; rewards?: RewardService } = {},
): StoreModule {
  const events = options.events ?? new StoreEventBus();
  const rewards = options.rewards ?? createRewardsModule(db).service;
  const service = new StoreService(
    db,
    new ProductRepository(db),
    new CategoryRepository(db),
    new OrderRepository(db),
    new InventoryRepository(db),
    new StoreAuditRepository(),
    rewards,
    events,
  );
  return { events, service };
}

/**
 * Wires the Dream Store into the application: reuses Authentication for the
 * authenticate preHandler, RBAC for permission guards, and the Rewards module's
 * public service for atomic point movements during redemption.
 */
export function registerStoreModule(app: FastifyInstance): StoreModule {
  const module = createStoreModule(app.db);

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerStoreRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { StoreEventBus } from './events';
export type { StoreEvent, StoreEventType, StoreEventHandler } from './events';
export { StoreService } from './services';
export type {
  ProductData,
  CategoryData,
  OrderData,
  OrderItemData,
  InventoryHistoryData,
  RedeemResult,
  ProductStatus,
  OrderStatus,
  StockStatus,
} from './dto';
