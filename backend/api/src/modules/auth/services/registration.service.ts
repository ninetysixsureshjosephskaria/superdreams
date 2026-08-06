import type { EmailService } from '@/email';
import type { IdentityModule } from '@/modules/identity';

import { registerSchema, resendVerificationSchema } from '../validators';
import type { EmailVerificationService } from './email-verification.service';

export interface RegistrationResult {
  userId: string;
  email: string;
  /**
   * Raw verification token. Returned so the controller can surface it OUTSIDE
   * production for local testing; it is never returned to clients in production.
   */
  verificationToken: string;
}

/**
 * Self-service member sign-up. Reuses the Identity module to create a PENDING,
 * unverified account and the existing email-verification token infrastructure,
 * then sends the activation email via the configured {@link EmailService}.
 */
export class RegistrationService {
  public constructor(
    private readonly identity: IdentityModule,
    private readonly emailVerification: EmailVerificationService,
    private readonly email: EmailService,
  ) {}

  public async register(input: unknown): Promise<RegistrationResult> {
    const data = registerSchema.parse(input);
    // Creates a PENDING (unverified) account; throws ConflictError on duplicate email.
    const user = await this.identity.users.createUser({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    const token = await this.emailVerification.requestVerification(user.id);
    await this.email.sendVerificationEmail(user.email, user.firstName ?? data.firstName, token);
    return { userId: user.id, email: user.email, verificationToken: token };
  }

  /**
   * Re-issues and resends the activation email. Returns the raw token when a
   * fresh one was issued, or `null` when the account is unknown or already
   * verified — the caller must not disclose which to clients.
   */
  public async resendVerification(input: unknown): Promise<string | null> {
    const data = resendVerificationSchema.parse(input);
    const userRow = await this.identity.repositories.users.findByEmail(data.email);
    if (!userRow || userRow.emailVerifiedAt !== null) {
      return null;
    }
    const token = await this.emailVerification.requestVerification(userRow.id);
    await this.email.sendVerificationEmail(userRow.email, userRow.firstName, token);
    return token;
  }
}
