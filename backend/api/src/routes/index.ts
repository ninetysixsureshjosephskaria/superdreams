import type { FastifyInstance } from 'fastify';

import { config } from '@/config';
import { ConflictError } from '@/errors';
import { registerHealthRoutes } from '@/health';
import { registerAuthModule } from '@/modules/auth';
import { registerCampaignsModule } from '@/modules/campaigns';
import { registerCurrenciesModule } from '@/modules/currencies';
import {
  createActivationSweepScheduler,
  createDepositEarningsHandler,
  registerEarningsModule,
} from '@/modules/earnings';
import { createTrancheMaturityScheduler, registerFinanceModule } from '@/modules/finance';
import { registerGamesModule } from '@/modules/games';
import { registerMembersModule } from '@/modules/members';
import { registerNetworkModule } from '@/modules/network';
import { registerNotificationsModule } from '@/modules/notifications';
import { registerPartnerRequestsModule } from '@/modules/partner-requests';
import { registerRbacModule } from '@/modules/rbac';
import { registerReportsModule } from '@/modules/reports';
import { registerRewardsModule } from '@/modules/rewards';
import { registerSettingsModule } from '@/modules/settings';
import { registerStoreModule } from '@/modules/store';
import { registerWalletModule } from '@/modules/wallet';
import { createSchedulerRuntime } from '@/scheduler';

import { registerDebugRoutes } from './debug.route';
import { registerRootRoute } from './root.route';

/**
 * Registers all top-level (non-business) routes for the foundation.
 */
export function registerRoutes(app: FastifyInstance): void {
  registerRootRoute(app);
  registerHealthRoutes(app);
  registerDebugRoutes(app);
  const authModule = registerAuthModule(app);
  const rbacModule = registerRbacModule(app);
  const membersModule = registerMembersModule(app);

  // --- Phase 1: wire cross-module collaborators onto the auth services --------
  // Auth must not import Members/RBAC (they already depend on auth), so the
  // composition root injects concrete adapters for the auth ports here, once
  // every module exists. See modules/auth/services/ports.ts.
  const memberProvisioner = {
    ensureForUser: (input: {
      userId: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      referralCode?: string | undefined;
    }) => membersModule.service.provisionForUser(input),
    activateForUser: (userId: string) => membersModule.service.activateByUserId(userId),
  };
  const roleAssigner = {
    assignRoleByKey: async (userId: string, roleKey: string): Promise<void> => {
      const role = await rbacModule.repositories.roles.findByKey(roleKey);
      if (!role) {
        return; // Role not seeded yet — skip rather than fail sign-up.
      }
      try {
        await rbacModule.roles.assignRoleToUser(role.id, userId, null);
      } catch (error) {
        // Idempotent: ignore "already assigned"; re-throw anything else.
        if (!(error instanceof ConflictError)) {
          throw error;
        }
      }
    },
  };
  const authorizationReader = {
    resolve: async (userId: string): Promise<{ roleKeys: string[]; permissionKeys: string[] }> => {
      const resolved = await rbacModule.resolver.resolve(userId);
      return { roleKeys: [...resolved.roleKeys], permissionKeys: [...resolved.permissionKeys] };
    },
  };
  authModule.registration.setCollaborators({ roleAssigner, memberProvisioner });
  authModule.emailVerification.setMemberProvisioner(memberProvisioner);
  authModule.auth.setAuthorizationReader(authorizationReader);
  // ---------------------------------------------------------------------------

  registerWalletModule(app);
  registerCurrenciesModule(app);
  const financeModule = registerFinanceModule(app);
  registerNetworkModule(app);
  registerPartnerRequestsModule(app);
  const earningsModule = registerEarningsModule(app);

  // --- Deposit approval → earnings orchestration ------------------------------
  // A committed deposit approval (published post-commit on the finance event bus)
  // drives commission/referral, bonus-campaign application and activation-bonus
  // evaluation. Reuses the existing finance bus (no second bus, no HTTP); every
  // stage is independently atomic + idempotent, and a stage failure is logged
  // (never swallowed) without blocking the others or the approval itself.
  financeModule.events.subscribe(
    createDepositEarningsHandler({
      commission: earningsModule.commission,
      bonus: earningsModule.bonus,
      activation: earningsModule.activation,
      reportError: ({ stage, event, error }) =>
        app.log.error(
          { err: error, stage, requestId: event.requestId, memberId: event.memberId },
          'deposit-earnings orchestration stage failed',
        ),
    }),
  );
  // ---------------------------------------------------------------------------

  // --- Background scheduler runtime -------------------------------------------
  // The single host that actually runs the modules' existing (idempotent) job
  // factories: daily-profit distribution, deposit-tranche maturity, and the
  // activation-bonus qualification sweep. Created here (composition root) but
  // NOT started — `buildApp` stays timer-free for tests; the server process
  // starts it after `listen()`. `onClose` stops it for clean shutdown.
  const trancheMaturity = createTrancheMaturityScheduler(financeModule.service);
  const activationSweep = createActivationSweepScheduler(earningsModule.activation);
  const scheduler = createSchedulerRuntime({
    intervalMs: config.scheduler.intervalMs,
    logger: app.log,
    jobs: [
      { name: 'profit-distribution', run: () => earningsModule.profitScheduler.run() },
      { name: 'tranche-maturity', run: () => trancheMaturity.run() },
      { name: 'activation-sweep', run: () => activationSweep.run() },
    ],
  });
  app.decorate('scheduler', scheduler);
  app.addHook('onClose', () => {
    scheduler.stop();
  });
  // ---------------------------------------------------------------------------

  registerRewardsModule(app);
  registerCampaignsModule(app);
  registerNotificationsModule(app);
  registerReportsModule(app);
  registerSettingsModule(app);
  registerStoreModule(app);
  registerGamesModule(app);
}
