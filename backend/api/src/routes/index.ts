import type { FastifyInstance } from 'fastify';

import { registerHealthRoutes } from '@/health';
import { registerAuthModule } from '@/modules/auth';
import { registerCampaignsModule } from '@/modules/campaigns';
import { registerGamesModule } from '@/modules/games';
import { registerMembersModule } from '@/modules/members';
import { registerNotificationsModule } from '@/modules/notifications';
import { registerRbacModule } from '@/modules/rbac';
import { registerReportsModule } from '@/modules/reports';
import { registerRewardsModule } from '@/modules/rewards';
import { registerSettingsModule } from '@/modules/settings';
import { registerStoreModule } from '@/modules/store';
import { registerWalletModule } from '@/modules/wallet';

import { registerRootRoute } from './root.route';

/**
 * Registers all top-level (non-business) routes for the foundation.
 */
export function registerRoutes(app: FastifyInstance): void {
  registerRootRoute(app);
  registerHealthRoutes(app);
  registerAuthModule(app);
  registerRbacModule(app);
  registerMembersModule(app);
  registerWalletModule(app);
  registerRewardsModule(app);
  registerCampaignsModule(app);
  registerNotificationsModule(app);
  registerReportsModule(app);
  registerSettingsModule(app);
  registerStoreModule(app);
  registerGamesModule(app);
}
