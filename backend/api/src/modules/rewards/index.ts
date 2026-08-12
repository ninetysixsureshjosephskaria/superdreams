import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import {
  createPartnerReferralModule,
  partnerReferralDeps,
  type PartnerReferralModule,
} from '@/modules/partner-referral';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';
import { createSettingsModule } from '@/modules/settings';
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
import { RewardService, type PartnerReferralReversalPort, type WalletBridge } from './services';

export interface RewardsModule {
  events: RewardEventBus;
  service: RewardService;
  expiryScheduler: RewardExpiryScheduler;
}

/** Composition root for the Rewards Management module. */
export function createRewardsModule(
  db: Database,
  options: {
    events?: RewardEventBus;
    walletBridge?: WalletBridge;
    referralReversal?: PartnerReferralReversalPort;
  } = {},
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
    options.referralReversal,
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

  const rbac = createRbacModule(app.db, { redis: app.redis });
  const settings = createSettingsModule(app.db);

  // P3: when an admin reverses a qualifying member EARN, the partner referral it
  // produced is clawed back in the SAME reversal transaction. Late-bound via a
  // holder because the referral service (built below) needs this rewards service's
  // seams — the port is only ever invoked at request time, long after wiring.
  const referralHolder: { module?: PartnerReferralModule } = {};
  const referralReversal: PartnerReferralReversalPort = {
    onSourceReversed: (tx, sourceTransactionId, actor) =>
      referralHolder.module
        ? referralHolder.module.service.onSourceReversed(tx, sourceTransactionId, actor)
        : Promise.resolve(),
  };

  const module = createRewardsModule(app.db, { walletBridge, referralReversal });

  referralHolder.module = createPartnerReferralModule(
    app.db,
    partnerReferralDeps(module.service, {
      authorization: rbac.authorization,
      settings: settings.service,
    }),
  );

  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  registerRewardRoutes(app, { service: module.service, authenticate, guardDeps });
  return module;
}

export { RewardEventBus } from './events';
export type { RewardEvent, RewardEventType, RewardEventHandler } from './events';
export { RewardService } from './services';
export type { WalletBridge, PartnerReferralReversalPort } from './services';
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
