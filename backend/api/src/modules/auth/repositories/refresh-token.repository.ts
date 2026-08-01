import { and, eq, isNull, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { BaseRepository } from '@/database/repositories';
import { refreshTokens } from '@/database/schema';

export type RefreshTokenRow = InferSelectModel<typeof refreshTokens>;

export class RefreshTokenRepository extends BaseRepository<typeof refreshTokens> {
  public constructor(db: Database) {
    super(db, refreshTokens);
  }

  public async findByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Marks a token as consumed (used + revoked) and links its replacement. */
  public async markRotated(id: string, replacedByTokenId: string): Promise<void> {
    const now = new Date();
    await this.db
      .update(refreshTokens)
      .set({ usedAt: now, revokedAt: now, replacedByTokenId })
      .where(eq(refreshTokens.id, id));
  }

  /** Revokes every active refresh token for a session (e.g. on reuse detection). */
  public async revokeAllForSession(sessionId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.sessionId, sessionId), isNull(refreshTokens.revokedAt)));
  }
}
