import { and, eq, gt, sql } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { loginHistory } from '@/database/schema';

export interface LoginAttempt {
  userId?: string | null;
  email: string;
  success: boolean;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Append-only login attempt history (also drives account lockout). */
export class LoginHistoryRepository {
  public constructor(private readonly db: Database) {}

  public async record(attempt: LoginAttempt): Promise<void> {
    await this.db.insert(loginHistory).values({
      userId: attempt.userId ?? null,
      email: attempt.email,
      success: attempt.success,
      reason: attempt.reason ?? null,
      ipAddress: attempt.ipAddress ?? null,
      userAgent: attempt.userAgent ?? null,
    });
  }

  public async countRecentFailures(email: string, since: Date): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(loginHistory)
      .where(
        and(
          eq(loginHistory.email, email),
          eq(loginHistory.success, false),
          gt(loginHistory.createdAt, since),
        ),
      );
    return rows[0]?.value ?? 0;
  }
}
