import { and, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { devices } from '@/database/schema';

export type DeviceRow = InferSelectModel<typeof devices>;

export class DeviceRepository extends BaseRepository<typeof devices> {
  public constructor(db: Database) {
    super(db, devices);
  }

  public async findByIdentifier(
    userId: string,
    deviceIdentifier: string,
  ): Promise<DeviceRow | null> {
    const rows = await this.db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.userId, userId),
          eq(devices.deviceIdentifier, deviceIdentifier),
          notDeleted(devices.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Finds or registers a device for the user and marks it seen. */
  public async ensureDevice(
    userId: string,
    deviceIdentifier: string,
    name: string | null,
    userAgent: string | null,
  ): Promise<DeviceRow> {
    const existing = await this.findByIdentifier(userId, deviceIdentifier);
    if (existing) {
      await this.db
        .update(devices)
        .set({ lastSeenAt: new Date(), userAgent: userAgent ?? existing.userAgent })
        .where(eq(devices.id, existing.id));
      return existing;
    }
    return this.create({ userId, deviceIdentifier, name, userAgent, lastSeenAt: new Date() });
  }

  public async revoke(id: string): Promise<void> {
    await this.db.update(devices).set({ revokedAt: new Date() }).where(eq(devices.id, id));
  }
}
