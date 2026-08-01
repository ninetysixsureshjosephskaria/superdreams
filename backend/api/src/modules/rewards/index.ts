import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';
import { createWalletModule } from '@/modules/wallet';

import { RewardEventBus } from './events';
import {
  MemberLookupRepository,
  MemberRewardRepository,
  RewardAdjustmentRepository,
  RewardAuditRepository,
  RewardCategoryRepository,
  RewardExpiryRuleRepository,
  RewardHistoryRepository,
  RewardProgramRepository,
  RewardRedemptionRepository,
  RewardRuleRepository,
  RewardTransactionRepository,
} from './repositories';
import { registerRewardRoutes } from './routes';
import {
  createRewardExpiryScheduler,
  type RewardExpiryScheduler,
} from './schedulers/expiry.scheduler';
import { RewardService, type WalletBridge } from './services';

export interface RewardsModule {
  events: RewardEventBus;
  service: RewardService;
  expiryScheduler: RewardExpiryScheduler;
}

/** Composition root for the Rewards Management module. */
export function createRewardsModule(
  db: Database,
  options: { events?: RewardEventBus; walletBridge?: WalletBridge } = {},
): RewardsModule {
  const events = options.events ?? new RewardEventBus();

  const service = new RewardService(
    db,
    new RewardProgramRepository(db),
    new RewardRuleRepository(db),
    new RewardCategoryRepository(db),
    new RewardExpiryRuleRepository(db),
    new MemberRewardRepository(db),
    new RewardTransactionRepository(db),
    new RewardRedemptionRepository(db),
    new RewardAdjustmentRepository(db),
    new RewardHistoryRepository(db),
    new MemberLookupRepository(db),
    new RewardAuditRepository(),
    events,
    options.walletBridge,
  );

  return { events, service, expiryScheduler: createRewardExpiryScheduler(service) };
}

/**
 * Wires Rewards Management into the application: reuses Authentication for the
 * authenticate preHandler, RBAC for permission guards, and the Wallet module
 * (via its public API) for optional redemption-to-wallet credits.
 */
export function registerRewardsModule(app: FastifyInstance): RewardsModule {
  const wallet = createWalletModule(app.db);
  const walletBridge: WalletBridge = {
    async creditMember(memberId, amountMinor, actor) {
      const memberWallet = await wallet.repositories.wallets.findByMemberId(memberId);
      if (!memberWallet || memberWallet.status !== 'ACTIVE') {
        return null;
      }
      const txn = await wallet.service.credit(
        memberWallet.id,
        { amountMinor, description: 'Reward redemption credit' },
        actor,
      );
      return txn.id;
    },
  };

  const module = createRewardsModule(app.db, { walletBridge });

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerRewardRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { RewardEventBus } from './events';
export type { RewardEvent, RewardEventType, RewardEventHandler } from './events';
export { RewardService } from './services';
export type { WalletBridge } from './services';
export { createRewardExpiryScheduler } from './schedulers/expiry.scheduler';
export type {
  RewardProgramSummary,
  RewardProgramDetail,
  MemberRewardBalance,
  RewardTransactionData,
  RewardRedemptionData,
  PaginatedPrograms,
  PaginatedTransactions,
  RewardProgramStatus,
  RewardTransactionType,
  RewardDirection,
} from './dto';
export { isRewardOwner, assertRewardOwner } from './policies';
