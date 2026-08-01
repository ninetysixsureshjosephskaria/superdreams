import { desc, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { passwordHistory } from '@/database/schema';

/** Append-only password history (to prevent immediate reuse). */
export class PasswordHistoryRepository {
  public constructor(private readonly db: Database) {}

  public async record(userId: string, passwordHash: string): Promise<void> {
    await this.db.insert(passwordHistory).values({ userId, passwordHash });
  }

  public async recentHashes(userId: string, limit = 5): Promise<string[]> {
    const rows = await this.db
      .select({ passwordHash: passwordHistory.passwordHash })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(limit);
    return rows.map((row) => row.passwordHash);
  }
}
