import type { FastifyReply, FastifyRequest } from 'fastify';

import { config } from '@/config';
import { UnauthorizedError } from '@/errors';
import type { UserResponse } from '@/modules/identity';
import { sendSuccess } from '@/utils';

import type { LoginResult, RequestContext } from '../dto';
import { requireAuth } from '../guards';
import type {
  AuthService,
  EmailVerificationService,
  PasswordService,
  RegistrationService,
  SessionService,
} from '../services';
import { revokeSessionSchema, sessionParamsSchema, verifyEmailSchema } from '../validators';

interface TokenPayload {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken: string;
}

interface LoginPayload extends TokenPayload {
  user: UserResponse;
  session: { id: string; expiresAt: Date };
}

function requestContextFrom(request: FastifyRequest): RequestContext {
  const userAgent = request.headers['user-agent'];
  return {
    ipAddress: request.ip.length > 0 ? request.ip : null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
  };
}

/**
 * HTTP boundary for authentication. Validation happens in services (Zod);
 * controllers translate requests/responses and manage the refresh cookie.
 */
export class AuthController {
  public constructor(
    private readonly auth: AuthService,
    private readonly password: PasswordService,
    private readonly emailVerification: EmailVerificationService,
    private readonly sessions: SessionService,
    private readonly registration: RegistrationService,
  ) {}

  /** Sign up: creates a PENDING account and sends the activation email. */
  public register = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const result = await this.registration.register(request.body);
    const payload: { message: string; email: string; verificationToken?: string } = {
      message: 'Account created. Check your email to activate your account.',
      email: result.email,
    };
    // Delivery is handled by the email provider; expose the raw token only outside
    // production so the flow is testable locally without an inbox.
    if (!config.app.isProduction) {
      payload.verificationToken = result.verificationToken;
    }
    return sendSuccess(reply, payload, 201);
  };

  /** Resend the activation email (idempotent; never discloses account existence). */
  public resendVerification = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const token = await this.registration.resendVerification(request.body);
    const payload: { message: string; verificationToken?: string } = {
      message: 'If the account exists and is not yet verified, an activation email has been sent.',
    };
    if (!config.app.isProduction && token !== null) {
      payload.verificationToken = token;
    }
    return sendSuccess(reply, payload);
  };

  public login = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const result = await this.auth.login(request.body, requestContextFrom(request));
    this.setRefreshCookie(reply, result.tokens.refreshToken);
    return sendSuccess(reply, this.toLoginPayload(result));
  };

  public refresh = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const rawToken = this.readRefreshToken(request);
    const result = await this.sessions.rotateRefreshToken(rawToken);
    this.setRefreshCookie(reply, result.tokens.refreshToken);
    const payload: TokenPayload = {
      accessToken: result.tokens.accessToken,
      tokenType: 'Bearer',
      expiresIn: result.tokens.expiresIn,
      refreshToken: result.tokens.refreshToken,
    };
    return sendSuccess(reply, payload);
  };

  public logout = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const context = requireAuth(request);
    await this.auth.logout(context.userId, context.sessionId);
    this.clearRefreshCookie(reply);
    return sendSuccess(reply, { revoked: true });
  };

  public me = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const user = await this.auth.me(context.userId);
    return sendSuccess(reply, { user });
  };

  public forgotPassword = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const token = await this.password.forgotPassword(request.body);
    const payload: { message: string; resetToken?: string } = {
      message: 'If the email exists, password reset instructions have been sent.',
    };
    // Delivery (email) is a later phase; expose the raw token only outside production.
    if (!config.app.isProduction && token !== null) {
      payload.resetToken = token;
    }
    return sendSuccess(reply, payload);
  };

  public resetPassword = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    await this.password.resetPassword(request.body);
    return sendSuccess(reply, { message: 'Password has been reset. Please sign in again.' });
  };

  public changePassword = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    await this.password.changePassword(context.userId, request.body);
    this.clearRefreshCookie(reply);
    return sendSuccess(reply, { message: 'Password changed. Please sign in again.' });
  };

  public verifyEmail = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { token } = verifyEmailSchema.parse(request.body);
    await this.emailVerification.verifyEmail(token);
    return sendSuccess(reply, { verified: true });
  };

  public listSessions = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const sessions = await this.sessions.listSessions(context.userId, context.sessionId);
    return sendSuccess(reply, { sessions });
  };

  public revokeSession = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const { sessionId } = revokeSessionSchema.parse(request.body);
    await this.sessions.revokeSession(context.userId, sessionId);
    return sendSuccess(reply, { revoked: true });
  };

  public deleteSession = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const { id } = sessionParamsSchema.parse(request.params);
    await this.sessions.revokeSession(context.userId, id);
    return sendSuccess(reply, { revoked: true });
  };

  private toLoginPayload(result: LoginResult): LoginPayload {
    return {
      user: result.user,
      session: result.session,
      accessToken: result.tokens.accessToken,
      tokenType: 'Bearer',
      expiresIn: result.tokens.expiresIn,
      refreshToken: result.tokens.refreshToken,
    };
  }

  private readRefreshToken(request: FastifyRequest): string {
    const cookie = request.cookies[config.auth.cookie.name];
    if (typeof cookie === 'string' && cookie.length > 0) {
      return cookie;
    }
    const body: unknown = request.body;
    if (body !== null && typeof body === 'object' && 'refreshToken' in body) {
      const value = (body as { refreshToken?: unknown }).refreshToken;
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    throw new UnauthorizedError('Refresh token is required.');
  }

  private setRefreshCookie(reply: FastifyReply, token: string): void {
    reply.setCookie(config.auth.cookie.name, token, {
      httpOnly: true,
      secure: config.auth.cookie.secure,
      sameSite: config.auth.cookie.sameSite,
      path: '/api/v1/auth',
      maxAge: config.auth.refreshTtlSeconds,
    });
  }

  private clearRefreshCookie(reply: FastifyReply): void {
    reply.clearCookie(config.auth.cookie.name, { path: '/api/v1/auth' });
  }
}
