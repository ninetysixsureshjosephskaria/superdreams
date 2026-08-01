import { and, eq, isNull, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notificationEvents, notificationPreferences } from '@/database/schema';

import type { NotificationChannel } from '../dto';

export type PreferenceRow = InferSelectModel<typeof notificationPreferences>;
export type EventMappingRow = InferSelectModel<typeof notificationEvents>;

/** Persistence for per-user notification preferences. */
export class NotificationPreferenceRepository {
  public constructor(private readonly db: Database) {}

  public async listByUser(userId: string): Promise<PreferenceRow[]> {
    return this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
  }

  public async upsert(input: {
    userId: string;
    channel: NotificationChannel;
    groupId: string | null;
    enabled: boolean;
    updatedBy: string | null;
  }): Promise<void> {
    await this.db
      .insert(notificationPreferences)
      .values({
        userId: input.userId,
        channel: input.channel,
        groupId: input.groupId,
        enabled: input.enabled,
        createdBy: input.updatedBy,
        updatedBy: input.updatedBy,
      })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.channel,
          notificationPreferences.groupId,
        ],
        set: { enabled: input.enabled, updatedBy: input.updatedBy, updatedAt: new Date() },
      });
  }

  /**
   * Whether a channel is enabled for a user. A group-specific preference wins
   * over the channel-level one; the default (no row) is enabled.
   */
  public async isEnabled(
    userId: string,
    channel: NotificationChannel,
    groupId: string | null,
  ): Promise<boolean> {
    if (groupId) {
      const groupPref = await this.db
        .select({ enabled: notificationPreferences.enabled })
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, userId),
            eq(notificationPreferences.channel, channel),
            eq(notificationPreferences.groupId, groupId),
          ),
        )
        .limit(1);
      if (groupPref[0]) {
        return groupPref[0].enabled;
      }
    }
    const channelPref = await this.db
      .select({ enabled: notificationPreferences.enabled })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.channel, channel),
          isNull(notificationPreferences.groupId),
        ),
      )
      .limit(1);
    return channelPref[0]?.enabled ?? true;
  }
}

/** Read access to event→template mappings (the consumer configuration). */
export class NotificationEventMappingRepository {
  public constructor(private readonly db: Database) {}

  public async findByEventType(eventType: string): Promise<EventMappingRow | null> {
    const rows = await this.db
      .select()
      .from(notificationEvents)
      .where(
        and(eq(notificationEvents.eventType, eventType), eq(notificationEvents.isActive, true)),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
