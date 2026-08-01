import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';
import { createRewardsModule } from '@/modules/rewards';

import { CampaignEventBus } from './events';
import {
  CampaignAuditRepository,
  CampaignEnrollmentRepository,
  CampaignExecutionRepository,
  CampaignHistoryRepository,
  CampaignRepository,
  CampaignRewardRepository,
  CampaignRuleRepository,
  CampaignScheduleRepository,
  CampaignTargetRepository,
  MemberLookupRepository,
} from './repositories';
import { registerCampaignRoutes } from './routes';
import { createCampaignScheduler, type CampaignScheduler } from './schedulers/campaign.scheduler';
import { CampaignService, type RewardBridge } from './services';

export interface CampaignsModule {
  events: CampaignEventBus;
  service: CampaignService;
  scheduler: CampaignScheduler;
}

/** Composition root for the Campaign Management module. */
export function createCampaignsModule(
  db: Database,
  options: { events?: CampaignEventBus; rewardBridge?: RewardBridge } = {},
): CampaignsModule {
  const events = options.events ?? new CampaignEventBus();

  const service = new CampaignService(
    db,
    new CampaignRepository(db),
    new CampaignRuleRepository(db),
    new CampaignRewardRepository(db),
    new CampaignScheduleRepository(db),
    new CampaignTargetRepository(db),
    new CampaignEnrollmentRepository(db),
    new CampaignExecutionRepository(db),
    new CampaignHistoryRepository(db),
    new MemberLookupRepository(db),
    new CampaignAuditRepository(),
    events,
    options.rewardBridge,
  );

  return { events, service, scheduler: createCampaignScheduler(service) };
}

/**
 * Wires Campaign Management into the application: reuses Authentication for the
 * authenticate preHandler, RBAC for permission guards, and the Rewards module
 * (via its public service) to issue campaign rewards — never touching reward
 * tables directly.
 */
export function registerCampaignsModule(app: FastifyInstance): CampaignsModule {
  const rewards = createRewardsModule(app.db);
  const rewardBridge: RewardBridge = {
    async allocate(memberId, params, actor) {
      const txn = await rewards.service.allocate(
        memberId,
        {
          points: params.points,
          ...(params.programId ? { programId: params.programId } : {}),
          description: params.description,
        },
        actor,
      );
      return txn.id;
    },
  };

  const module = createCampaignsModule(app.db, { rewardBridge });

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerCampaignRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { CampaignEventBus } from './events';
export type { CampaignEvent, CampaignEventType, CampaignEventHandler } from './events';
export { CampaignService } from './services';
export type { RewardBridge } from './services';
export { createCampaignScheduler } from './schedulers/campaign.scheduler';
export type {
  CampaignSummary,
  CampaignDetail,
  CampaignEnrollmentData,
  CampaignExecutionData,
  CampaignHistoryData,
  MemberCampaignView,
  PaginatedCampaigns,
  PaginatedEnrollments,
  CampaignStatus,
  CampaignType,
} from './dto';
export { isCampaignOwner, assertCampaignOwner } from './policies';
