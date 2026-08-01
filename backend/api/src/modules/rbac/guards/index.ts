import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { ForbiddenError } from '@/errors';
import { requireAuth } from '@/modules/auth/guards';

import type { ResolvedAuthorization } from '../dto';
import type { AuthorizationMode, RbacEventBus } from '../events';
import type { AuthorizationService } from '../services';

export interface GuardDeps {
  authorization: AuthorizationService;
  events: RbacEventBus;
}

/** Resolves the caller's authorization once per request and memoizes on `request.authz`. */
async function ensureResolved(
  request: FastifyRequest,
  authorization: AuthorizationService,
): Promise<ResolvedAuthorization> {
  if (request.authz) {
    return request.authz;
  }
  const context = requireAuth(request);
  const resolved = await authorization.getEffective(context.userId);
  request.authz = resolved;
  return resolved;
}

async function deny(
  deps: GuardDeps,
  userId: string,
  required: readonly string[],
  mode: AuthorizationMode,
): Promise<never> {
  await deps.events.publish({
    type: 'AuthorizationDenied',
    userId,
    required,
    mode,
    at: new Date(),
  });
  throw new ForbiddenError('You do not have permission to perform this action.');
}

/** Require a single permission. */
export function requirePermission(deps: GuardDeps, key: string): preHandlerAsyncHookHandler {
  return async (request) => {
    const context = requireAuth(request);
    const resolved = await ensureResolved(request, deps.authorization);
    if (!resolved.permissionKeys.includes(key)) {
      await deny(deps, context.userId, [key], 'permission');
    }
  };
}

/** Require every listed permission. */
export function requireAllPermissions(
  deps: GuardDeps,
  keys: readonly string[],
): preHandlerAsyncHookHandler {
  return async (request) => {
    const context = requireAuth(request);
    const resolved = await ensureResolved(request, deps.authorization);
    if (!keys.every((key) => resolved.permissionKeys.includes(key))) {
      await deny(deps, context.userId, keys, 'allPermissions');
    }
  };
}

/** Require at least one of the listed permissions. */
export function requireAnyPermission(
  deps: GuardDeps,
  keys: readonly string[],
): preHandlerAsyncHookHandler {
  return async (request) => {
    const context = requireAuth(request);
    const resolved = await ensureResolved(request, deps.authorization);
    if (!keys.some((key) => resolved.permissionKeys.includes(key))) {
      await deny(deps, context.userId, keys, 'anyPermission');
    }
  };
}

/** Require a specific role. */
export function requireRole(deps: GuardDeps, roleKey: string): preHandlerAsyncHookHandler {
  return async (request) => {
    const context = requireAuth(request);
    const resolved = await ensureResolved(request, deps.authorization);
    if (!resolved.roleKeys.includes(roleKey)) {
      await deny(deps, context.userId, [roleKey], 'role');
    }
  };
}
