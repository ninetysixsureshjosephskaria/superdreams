import { asc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notificationDeliveries, notificationLogs } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { NotificationChannel, NotificationDeliveryResult, NotificationStatus } from '../dto';

export type DeliveryRow = InferSelectModel<typeof notificationDeliveries>;
export type LogRow = InferSelectModel<typeof notificationLogs>;

/** Append-only record of delivery attempts. */
export class NotificationDeliveryRepository {
  public constructor(private readonly db: Database) {}

  public async append(
    input: {
      notificationId: string;
      channel: NotificationChannel;
      result: NotificationDeliveryResult;
      provider: string;
      providerMessageId: string | null;
      error: string | null;
      attempt: number;
    },
    executor: Executor = this.db,
  ): Promise<void> {
    await executor.insert(notificationDeliveries).values(input);
  }

  public async listByNotification(notificationId: string): Promise<DeliveryRow[]> {
    return this.db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.notificationId, notificationId))
      .orderBy(asc(notificationDeliveries.createdAt));
  }
}

/** Append-only, immutable notification lifecycle log. */
export class NotificationLogRepository {
  public constructor(private readonly db: Database) {}

  public async append(
    input: {
      notificationId: string;
      action: string;
      fromStatus?: NotificationStatus | null;
      toStatus?: NotificationStatus | null;
      detail?: string | null;
      actorId?: string | null;
    },
    executor: Executor = this.db,
  ): Promise<void> {
    await executor.insert(notificationLogs).values({
      notificationId: input.notificationId,
      action: input.action,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      detail: input.detail ?? null,
      actorId: input.actorId ?? null,
    });
  }

  public async listByNotification(notificationId: string): Promise<LogRow[]> {
    return this.db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.notificationId, notificationId))
      .orderBy(asc(notificationLogs.createdAt));
  }
}
