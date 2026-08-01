import { asc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { dashboardLayouts, dashboardWidgets } from '@/database/schema';

import type { DashboardLayoutItem } from '../dto';

export type WidgetRow = InferSelectModel<typeof dashboardWidgets>;
export type LayoutRow = InferSelectModel<typeof dashboardLayouts>;

/** Read access to seeded dashboard widgets and per-user layout persistence. */
export class DashboardRepository {
  public constructor(private readonly db: Database) {}

  public async listWidgets(): Promise<WidgetRow[]> {
    return this.db
      .select()
      .from(dashboardWidgets)
      .where(notDeleted(dashboardWidgets.deletedAt))
      .orderBy(asc(dashboardWidgets.title));
  }

  public async getLayout(userId: string): Promise<LayoutRow | null> {
    const rows = await this.db
      .select()
      .from(dashboardLayouts)
      .where(eq(dashboardLayouts.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  public async upsertLayout(
    userId: string,
    layout: DashboardLayoutItem[],
    actorId: string,
  ): Promise<void> {
    await this.db
      .insert(dashboardLayouts)
      .values({ userId, layout, createdBy: actorId, updatedBy: actorId })
      .onConflictDoUpdate({
        target: dashboardLayouts.userId,
        set: { layout, updatedBy: actorId, updatedAt: new Date() },
      });
  }
}
