import { config } from '@/config';
import type { EmailService } from '@/email';
import { UnauthorizedError, ValidationError } from '@/errors';
import { hashPassword, verifyPassword, type IdentityModule } from '@/modules/identity';

import type { AuthEventBus } from '../events';
import type { PasswordHistoryRepository, PasswordResetTokenRepository } from '../repositories';
import { generateOpaqueToken, hashToken } from '../utils/tokens';
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators';
import type { SessionService } from './session.service';

/** Password lifecycle: forgot/reset (token-based) and authenticated change. */
export class PasswordService {
  public constructor(
    private readonly identity: IdentityModule,
    private readonly resetTokens: PasswordResetTokenRepository,
    private readonly passwordHistory: PasswordHistoryRepository,
    private readonly sessions: SessionService,
    private readonly events: AuthEventBus,
    private readonly email: EmailService,
  ) {}

  /**
   * Creates a reset token. **Sends no email** (delivery is a later phase). Returns
   * the raw token when the user exists, else `null`. Callers must not disclose
   * account existence to clients.
   */
  public async forgotPassword(input: unknown): Promise<string | null> {
    const data = forgotPasswordSchema.parse(input);
    const userRow = await this.identity.repositories.users.findByEmail(data.email);
    if (!userRow) {
      return null;
    }
    await this.resetTokens.invalidateAllForUser(userRow.id);
    const raw = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + config.auth.resetTtlSeconds * 1000);
    await this.resetTokens.create(userRow.id, hashToken(raw), expiresAt);
    await this.email.sendPasswordResetEmail(userRow.email, userRow.firstName, raw);
    await this.events.publish({
      type: 'PasswordResetRequested',
      userId: userRow.id,
      at: new Date(),
    });
    return raw;
  }

  public async resetPassword(input: unknown): Promise<void> {
    const data = resetPasswordSchema.parse(input);
    const row = await this.resetTokens.findByHash(hashToken(data.token));
    if (!row || row.usedAt !== null || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Invalid or expired reset token.');
    }
    await this.assertNotReused(row.userId, data.password);

    const newHash = await hashPassword(data.password);
    await this.identity.repositories.users.update(row.userId, { passwordHash: newHash });
    await this.passwordHistory.record(row.userId, newHash);
    await this.resetTokens.markUsed(row.id);
    await this.sessions.revokeAllForUser(row.userId);
    await this.events.publish({
      type: 'PasswordResetCompleted',
      userId: row.userId,
      at: new Date(),
    });
  }

  public async changePassword(userId: string, input: unknown): Promise<void> {
    const data = changePasswordSchema.parse(input);
    const userRow = await this.identity.repositories.users.findById(userId);
    if (!userRow || userRow.passwordHash === null) {
      throw new UnauthorizedError('User not found.');
    }
    const currentOk = await verifyPassword(userRow.passwordHash, data.currentPassword);
    if (!currentOk) {
      throw new UnauthorizedError('Current password is incorrect.');
    }
    await this.assertNotReused(userId, data.newPassword, userRow.passwordHash);

    const newHash = await hashPassword(data.newPassword);
    await this.identity.repositories.users.update(userId, {
      passwordHash: newHash,
      mustChangePassword: false,
    });
    await this.passwordHistory.record(userId, newHash);
    await this.sessions.revokeAllForUser(userId);
    await this.events.publish({ type: 'PasswordChanged', userId, at: new Date() });
  }

  private async assertNotReused(
    userId: string,
    newPassword: string,
    currentHash?: string,
  ): Promise<void> {
    if (currentHash !== undefined && (await verifyPassword(currentHash, newPassword))) {
      throw new ValidationError('The new password must be different from the current password.');
    }
    const recent = await this.passwordHistory.recentHashes(userId);
    for (const hash of recent) {
      if (await verifyPassword(hash, newPassword)) {
        throw new ValidationError(
          'This password was used recently. Please choose a different one.',
        );
      }
    }
  }
}
