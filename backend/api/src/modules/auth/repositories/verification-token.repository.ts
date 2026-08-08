import { and, eq, isNull, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { emailVerificationTokens } from '@/database/schema';

export type EmailVerificationTokenRow = InferSelectModel<typeof emailVerificationTokens>;

/** Single-use, expiring email verification tokens (stored hashed). */
export class EmailVerificationTokenRepository {
  public constructor(private readonly db: Database) {}

  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.insert(emailVerificationTokens).values({ userId, tokenHash, expiresAt });
  }

  /**
   * Invalidates every still-pending (unverified) activation token for a user by
   * deleting it. Called before issuing a new token so a resend supersedes the
   * previous activation link (single active token per account).
   */
  public async invalidateAllForUser(userId: string): Promise<void> {
    await this.db
      .delete(emailVerificationTokens)
      .where(
        and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.verifiedAt)),
      );
  }

  public async findByHash(tokenHash: string): Promise<EmailVerificationTokenRow | null> {
    const rows = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);
    return rows[0] ?? null;
  }

  public async markVerified(id: string): Promise<void> {
    await this.db
      .update(emailVerificationTokens)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerificationTokens.id, id));
  }
}
