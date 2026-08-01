import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';

import { config } from '@/config';
import type { Database } from '@/database';
import { createAuthModule } from '@/modules/auth';
import { createAuthenticate } from '@/modules/auth/middleware';
import { createIdentityModule, type IdentityModule } from '@/modules/identity';

import { RbacEventBus } from './events';
import {
  PermissionRepository,
  RolePermissionRepository,
  RoleRepository,
  UserRoleRepository,
} from './repositories';
import { registerRbacRoutes } from './routes';
import {
  AuthorizationService,
  NoopPermissionCache,
  PermissionResolver,
  PermissionService,
  RedisPermissionCache,
  RoleService,
  type PermissionCache,
} from './services';

export interface RbacModule {
  events: RbacEventBus;
  roles: RoleService;
  permissions: PermissionService;
  authorization: AuthorizationService;
  resolver: PermissionResolver;
  repositories: {
    roles: RoleRepository;
    permissions: PermissionRepository;
    rolePermissions: RolePermissionRepository;
    userRoles: UserRoleRepository;
  };
}

export interface RbacModuleDeps {
  identity?: IdentityModule;
  redis?: Redis;
}

/**
 * Composition root for the RBAC module. Reuses Identity for user existence;
 * permission resolution is centralized and cached (Redis when available).
 */
export function createRbacModule(
  db: Database,
  deps: RbacModuleDeps = {},
  events: RbacEventBus = new RbacEventBus(),
): RbacModule {
  const identity = deps.identity ?? createIdentityModule(db);

  const roleRepository = new RoleRepository(db);
  const permissionRepository = new PermissionRepository(db);
  const rolePermissionRepository = new RolePermissionRepository(db);
  const userRoleRepository = new UserRoleRepository(db);

  const cache: PermissionCache =
    config.rbac.cacheEnabled && deps.redis
      ? new RedisPermissionCache(deps.redis, config.rbac.permissionCacheTtlSeconds)
      : new NoopPermissionCache();

  const resolver = new PermissionResolver(roleRepository, permissionRepository, cache);
  const authorization = new AuthorizationService(resolver);
  const roles = new RoleService(
    identity,
    roleRepository,
    permissionRepository,
    rolePermissionRepository,
    userRoleRepository,
    resolver,
    events,
  );
  const permissions = new PermissionService(permissionRepository);

  return {
    events,
    roles,
    permissions,
    authorization,
    resolver,
    repositories: {
      roles: roleRepository,
      permissions: permissionRepository,
      rolePermissions: rolePermissionRepository,
      userRoles: userRoleRepository,
    },
  };
}

/**
 * Wires RBAC into the application: decorates the request with an (initially
 * empty) resolved-authorization slot and registers the protected routes. Reuses
 * the Authentication module for the authentication preHandler.
 */
export function registerRbacModule(app: FastifyInstance): RbacModule {
  const identity = createIdentityModule(app.db);
  const module = createRbacModule(app.db, { identity, redis: app.redis });

  app.decorateRequest('authz', null);

  const authModule = createAuthModule(app.db, identity);
  const authenticate = createAuthenticate({
    tokens: authModule.tokens,
    sessions: authModule.sessions,
  });
  registerRbacRoutes(app, { module, authenticate });

  return module;
}

export * from './catalog';
export * from './policies';
export { RbacEventBus } from './events';
export type { RbacEvent, RbacEventType, RbacEventHandler, AuthorizationMode } from './events';
export type {
  ResolvedAuthorization,
  RoleResponse,
  PermissionResponse,
  EffectivePermissions,
} from './dto';
export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
} from './guards';
export type { GuardDeps } from './guards';
export { loadPermissions } from './middleware';
export {
  RequirePermission,
  RequireRole,
  currentUser,
  currentPermissions,
  currentRoles,
} from './decorators';
export { syncRbacCatalog } from './seed';
