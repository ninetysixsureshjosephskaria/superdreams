import { config } from '@/config';
import { NotFoundError, UnauthorizedError } from '@/errors';

import type { AuthTokens, SessionSummary } from '../dto';
import type { AuthEventBus } from '../events';
import type {
  DeviceRepository,
  RefreshTokenRepository,
  SessionRepository,
  SessionRow,
} from '../repositories';
import type { TokenService } from '../strategies/jwt.strategy';
import { generateOpaqueToken, hashToken } from '../utils/tokens';

export interface CreateSessionContext {
  ipAddress: string | null;
  userAgent: string | null;
  deviceId?: string | undefined;
  deviceName?: string | undefined;
}

export interface SessionWithTokens {
  session: { id: string; expiresAt: Date };
  tokens: AuthTokens;
}

export interface RotationResult {
  userId: string;
  sessionId: string;
  tokens: AuthTokens;
}

/**
 * Owns session lifecycle and refresh-token issuance/rotation. Refresh tokens are
 * opaque, stored only as SHA-256 hashes, rotated on every use, and old tokens
 * are revoked. Presenting an already-used token triggers full session revocation
 * (theft detection).
 */
export class SessionService {
  public constructor(
    private readonly sessions: SessionRepository,
    private readonly devices: DeviceRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
    private readonly events: AuthEventBus,
  ) {}

  public async createSession(
    userId: string,
    context: CreateSessionContext,
  ): Promise<SessionWithTokens> {
    let deviceRowId: string | null = null;
    if (context.deviceId !== undefined) {
      const device = await this.devices.ensureDevice(
        userId,
        context.deviceId,
        context.deviceName ?? null,
        context.userAgent,
      );
      deviceRowId = device.id;
    }

    const expiresAt = new Date(Date.now() + config.auth.refreshTtlSeconds * 1000);
    const session = await this.sessions.create({
      userId,
      deviceId: deviceRowId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      expiresAt,
    });

    const tokens = await this.issueTokens(userId, session.id, expiresAt);
    return { session: { id: session.id, expiresAt }, tokens };
  }

  public async rotateRefreshToken(rawToken: string): Promise<RotationResult> {
    const tokenRow = await this.refreshTokens.findByHash(hashToken(rawToken));
    if (!tokenRow) {
      throw new UnauthorizedError('Invalid refresh token.');
    }

    // Reuse detection: a used/revoked token presented again implies theft.
    if (tokenRow.usedAt !== null || tokenRow.revokedAt !== null) {
      await this.refreshTokens.revokeAllForSession(tokenRow.sessionId);
      await this.sessions.revoke(tokenRow.sessionId);
      await this.events.publish({
        type: 'RefreshTokenReuseDetected',
        userId: tokenRow.userId,
        sessionId: tokenRow.sessionId,
        at: new Date(),
      });
      throw new UnauthorizedError('Refresh token reuse detected. The session has been revoked.');
    }

    if (tokenRow.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Refresh token has expired.');
    }

    const session = await this.sessions.findActiveById(tokenRow.sessionId);
    if (!session) {
      throw new UnauthorizedError('Session is no longer active.');
    }

    const raw = generateOpaqueToken();
    const replacement = await this.refreshTokens.create({
      userId: session.userId,
      sessionId: session.id,
      tokenHash: hashToken(raw),
      expiresAt: session.expiresAt,
    });
    await this.refreshTokens.markRotated(tokenRow.id, replacement.id);
    await this.sessions.touch(session.id);

    const accessToken = await this.tokens.signAccessToken({ sub: session.userId, sid: session.id });
    await this.events.publish({
      type: 'TokenRefreshed',
      userId: session.userId,
      sessionId: session.id,
      at: new Date(),
    });

    return {
      userId: session.userId,
      sessionId: session.id,
      tokens: { accessToken, refreshToken: raw, expiresIn: config.auth.accessTtlSeconds },
    };
  }

  public async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessions.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundError('Session not found.');
    }
    await this.refreshTokens.revokeAllForSession(sessionId);
    await this.sessions.revoke(sessionId);
    await this.events.publish({ type: 'SessionRevoked', userId, sessionId, at: new Date() });
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    const active = await this.sessions.listActiveByUser(userId);
    for (const session of active) {
      await this.refreshTokens.revokeAllForSession(session.id);
      await this.sessions.revoke(session.id);
    }
  }

  public async listSessions(
    userId: string,
    currentSessionId: string | null,
  ): Promise<SessionSummary[]> {
    const active = await this.sessions.listActiveByUser(userId);
    return active.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      current: session.id === currentSessionId,
    }));
  }

  public async validateSession(sessionId: string): Promise<SessionRow | null> {
    return this.sessions.findActiveById(sessionId);
  }

  private async issueTokens(
    userId: string,
    sessionId: string,
    expiresAt: Date,
  ): Promise<AuthTokens> {
    const raw = generateOpaqueToken();
    await this.refreshTokens.create({ userId, sessionId, tokenHash: hashToken(raw), expiresAt });
    const accessToken = await this.tokens.signAccessToken({ sub: userId, sid: sessionId });
    return { accessToken, refreshToken: raw, expiresIn: config.auth.accessTtlSeconds };
  }
}
