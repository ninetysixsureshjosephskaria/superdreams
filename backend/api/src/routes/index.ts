import type { FastifyInstance } from 'fastify';

import { ConflictError } from '@/errors';
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
  registerRewardsModule(app);
  registerCampaignsModule(app);
  registerNotificationsModule(app);
  registerReportsModule(app);
  registerSettingsModule(app);
  registerStoreModule(app);
  registerGamesModule(app);
}
