import { and, asc, desc, eq, lte, sql, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notificationQueue } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { NotificationChannel, NotificationQueueStatus } from '../dto';

export type QueueRow = InferSelectModel<typeof notificationQueue>;

/** Idempotent delivery-queue persistence with retry + dead-letter support. */
export class NotificationQueueRepository {
  public constructor(private readonly db: Database) {}

  public async enqueue(
    input: {
      notificationId: string;
      channel: NotificationChannel;
      scheduledAt: Date;
      maxAttempts?: number;
    },
    executor: Executor = this.db,
  ): Promise<QueueRow> {
    const rows = await executor
      .insert(notificationQueue)
      .values({
        notificationId: input.notificationId,
        channel: input.channel,
        status: 'PENDING',
        scheduledAt: input.scheduledAt,
        nextAttemptAt: input.scheduledAt,
        maxAttempts: input.maxAttempts ?? 3,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Queue enqueue did not return a row.');
    }
    return created;
  }

  public async findByNotification(notificationId: string): Promise<QueueRow | null> {
    const rows = await this.db
      .select()
      .from(notificationQueue)
      .where(eq(notificationQueue.notificationId, notificationId))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Due PENDING items (scheduled at or before `asOf`), oldest first. */
  public async listDue(asOf: Date, limit: number): Promise<QueueRow[]> {
    return this.db
      .select()
      .from(notificationQueue)
      .where(
        and(eq(notificationQueue.status, 'PENDING'), lte(notificationQueue.nextAttemptAt, asOf)),
      )
      .orderBy(asc(notificationQueue.scheduledAt))
      .limit(limit);
  }

  /**
   * Atomically claims a PENDING item for processing. Returns the row only if the
   * caller won the claim — the guard makes queue processing idempotent and safe
   * under concurrent processors.
   */
  public async claim(id: string, executor: Executor = this.db): Promise<QueueRow | null> {
    const rows = await executor
      .update(notificationQueue)
      .set({ status: 'PROCESSING' })
      .where(and(eq(notificationQueue.id, id), eq(notificationQueue.status, 'PENDING')))
      .returning();
    return rows[0] ?? null;
  }

  public async markResult(
    id: string,
    input: {
      status: NotificationQueueStatus;
      attempts: number;
      lastError: string | null;
      nextAttemptAt: Date | null;
      processed: boolean;
    },
  ): Promise<void> {
    await this.db
      .update(notificationQueue)
      .set({
        status: input.status,
        attempts: input.attempts,
        lastError: input.lastError,
        nextAttemptAt: input.nextAttemptAt,
        processedAt: input.processed ? new Date() : null,
      })
      .where(eq(notificationQueue.id, id));
  }

  /** Resets a FAILED/DEAD item back to PENDING for a manual retry. */
  public async resetForRetry(notificationId: string): Promise<QueueRow | null> {
    const rows = await this.db
      .update(notificationQueue)
      .set({ status: 'PENDING', nextAttemptAt: new Date(), lastError: null })
      .where(eq(notificationQueue.notificationId, notificationId))
      .returning();
    return rows[0] ?? null;
  }

  public async cancel(notificationId: string): Promise<void> {
    await this.db
      .update(notificationQueue)
      .set({ status: 'CANCELLED', processedAt: new Date() })
      .where(eq(notificationQueue.notificationId, notificationId));
  }

  public async listByStatus(status: NotificationQueueStatus, limit = 100): Promise<QueueRow[]> {
    return this.db
      .select()
      .from(notificationQueue)
      .where(eq(notificationQueue.status, status))
      .orderBy(desc(notificationQueue.createdAt))
      .limit(limit);
  }

  public async counts(): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ status: notificationQueue.status, value: sql<number>`count(*)::int` })
      .from(notificationQueue)
      .groupBy(notificationQueue.status);
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.value;
    }
    return result;
  }
}
