import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { UnauthorizedError } from '@/errors';

import type { SessionService } from '../services';
import type { TokenService } from '../strategies/jwt.strategy';

export interface AuthContext {
  userId: string;
  sessionId: string;
}

export interface AuthenticateDeps {
  tokens: TokenService;
  sessions: SessionService;
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

async function resolveContext(
  request: FastifyRequest,
  deps: AuthenticateDeps,
): Promise<AuthContext | null> {
  const token = extractBearerToken(request);
  if (token === null) {
    return null;
  }

  let subject: string;
  let sessionId: string;
  try {
    const claims = await deps.tokens.verifyAccessToken(token);
    subject = claims.sub;
    sessionId = claims.sid;
  } catch {
    return null;
  }

  const session = await deps.sessions.validateSession(sessionId);
  if (!session || session.userId !== subject) {
    return null;
  }
  return { userId: subject, sessionId };
}

/** Requires a valid access token backed by an active, matching session. */
export function createAuthenticate(deps: AuthenticateDeps): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const context = await resolveContext(request, deps);
    if (context === null) {
      throw new UnauthorizedError('Authentication required.');
    }
    request.auth = context;
  };
}

/** Populates `request.auth` when a valid token is present; never rejects. */
export function createOptionalAuthenticate(deps: AuthenticateDeps): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest): Promise<void> => {
    request.auth = await resolveContext(request, deps);
  };
}
