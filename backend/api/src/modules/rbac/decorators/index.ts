import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import type { AuthContext } from '@/modules/auth';
import { requireAuth } from '@/modules/auth/guards';

import { requireAllPermissions, requirePermission, requireRole, type GuardDeps } from '../guards';

/**
 * Route-protection helpers with ergonomic names. `RequirePermission` requires all
 * listed permissions; pass one for a single-permission check.
 */
export function RequirePermission(deps: GuardDeps, ...keys: string[]): preHandlerAsyncHookHandler {
  if (keys.length === 1) {
    const [only] = keys;
    return requirePermission(deps, only ?? '');
  }
  return requireAllPermissions(deps, keys);
}

export function RequireRole(deps: GuardDeps, roleKey: string): preHandlerAsyncHookHandler {
  return requireRole(deps, roleKey);
}

/** Returns the authenticated principal (throws if unauthenticated). */
export function currentUser(request: FastifyRequest): AuthContext {
  return requireAuth(request);
}

/** Effective permission keys resolved for the request (empty if not loaded). */
export function currentPermissions(request: FastifyRequest): string[] {
  return request.authz?.permissionKeys ?? [];
}

/** Effective role keys resolved for the request (empty if not loaded). */
export function currentRoles(request: FastifyRequest): string[] {
  return request.authz?.roleKeys ?? [];
}
