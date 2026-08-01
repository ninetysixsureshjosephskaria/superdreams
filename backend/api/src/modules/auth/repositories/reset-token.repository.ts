import { and, eq, isNull, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { passwordResetTokens } from '@/database/schema';

export type PasswordResetTokenRow = InferSelectModel<typeof passwordResetTokens>;

/** Single-use, expiring password reset tokens (stored hashed). */
export class PasswordResetTokenRepository {
  public constructor(private readonly db: Database) {}

  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
  }

  public async findByHash(tokenHash: string): Promise<PasswordResetTokenRow | null> {
    const rows = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);
    return rows[0] ?? null;
  }

  public async markUsed(id: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  /** Invalidates any outstanding reset tokens for a user. */
  public async invalidateAllForUser(userId: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  }
}
