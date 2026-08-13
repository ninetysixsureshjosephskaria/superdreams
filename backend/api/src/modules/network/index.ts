import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { ConflictError } from '@/errors';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, type GuardDeps } from '@/modules/rbac';
import { createWalletModule } from '@/modules/wallet';
import { unitsFromCents } from '@/modules/wallet/units';

import { NetworkEventBus } from './events';
import {
  InviteRepository,
  MemberLookupRepository,
  NetworkAuditRepository,
  NetworkRepository,
} from './repositories';
import { registerNetworkRoutes } from './routes';
import {
  InviteService,
  NetworkService,
  type InvitedAccountProvisionerPort,
  type RoleAssignerPort,
  type UnitsProviderPort,
} from './services';

export interface NetworkModule {
  events: NetworkEventBus;
  network: NetworkService;
  invites: InviteService;
  repositories: {
    invites: InviteRepository;
    network: NetworkRepository;
  };
}

export interface NetworkModuleDeps {
  units: UnitsProviderPort;
  roleAssigner: RoleAssignerPort;
  /** Auth-backed account provisioner enabling invitation-based onboarding (M1a). */
  provisioner?: InvitedAccountProvisionerPort;
  events?: NetworkEventBus;
}

/** Composition root for the Network / referrals / invites module (Phase 2D). */
export function createNetworkModule(db: Database, deps: NetworkModuleDeps): NetworkModule {
  const events = deps.events ?? new NetworkEventBus();
  const inviteRepo = new InviteRepository(db);
  const networkRepo = new NetworkRepository(db);
  const memberLookup = new MemberLookupRepository(db);
  const audit = new NetworkAuditRepository();

  const network = new NetworkService(networkRepo, memberLookup, deps.units);
  const invites = new InviteService(
    db,
    inviteRepo,
    networkRepo,
    memberLookup,
    audit,
    events,
    deps.roleAssigner,
    deps.provisioner,
  );

  return { events, network, invites, repositories: { invites: inviteRepo, network: networkRepo } };
}

/**
 * Wires Network into the application. Reuses: the wallet module (member unit
 * balance for the network view), the RBAC module (permission guards + idempotent
 * role assignment on invite acceptance), and the Auth module (authenticate).
 */
export function registerNetworkModule(
  app: FastifyInstance,
  deps: { provisioner?: InvitedAccountProvisionerPort } = {},
): NetworkModule {
  const walletModule = createWalletModule(app.db);
  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  const units: UnitsProviderPort = {
    getUnits: async (memberId) => {
      const wallet = await walletModule.repositories.wallets.findByMemberId(memberId, 'FINANCIAL');
      if (!wallet) {
        return 0;
      }
      const balance = await walletModule.service.getBalance(wallet.id);
      return unitsFromCents(balance.availableMinor);
    },
  };

  const roleAssigner: RoleAssignerPort = {
    assignRoleByKey: async (userId, roleKey) => {
      const role = await rbac.repositories.roles.findByKey(roleKey);
      if (!role) {
        return;
      }
      try {
        await rbac.roles.assignRoleToUser(role.id, userId, null);
      } catch (error) {
        if (!(error instanceof ConflictError)) {
          throw error;
        }
      }
    },
  };

  const module = createNetworkModule(app.db, {
    units,
    roleAssigner,
    ...(deps.provisioner ? { provisioner: deps.provisioner } : {}),
  });
  registerNetworkRoutes(app, {
    network: module.network,
    invites: module.invites,
    authenticate,
    guardDeps,
  });
  return module;
}

export { NetworkEventBus } from './events';
export type { NetworkEvent, NetworkEventType, NetworkEventHandler } from './events';
export { NetworkService, InviteService } from './services';
export type {
  UnitsProviderPort,
  RoleAssignerPort,
  InvitedAccountProvisionerPort,
} from './services';
export type {
  NetworkActor,
  InviteData,
  InvitePreview,
  InviteRoleType,
  InviteStatusType,
  PaginatedInvites,
  NetworkMemberNode,
  ReferralSummary,
  PartnerNetworkSummary,
  NetworkMemberDetail,
} from './dto';
