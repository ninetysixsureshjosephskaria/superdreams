import type { preHandlerAsyncHookHandler } from 'fastify';

import type { AuthorizationService } from '../services';

/**
 * Reusable authorization middleware: when the request is authenticated, resolves
 * and attaches the caller's effective authorization to `request.authz` so guards
 * and `currentPermissions()` can read it without re-resolving. Never rejects.
 */
export function loadPermissions(authorization: AuthorizationService): preHandlerAsyncHookHandler {
  return async (request) => {
    if (request.auth && !request.authz) {
      request.authz = await authorization.getEffective(request.auth.userId);
    }
  };
}
