import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';
import { createWalletModule, type WalletService } from '@/modules/wallet';
import type { WalletRepository } from '@/modules/wallet/repositories';

import { FinanceEventBus } from './events';
import {
  DepositTrancheRepository,
  FinanceAuditRepository,
  FinancialLimitsRepository,
  FinancialRequestRepository,
  MemberLookupRepository,
} from './repositories';
import { registerFinanceRoutes } from './routes';
import { FinanceService, type FinanceAuthorizationPort } from './services/finance.service';

export interface FinanceModule {
  events: FinanceEventBus;
  service: FinanceService;
  repositories: {
    requests: FinancialRequestRepository;
    tranches: DepositTrancheRepository;
  };
}

/**
 * Composition root for the Finance module (Phase 2B). Depends on the wallet
 * module's service + repository for the atomic money-movement compose seam
 * (`creditWithin` / `debitWithin`) and on an authorization port for the
 * reference's split deposit/withdrawal approval permissions.
 */
export function createFinanceModule(
  db: Database,
  wallet: WalletService,
  wallets: WalletRepository,
  authz: FinanceAuthorizationPort,
  events: FinanceEventBus = new FinanceEventBus(),
): FinanceModule {
  const requests = new FinancialRequestRepository(db);
  const tranches = new DepositTrancheRepository(db);
  const limits = new FinancialLimitsRepository(db);
  const members = new MemberLookupRepository(db);
  const audit = new FinanceAuditRepository();

  const service = new FinanceService(
    db,
    wallet,
    wallets,
    requests,
    tranches,
    limits,
    members,
    audit,
    events,
    authz,
  );

  return { events, service, repositories: { requests, tranches } };
}

/**
 * Wires Finance into the application: reuses the wallet module for the money
 * seam, the Authentication module for the authenticate preHandler, and the RBAC
 * module for permission guards + type-specific approval checks.
 */
export function registerFinanceModule(app: FastifyInstance): FinanceModule {
  const walletModule = createWalletModule(app.db);

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };
  const authz: FinanceAuthorizationPort = {
    can: (userId, permissionKey) => rbac.authorization.hasPermission(userId, permissionKey),
  };

  const module = createFinanceModule(
    app.db,
    walletModule.service,
    walletModule.repositories.wallets,
    authz,
  );

  registerFinanceRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { FinanceEventBus } from './events';
export type { FinanceEvent, FinanceEventType, FinanceEventHandler } from './events';
export { createTrancheMaturityScheduler } from './schedulers';
export type { TrancheMaturityScheduler } from './schedulers';
export { FinanceService } from './services';
export type { FinanceAuthorizationPort } from './services/finance.service';
export type {
  FinanceActor,
  FinancialRequestData,
  FinancialRequestType,
  FinancialRequestStatus,
  DepositTrancheData,
  DepositTrancheStatus,
  FinancialLimitsData,
  TrancheMaturityResult,
  PaginatedFinancialRequests,
} from './dto';
