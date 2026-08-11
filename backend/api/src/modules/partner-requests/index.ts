import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createRbacModule, ROLES, type GuardDeps } from '@/modules/rbac';

import { PartnerRequestEventBus } from './events';
import {
  PartnerMemberLookupRepository,
  PartnerRequestAuditRepository,
  PartnerRequestRepository,
} from './repositories';
import { registerPartnerRequestRoutes } from './routes';
import {
  PartnerRequestService,
  type PartnerRoleAssignerPort,
  type PartnerRoleCheckerPort,
} from './services';

export interface PartnerRequestsModule {
  events: PartnerRequestEventBus;
  service: PartnerRequestService;
  repositories: {
    requests: PartnerRequestRepository;
  };
}

export interface PartnerRequestsModuleDeps {
  roleAssigner: PartnerRoleAssignerPort;
  roleChecker: PartnerRoleCheckerPort;
  events?: PartnerRequestEventBus;
}

/** Composition root for the Member→Partner request/approval module (P1.3). */
export function createPartnerRequestsModule(
  db: Database,
  deps: PartnerRequestsModuleDeps,
): PartnerRequestsModule {
  const events = deps.events ?? new PartnerRequestEventBus();
  const requestRepo = new PartnerRequestRepository(db);
  const memberLookup = new PartnerMemberLookupRepository(db);
  const audit = new PartnerRequestAuditRepository();

  const service = new PartnerRequestService(
    db,
    requestRepo,
    memberLookup,
    audit,
    events,
    deps.roleAssigner,
    deps.roleChecker,
  );

  return { events, service, repositories: { requests: requestRepo } };
}

/**
 * Wires the partner-requests module into the application. Reuses the RBAC module
 * for permission guards, the existing idempotent role-assignment mechanism (to
 * grant the `partner` role on approval), and the role check (submit eligibility);
 * and the Auth module for `authenticate`.
 */
export function registerPartnerRequestsModule(app: FastifyInstance): PartnerRequestsModule {
  const authModule = createAuthModule(app.db);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  const rbac = createRbacModule(app.db, { redis: app.redis });
  const guardDeps: GuardDeps = { authorization: rbac.authorization, events: rbac.events };

  const roleAssigner: PartnerRoleAssignerPort = {
    resolvePartnerRoleId: async () => {
      const role = await rbac.repositories.roles.findByKey(ROLES.PARTNER);
      return role ? role.id : null;
    },
    // Idempotent role INSERT through the caller's transaction (rolls back with it).
    assignWithin: (tx, roleId, userId, actorId) =>
      rbac.roles.assignRoleToUserWithin(tx, roleId, userId, actorId),
    // Post-commit only: resolver cache invalidation + RoleAssigned event.
    finalize: (userId, roleId, actorId) =>
      rbac.roles.finalizeRoleAssignment(userId, roleId, actorId),
  };

  const roleChecker: PartnerRoleCheckerPort = {
    isPartner: (userId) => rbac.authorization.hasRole(userId, ROLES.PARTNER),
  };

  const module = createPartnerRequestsModule(app.db, { roleAssigner, roleChecker });
  registerPartnerRequestRoutes(app, {
    service: module.service,
    authenticate,
    guardDeps,
  });
  return module;
}

export { PartnerRequestEventBus } from './events';
export type {
  PartnerRequestEvent,
  PartnerRequestEventType,
  PartnerRequestEventHandler,
} from './events';
export { PartnerRequestService } from './services';
export type { PartnerRoleAssignerPort, PartnerRoleCheckerPort } from './services';
export type {
  PartnerRequestActor,
  PartnerRequestData,
  PartnerRequestStatusType,
  PaginatedPartnerRequests,
} from './dto';
