import type { FastifyRequest } from 'fastify';

import { UnauthorizedError } from '@/errors';

import type { AuthContext } from '../middleware';

/**
 * Returns the authenticated context, or throws when absent. Use inside handlers
 * guarded by {@link createAuthenticate}. This is presence-only — no permission
 * or role checks (those belong to a later phase).
 */
export function requireAuth(request: FastifyRequest): AuthContext {
  if (!request.auth) {
    throw new UnauthorizedError('Authentication required.');
  }
  return request.auth;
}
