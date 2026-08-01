import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';

import { WalletEventBus } from './events';
import {
  MemberLookupRepository,
  WalletAdjustmentRepository,
  WalletAuditRepository,
  WalletBalanceRepository,
  WalletHoldRepository,
  WalletLimitRepository,
  WalletRepository,
  WalletStatementRepository,
  WalletTransactionRepository,
} from './repositories';
import { registerWalletRoutes } from './routes';
import { WalletService } from './services';

export interface WalletModule {
  events: WalletEventBus;
  service: WalletService;
  repositories: {
    wallets: WalletRepository;
    balances: WalletBalanceRepository;
    transactions: WalletTransactionRepository;
    holds: WalletHoldRepository;
  };
}

/** Composition root for the Wallet Management module. */
export function createWalletModule(
  db: Database,
  events: WalletEventBus = new WalletEventBus(),
): WalletModule {
  const wallets = new WalletRepository(db);
  const balances = new WalletBalanceRepository(db);
  const transactions = new WalletTransactionRepository(db);
  const holds = new WalletHoldRepository(db);
  const adjustments = new WalletAdjustmentRepository(db);
  const statements = new WalletStatementRepository(db);
  const limits = new WalletLimitRepository(db);
  const memberLookup = new MemberLookupRepository(db);
  const audit = new WalletAuditRepository();

  const service = new WalletService(
    db,
    wallets,
    balances,
    transactions,
    holds,
    adjustments,
    statements,
    limits,
    memberLookup,
    audit,
    events,
  );

  return { events, service, repositories: { wallets, balances, transactions, holds } };
}

/**
 * Wires Wallet Management into the application: reuses the Authentication module
 * for the authenticate preHandler and the RBAC module for permission guards.
 */
export function registerWalletModule(app: FastifyInstance): WalletModule {
  const module = createWalletModule(app.db);

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerWalletRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { WalletEventBus } from './events';
export type { WalletEvent, WalletEventType, WalletEventHandler } from './events';
export { WalletService } from './services';
export type {
  WalletSummary,
  WalletDetail,
  WalletBalanceData,
  WalletTransactionData,
  WalletHoldData,
  WalletStatementData,
  PaginatedWallets,
  PaginatedTransactions,
  WalletStatus,
  TransactionType,
  TransactionDirection,
} from './dto';
export { isWalletOwner, assertWalletOwner } from './policies';
