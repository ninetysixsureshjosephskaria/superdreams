import { and, desc, eq, or, sql, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { buildPaginatedResult, normalizePagination, notDeleted } from '@/database/helpers';
import { favoriteReports, reportDefinitions, reports, savedFilters } from '@/database/schema';
import type { PaginatedResult, PaginationParams } from '@/database/types';

import type { ReportFilterValues } from '../dto';

export type SavedReportRow = InferSelectModel<typeof reports>;
export type SavedFilterRow = InferSelectModel<typeof savedFilters>;
export type FavoriteRow = InferSelectModel<typeof favoriteReports>;

export interface SavedReportView {
  id: string;
  name: string;
  definitionId: string;
  definitionCode: string | null;
  ownerId: string;
  filters: ReportFilterValues | null;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Persistence for user-saved reports, saved filters and favorites. */
export class SavedReportRepository {
  public constructor(private readonly db: Database) {}

  public async createSavedReport(input: {
    name: string;
    definitionId: string;
    ownerId: string;
    filters: ReportFilterValues | null;
    isShared: boolean;
  }): Promise<SavedReportRow> {
    const rows = await this.db
      .insert(reports)
      .values({
        name: input.name,
        definitionId: input.definitionId,
        ownerId: input.ownerId,
        filters: input.filters,
        isShared: input.isShared,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Saved-report insert did not return a row.');
    }
    return created;
  }

  /** Saved reports visible to a user: their own plus shared ones. */
  public async listSavedReports(
    userId: string,
    query: PaginationParams,
  ): Promise<PaginatedResult<SavedReportView>> {
    const { limit, offset, page, pageSize } = normalizePagination(query);
    const visible = or(eq(reports.ownerId, userId), eq(reports.isShared, true));
    const where = and(notDeleted(reports.deletedAt), visible);

    const rows = await this.db
      .select({
        id: reports.id,
        name: reports.name,
        definitionId: reports.definitionId,
        definitionCode: reportDefinitions.code,
        ownerId: reports.ownerId,
        filters: reports.filters,
        isShared: reports.isShared,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
      })
      .from(reports)
      .leftJoin(reportDefinitions, eq(reports.definitionId, reportDefinitions.id))
      .where(where)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);
    const totalRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(reports)
      .where(where);

    const items: SavedReportView[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      definitionId: row.definitionId,
      definitionCode: row.definitionCode,
      ownerId: row.ownerId,
      filters: (row.filters as ReportFilterValues | null) ?? null,
      isShared: row.isShared,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    return buildPaginatedResult(items, totalRows[0]?.value ?? 0, page, pageSize);
  }

  public async deleteSavedReport(id: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .update(reports)
      .set({ deletedAt: new Date(), deletedBy: userId })
      .where(and(eq(reports.id, id), eq(reports.ownerId, userId), notDeleted(reports.deletedAt)))
      .returning({ id: reports.id });
    return rows.length > 0;
  }

  // --- Saved filters ---------------------------------------------------------

  public async createSavedFilter(input: {
    userId: string;
    reportCode: string;
    name: string;
    filters: ReportFilterValues;
  }): Promise<SavedFilterRow> {
    const rows = await this.db
      .insert(savedFilters)
      .values({
        userId: input.userId,
        reportCode: input.reportCode,
        name: input.name,
        filters: input.filters,
        createdBy: input.userId,
        updatedBy: input.userId,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Saved-filter insert did not return a row.');
    }
    return created;
  }

  public async listSavedFilters(userId: string): Promise<SavedFilterRow[]> {
    return this.db
      .select()
      .from(savedFilters)
      .where(and(eq(savedFilters.userId, userId), notDeleted(savedFilters.deletedAt)))
      .orderBy(desc(savedFilters.createdAt));
  }

  // --- Favorites -------------------------------------------------------------

  public async addFavorite(userId: string, definitionId: string): Promise<FavoriteRow | null> {
    const rows = await this.db
      .insert(favoriteReports)
      .values({ userId, definitionId, createdBy: userId, updatedBy: userId })
      .onConflictDoNothing({
        target: [favoriteReports.userId, favoriteReports.definitionId],
      })
      .returning();
    return rows[0] ?? null;
  }

  public async removeFavorite(userId: string, definitionId: string): Promise<boolean> {
    const rows = await this.db
      .delete(favoriteReports)
      .where(
        and(eq(favoriteReports.userId, userId), eq(favoriteReports.definitionId, definitionId)),
      )
      .returning({ id: favoriteReports.id });
    return rows.length > 0;
  }

  public async listFavorites(
    userId: string,
  ): Promise<
    Array<{ id: string; definitionId: string; definitionCode: string | null; createdAt: Date }>
  > {
    return this.db
      .select({
        id: favoriteReports.id,
        definitionId: favoriteReports.definitionId,
        definitionCode: reportDefinitions.code,
        createdAt: favoriteReports.createdAt,
      })
      .from(favoriteReports)
      .leftJoin(reportDefinitions, eq(favoriteReports.definitionId, reportDefinitions.id))
      .where(and(eq(favoriteReports.userId, userId), notDeleted(favoriteReports.deletedAt)))
      .orderBy(desc(favoriteReports.createdAt));
  }
}
