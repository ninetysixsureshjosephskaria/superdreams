import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { DepositTrancheRepository } from '@/modules/finance/repositories';
import { NetworkRepository } from '@/modules/network/repositories';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';
import { createWalletModule, type WalletService } from '@/modules/wallet';
import type { WalletRepository } from '@/modules/wallet/repositories';
import { unitsFromCents } from '@/modules/wallet/units';

import {
  ActivationConfigRepository,
  ActivationGrantRepository,
  BonusCampaignRepository,
  BonusClaimRepository,
  CommissionConfigRepository,
  CommissionEarningRepository,
  CommissionTargetRepository,
  CommissionTierRepository,
  DepositLookupRepository,
  EarningsAuditRepository,
  FinancialAccountRepository,
  MemberRelationshipRepository,
  ProfitDistributionCreditRepository,
  ProfitDistributionRepository,
  ProfitScheduleDayRepository,
  ProfitScheduleRepository,
  ReferralJoinRepository,
} from './repositories';
import {
  registerActivationRoutes,
  registerBonusRoutes,
  registerCommissionRoutes,
  registerProfitRoutes,
} from './routes';
import { createProfitDistributionScheduler, type ProfitDistributionScheduler } from './schedulers';
import {
  ActivationBonusService,
  BonusService,
  CommissionService,
  ProfitService,
  type NetworkUnitsPort,
  type PartnerClassifierPort,
} from './services';

export interface EarningsModule {
  commission: CommissionService;
  profit: ProfitService;
  profitScheduler: ProfitDistributionScheduler;
  bonus: BonusService;
  activation: ActivationBonusService;
}

export interface EarningsModuleDeps {
  wallet: WalletService;
  walletRepo: WalletRepository;
  networkUnits: NetworkUnitsPort;
  partners: PartnerClassifierPort;
}

/** Composition root for the Earnings module (Phase 2E — commission, referral, daily profit). */
export function createEarningsModule(db: Database, deps: EarningsModuleDeps): EarningsModule {
  const audit = new EarningsAuditRepository();
  const commission = new CommissionService(
    db,
    deps.wallet,
    deps.walletRepo,
    new CommissionConfigRepository(db),
    new CommissionTierRepository(db),
    new CommissionTargetRepository(db),
    new CommissionEarningRepository(db),
    new DepositLookupRepository(db),
    new MemberRelationshipRepository(db),
    audit,
    deps.networkUnits,
  );
  const profit = new ProfitService(
    db,
    deps.wallet,
    new ProfitScheduleRepository(db),
    new ProfitScheduleDayRepository(db),
    new ProfitDistributionRepository(db),
    new ProfitDistributionCreditRepository(),
    new FinancialAccountRepository(db),
    audit,
    deps.partners,
  );
  const bonus = new BonusService(
    db,
    new BonusCampaignRepository(db),
    new BonusClaimRepository(db),
    new DepositLookupRepository(db),
    new DepositTrancheRepository(db),
    audit,
  );
  const activation = new ActivationBonusService(
    db,
    deps.wallet,
    deps.walletRepo,
    new ActivationConfigRepository(db),
    new ActivationGrantRepository(db),
    new ReferralJoinRepository(db),
    audit,
  );
  return {
    commission,
    profit,
    profitScheduler: createProfitDistributionScheduler(profit),
    bonus,
    activation,
  };
}

/**
 * Wires Earnings into the application. Reuses the wallet module (credit seam +
 * member unit balances), the network module's relationship reads (a partner's
 * downline, for "total network units" tiering), RBAC and Auth.
 */
export function registerEarningsModule(app: FastifyInstance): EarningsModule {
  const walletModule = createWalletModule(app.db);
  const networkRepo = new NetworkRepository(app.db);
  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  const networkUnits: NetworkUnitsPort = {
    totalNetworkUnits: async (partnerMemberId) => {
      // Sum FINANCIAL units across the partner's downline (transitive referrals).
      const seen = new Set<string>([partnerMemberId]);
      let frontier = [partnerMemberId];
      const memberIds: string[] = [];
      let depth = 0;
      while (frontier.length > 0 && depth < 1000) {
        const children = await networkRepo.childrenOf(frontier);
        const next: string[] = [];
        for (const child of children) {
          if (seen.has(child.id)) {
            continue;
          }
          seen.add(child.id);
          memberIds.push(child.id);
          next.push(child.id);
        }
        frontier = next;
        depth += 1;
      }
      let total = 0;
      for (const memberId of memberIds) {
        const wallet = await walletModule.repositories.wallets.findByMemberId(
          memberId,
          'FINANCIAL',
        );
        if (wallet) {
          const balance = await walletModule.service.getBalance(wallet.id);
          total += unitsFromCents(balance.availableMinor);
        }
      }
      return total;
    },
  };

  const partners: PartnerClassifierPort = {
    partnerMemberIds: async () => new Set(await networkRepo.distinctPartnerIds()),
  };

  const module = createEarningsModule(app.db, {
    wallet: walletModule.service,
    walletRepo: walletModule.repositories.wallets,
    networkUnits,
    partners,
  });
  registerCommissionRoutes(app, { service: module.commission, authenticate, guardDeps });
  registerProfitRoutes(app, { service: module.profit, authenticate, guardDeps });
  registerBonusRoutes(app, { service: module.bonus, authenticate, guardDeps });
  registerActivationRoutes(app, { service: module.activation, authenticate, guardDeps });
  return module;
}

export { CommissionService, ProfitService, BonusService, ActivationBonusService } from './services';
export type { NetworkUnitsPort, PartnerClassifierPort } from './services';
export { createProfitDistributionScheduler, createActivationSweepScheduler } from './schedulers';
export type { ProfitDistributionScheduler, ActivationSweepScheduler } from './schedulers';
export { createDepositEarningsHandler } from './orchestration/deposit-earnings.orchestrator';
export type {
  DepositEarningsHandlerDeps,
  EarningsErrorReporter,
  EarningsStage,
} from './orchestration/deposit-earnings.orchestrator';
export type {
  EarningsActor,
  CommissionTierData,
  CommissionTargetData,
  CommissionConfigView,
  DepositEarningsResult,
  ProfitScheduleView,
  ProfitScheduleDayView,
  ProfitDistributionResult,
  BonusCampaignData,
  BonusApplicationResult,
  ActivationConfigData,
  ActivationGrantResult,
} from './dto';
