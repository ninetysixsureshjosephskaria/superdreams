import { config } from '@/config';
import { UnauthorizedError } from '@/errors';
import { verifyPassword, type IdentityModule, type UserResponse } from '@/modules/identity';

import type { LoginResult, RequestContext } from '../dto';
import type { AuthEventBus } from '../events';
import type { LoginHistoryRepository } from '../repositories';
import { loginSchema } from '../validators';
import type { SessionService } from './session.service';

/**
 * Orchestrates authentication using the Identity domain (no duplicated identity
 * logic): credential verification (Argon2id via Identity), account lockout,
 * login history, and session/token issuance.
 */
export class AuthService {
  public constructor(
    private readonly identity: IdentityModule,
    private readonly sessions: SessionService,
    private readonly loginHistory: LoginHistoryRepository,
    private readonly events: AuthEventBus,
  ) {}

  public async login(input: unknown, context: RequestContext): Promise<LoginResult> {
    const data = loginSchema.parse(input);
    await this.assertNotLockedOut(data.email);

    const userRow = await this.identity.repositories.users.findByEmail(data.email);
    if (!userRow || userRow.passwordHash === null) {
      await this.recordFailure(data.email, null, 'invalid_credentials', context);
      throw new UnauthorizedError('Invalid email or password.');
    }
    if (userRow.status === 'SUSPENDED' || userRow.status === 'DEACTIVATED') {
      await this.recordFailure(data.email, userRow.id, 'account_inactive', context);
      throw new UnauthorizedError('This account is not active.');
    }
    const valid = await verifyPassword(userRow.passwordHash, data.password);
    if (!valid) {
      await this.recordFailure(data.email, userRow.id, 'invalid_credentials', context);
      throw new UnauthorizedError('Invalid email or password.');
    }

    await this.loginHistory.record({
      userId: userRow.id,
      email: data.email,
      success: true,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const created = await this.sessions.createSession(userRow.id, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
    });

    const user = await this.requireUser(userRow.id);
    await this.events.publish({
      type: 'LoginSucceeded',
      userId: userRow.id,
      sessionId: created.session.id,
      at: new Date(),
    });
    return { user, session: created.session, tokens: created.tokens };
  }

  public async logout(userId: string, sessionId: string): Promise<void> {
    await this.sessions.revokeSession(userId, sessionId);
    await this.events.publish({ type: 'LogoutCompleted', userId, sessionId, at: new Date() });
  }

  public async me(userId: string): Promise<UserResponse | null> {
    return this.identity.users.getById(userId);
  }

  private async assertNotLockedOut(email: string): Promise<void> {
    const since = new Date(Date.now() - config.auth.lockout.windowSeconds * 1000);
    const failures = await this.loginHistory.countRecentFailures(email, since);
    if (failures >= config.auth.lockout.maxAttempts) {
      throw new UnauthorizedError(
        'Account temporarily locked due to too many failed attempts. Try again later.',
      );
    }
  }

  private async recordFailure(
    email: string,
    userId: string | null,
    reason: string,
    context: RequestContext,
  ): Promise<void> {
    await this.loginHistory.record({
      userId,
      email,
      success: false,
      reason,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.events.publish({ type: 'LoginFailed', email, reason, at: new Date() });
  }

  private async requireUser(userId: string): Promise<UserResponse> {
    const user = await this.identity.users.getById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found.');
    }
    return user;
  }
}
