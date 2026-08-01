import { and, desc, eq, gt, isNull, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { sessions } from '@/database/schema';

export type SessionRow = InferSelectModel<typeof sessions>;

export class SessionRepository extends BaseRepository<typeof sessions> {
  public constructor(db: Database) {
    super(db, sessions);
  }

  public async findActiveById(id: string): Promise<SessionRow | null> {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, id),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          notDeleted(sessions.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  public async listActiveByUser(userId: string): Promise<SessionRow[]> {
    return this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          notDeleted(sessions.deletedAt),
        ),
      )
      .orderBy(desc(sessions.lastActivityAt));
  }

  public async revoke(id: string): Promise<void> {
    await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id));
  }

  public async touch(id: string): Promise<void> {
    await this.db.update(sessions).set({ lastActivityAt: new Date() }).where(eq(sessions.id, id));
  }
}
