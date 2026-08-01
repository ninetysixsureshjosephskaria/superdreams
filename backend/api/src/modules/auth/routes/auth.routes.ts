import type { FastifyInstance, FastifySchema } from 'fastify';

import type { AuthModule } from '..';
import { AuthController } from '../controllers';
import { createAuthenticate } from '../middleware';

const AUTH_PREFIX = '/api/v1/auth';

const secured = [{ bearerAuth: [] }];

const loginSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Authenticate with email and password',
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
      deviceId: { type: 'string' },
      deviceName: { type: 'string' },
      rememberMe: { type: 'boolean' },
    },
  },
};

const refreshSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Rotate the refresh token and issue a new access token',
  description: 'Reads the refresh token from the httpOnly cookie or the request body.',
  body: {
    type: 'object',
    properties: { refreshToken: { type: 'string' } },
  },
};

const logoutSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Revoke the current session',
  security: secured,
};

const meSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Get the currently authenticated user',
  security: secured,
};

const forgotPasswordSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Request a password reset token',
  body: {
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } },
  },
};

const resetPasswordSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Reset a password using a reset token',
  body: {
    type: 'object',
    required: ['token', 'password'],
    properties: {
      token: { type: 'string' },
      password: { type: 'string' },
    },
  },
};

const changePasswordSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Change the current password',
  security: secured,
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string' },
      newPassword: { type: 'string' },
    },
  },
};

const verifyEmailSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Verify an email address using a verification token',
  body: {
    type: 'object',
    required: ['token'],
    properties: { token: { type: 'string' } },
  },
};

const listSessionsSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'List active sessions for the current user',
  security: secured,
};

const revokeSessionSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Revoke a session by id',
  security: secured,
  body: {
    type: 'object',
    required: ['sessionId'],
    properties: { sessionId: { type: 'string', format: 'uuid' } },
  },
};

const deleteSessionSchema: FastifySchema = {
  tags: ['Auth'],
  summary: 'Revoke a session by id (REST form)',
  security: secured,
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
};

/**
 * Registers all authentication routes under `/api/v1/auth`.
 */
export function registerAuthRoutes(app: FastifyInstance, module: AuthModule): void {
  const controller = new AuthController(
    module.auth,
    module.password,
    module.emailVerification,
    module.sessions,
  );
  const authenticate = createAuthenticate({ tokens: module.tokens, sessions: module.sessions });

  app.register(
    (instance, _options, done) => {
      instance.post('/login', { schema: loginSchema }, controller.login);
      instance.post('/refresh', { schema: refreshSchema }, controller.refresh);
      instance.post(
        '/logout',
        { schema: logoutSchema, preHandler: authenticate },
        controller.logout,
      );
      instance.get('/me', { schema: meSchema, preHandler: authenticate }, controller.me);

      instance.post(
        '/forgot-password',
        { schema: forgotPasswordSchema },
        controller.forgotPassword,
      );
      instance.post('/reset-password', { schema: resetPasswordSchema }, controller.resetPassword);
      instance.post(
        '/change-password',
        { schema: changePasswordSchema, preHandler: authenticate },
        controller.changePassword,
      );
      instance.post('/verify-email', { schema: verifyEmailSchema }, controller.verifyEmail);

      instance.get(
        '/sessions',
        { schema: listSessionsSchema, preHandler: authenticate },
        controller.listSessions,
      );
      instance.post(
        '/revoke-session',
        { schema: revokeSessionSchema, preHandler: authenticate },
        controller.revokeSession,
      );
      instance.delete(
        '/sessions/:id',
        { schema: deleteSessionSchema, preHandler: authenticate },
        controller.deleteSession,
      );

      done();
    },
    { prefix: AUTH_PREFIX },
  );
}
