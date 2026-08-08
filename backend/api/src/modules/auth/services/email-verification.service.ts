import { config } from '@/config';
import { UnauthorizedError } from '@/errors';
import type { IdentityModule } from '@/modules/identity';

import type { EmailVerificationTokenRepository } from '../repositories';
import type { MemberProvisioningPort } from './ports';
import { generateOpaqueToken, hashToken } from '../utils/tokens';

/** Email verification foundation. Generates/consumes tokens; sends no email. */
export class EmailVerificationService {
  /** Optional collaborator; injected by the composition root (see ports.ts). */
  private memberProvisioner: MemberProvisioningPort | null = null;

  public constructor(
    private readonly identity: IdentityModule,
    private readonly verificationTokens: EmailVerificationTokenRepository,
  ) {}

  /** Wires the Members adapter after all modules are registered. */
  public setMemberProvisioner(provisioner: MemberProvisioningPort): void {
    this.memberProvisioner = provisioner;
  }

  /**
   * Creates a verification token (no email sent). Returns the raw token. Any
   * previously-issued pending token is invalidated first, so a resend supersedes
   * the earlier activation link (single active token per account — D3).
   */
  public async requestVerification(userId: string): Promise<string> {
    await this.verificationTokens.invalidateAllForUser(userId);
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
    // Mirror activation onto the linked loyalty Member profile (PENDING → ACTIVE).
    await this.memberProvisioner?.activateForUser(row.userId);
  }
}
