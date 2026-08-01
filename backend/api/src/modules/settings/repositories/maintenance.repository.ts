import { and, desc, eq, gte, isNull, lte, or, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { maintenanceWindows } from '@/database/schema';

export type MaintenanceRow = InferSelectModel<typeof maintenanceWindows>;

/** Persistence for maintenance windows. */
export class MaintenanceRepository extends BaseRepository<typeof maintenanceWindows> {
  public constructor(db: Database) {
    super(db, maintenanceWindows);
  }

  /** The active maintenance window (if any) as of `asOf` — most recent first. */
  public async currentActive(asOf: Date): Promise<MaintenanceRow | null> {
    const rows = await this.db
      .select()
      .from(maintenanceWindows)
      .where(
        and(
          notDeleted(maintenanceWindows.deletedAt),
          eq(maintenanceWindows.isActive, true),
          or(isNull(maintenanceWindows.startsAt), lte(maintenanceWindows.startsAt, asOf)),
          or(isNull(maintenanceWindows.endsAt), gte(maintenanceWindows.endsAt, asOf)),
        ),
      )
      .orderBy(desc(maintenanceWindows.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  public async listAll(): Promise<MaintenanceRow[]> {
    return this.db
      .select()
      .from(maintenanceWindows)
      .where(notDeleted(maintenanceWindows.deletedAt))
      .orderBy(desc(maintenanceWindows.createdAt));
  }

  /** Deactivates every currently-active window; returns how many were affected. */
  public async deactivateActive(actorId: string): Promise<number> {
    const rows = await this.db
      .update(maintenanceWindows)
      .set({ isActive: false, updatedBy: actorId, updatedAt: new Date() })
      .where(and(eq(maintenanceWindows.isActive, true), notDeleted(maintenanceWindows.deletedAt)))
      .returning({ id: maintenanceWindows.id });
    return rows.length;
  }
}
