import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';
import { createRewardsModule } from '@/modules/rewards';

import { RedemptionRequestEventBus } from './events';
import {
  RedemptionMemberLookupRepository,
  RedemptionRequestAuditRepository,
  RedemptionRequestRepository,
} from './repositories';
import { registerRedemptionRequestRoutes } from './routes';
import { RedemptionRequestService, type RewardRedeemPort } from './services';

export interface RedemptionRequestsModule {
  events: RedemptionRequestEventBus;
  service: RedemptionRequestService;
  repositories: {
    requests: RedemptionRequestRepository;
  };
}

export interface RedemptionRequestsModuleDeps {
  rewardRedeem: RewardRedeemPort;
  events?: RedemptionRequestEventBus;
}

/** Composition root for the member points-redemption request/approval module (P2). */
export function createRedemptionRequestsModule(
  db: Database,
  deps: RedemptionRequestsModuleDeps,
): RedemptionRequestsModule {
  const events = deps.events ?? new RedemptionRequestEventBus();
  const requestRepo = new RedemptionRequestRepository(db);
  const memberLookup = new RedemptionMemberLookupRepository(db);
  const audit = new RedemptionRequestAuditRepository();

  const service = new RedemptionRequestService(
    db,
    requestRepo,
    memberLookup,
    audit,
    events,
    deps.rewardRedeem,
  );

  return { events, service, repositories: { requests: requestRepo } };
}

/**
 * Wires the redemption-requests module into the application. Reuses the RBAC
 * module for permission guards, the Auth module for `authenticate`, and the
 * Rewards module's additive `redeemWithin(tx,…)` seam to debit points + record
 * the completed redemption atomically on approval. Existing rewards / dream-store
 * / games behaviour is untouched.
 */
export function registerRedemptionRequestsModule(app: FastifyInstance): RedemptionRequestsModule {
  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  // A rewards module instance used only for its transaction-aware redeem seam.
  // No wallet bridge is provided, so `redeemWithin` can never touch money.
  const rewards = createRewardsModule(app.db);
  const rewardRedeem: RewardRedeemPort = {
    redeemWithin: (tx, memberId, points, options) =>
      rewards.service.redeemWithin(tx, memberId, points, options),
  };

  const module = createRedemptionRequestsModule(app.db, { rewardRedeem });
  registerRedemptionRequestRoutes(app, {
    service: module.service,
    authenticate,
    guardDeps,
  });
  return module;
}

export { RedemptionRequestEventBus } from './events';
export type {
  RedemptionRequestEvent,
  RedemptionRequestEventType,
  RedemptionRequestEventHandler,
} from './events';
export { RedemptionRequestService } from './services';
export type { RewardRedeemPort } from './services';
export type {
  RedemptionRequestActor,
  RedemptionRequestData,
  RedemptionRequestStatusType,
  PaginatedRedemptionRequests,
} from './dto';
