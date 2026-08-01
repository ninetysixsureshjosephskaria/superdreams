import type { FastifyInstance } from 'fastify';

import type { Database } from '@/database';
import { createIdentityModule, type IdentityModule } from '@/modules/identity';

import { AuthEventBus } from './events';
import {
  DeviceRepository,
  EmailVerificationTokenRepository,
  LoginHistoryRepository,
  PasswordHistoryRepository,
  PasswordResetTokenRepository,
  RefreshTokenRepository,
  SessionRepository,
} from './repositories';
import { registerAuthRoutes } from './routes';
import { AuthService, EmailVerificationService, PasswordService, SessionService } from './services';
import { TokenService } from './strategies/jwt.strategy';

export interface AuthModule {
  events: AuthEventBus;
  tokens: TokenService;
  sessions: SessionService;
  auth: AuthService;
  password: PasswordService;
  emailVerification: EmailVerificationService;
}

/**
 * Composition root for the authentication module. Reuses the Identity module for
 * all user/credential concerns; owns only session, token and password lifecycle.
 */
export function createAuthModule(
  db: Database,
  identity: IdentityModule = createIdentityModule(db),
  events: AuthEventBus = new AuthEventBus(),
): AuthModule {
  const sessionRepository = new SessionRepository(db);
  const deviceRepository = new DeviceRepository(db);
  const refreshTokenRepository = new RefreshTokenRepository(db);
  const loginHistoryRepository = new LoginHistoryRepository(db);
  const passwordHistoryRepository = new PasswordHistoryRepository(db);
  const resetTokenRepository = new PasswordResetTokenRepository(db);
  const verificationTokenRepository = new EmailVerificationTokenRepository(db);

  const tokens = new TokenService();
  const sessions = new SessionService(
    sessionRepository,
    deviceRepository,
    refreshTokenRepository,
    tokens,
    events,
  );
  const auth = new AuthService(identity, sessions, loginHistoryRepository, events);
  const password = new PasswordService(
    identity,
    resetTokenRepository,
    passwordHistoryRepository,
    sessions,
    events,
  );
  const emailVerification = new EmailVerificationService(identity, verificationTokenRepository);

  return { events, tokens, sessions, auth, password, emailVerification };
}

/**
 * Wires the authentication module into the application: decorates the request
 * with the (initially empty) auth context and registers the auth routes.
 */
export function registerAuthModule(app: FastifyInstance): AuthModule {
  const module = createAuthModule(app.db);
  app.decorateRequest('auth', null);
  registerAuthRoutes(app, module);
  return module;
}

export { AuthEventBus } from './events';
export type { AuthEvent, AuthEventType, AuthEventHandler } from './events';
export type { AuthContext } from './middleware';
export { TokenService } from './strategies/jwt.strategy';
export type {
  AuthTokens,
  LoginResult,
  SessionSummary,
  RequestContext as AuthRequestContext,
} from './dto';
