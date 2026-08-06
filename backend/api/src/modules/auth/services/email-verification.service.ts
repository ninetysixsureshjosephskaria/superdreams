import { config } from '@/config';
import { UnauthorizedError } from '@/errors';
import type { IdentityModule } from '@/modules/identity';

import type { EmailVerificationTokenRepository } from '../repositories';
import { generateOpaqueToken, hashToken } from '../utils/tokens';

/** Email verification foundation. Generates/consumes tokens; sends no email. */
export class EmailVerificationService {
  public constructor(
    private readonly identity: IdentityModule,
    private readonly verificationTokens: EmailVerificationTokenRepository,
  ) {}

  /** Creates a verification token (no email sent). Returns the raw token. */
  public async requestVerification(userId: string): Promise<string> {
    const raw = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + config.auth.verifyTtlSeconds * 1000);
    await this.verificationTokens.create(userId, hashToken(raw), expiresAt);
    return raw;
  }

  public async verifyEmail(token: string): Promise<void> {
    const row = await this.verificationTokens.findByHash(hashToken(token));
    if (!row || row.verifiedAt !== null || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Invalid or expired verification token.');
    }
    await this.verificationTokens.markVerified(row.id);
    // Activate the account: mark the email verified and promote PENDING → ACTIVE.
    await this.identity.repositories.users.update(row.userId, {
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    });
  }
}
