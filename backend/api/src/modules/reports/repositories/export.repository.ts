import { and, desc, eq, lte, sql, type InferSelectModel, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { buildPaginatedResult, normalizePagination, notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { reportExports } from '@/database/schema';
import type { PaginatedResult } from '@/database/types';

import type { JobStatusValue, ListExportsQuery, ReportFormat } from '../dto';

export type ExportRow = InferSelectModel<typeof reportExports>;

/** Persistence for report export jobs. */
export class ReportExportRepository extends BaseRepository<typeof reportExports> {
  public constructor(db: Database) {
    super(db, reportExports);
  }

  public async search(query: ListExportsQuery): Promise<PaginatedResult<ExportRow>> {
    const { limit, offset, page, pageSize } = normalizePagination(query);
    const conditions: SQL[] = [notDeleted(reportExports.deletedAt)];
    if (query.code) {
      conditions.push(eq(reportExports.reportCode, query.code));
    }
    if (query.status) {
      conditions.push(eq(reportExports.status, query.status));
    }
    if (query.format) {
      conditions.push(eq(reportExports.format, query.format));
    }
    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(reportExports)
      .where(where)
      .orderBy(desc(reportExports.createdAt))
      .limit(limit)
      .offset(offset);
    const totalRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(reportExports)
      .where(where);
    return buildPaginatedResult(rows, totalRows[0]?.value ?? 0, page, pageSize);
  }

  /** Due PENDING export jobs (created at or before `asOf`), oldest first. */
  public async listPending(asOf: Date, limit: number): Promise<ExportRow[]> {
    return this.db
      .select()
      .from(reportExports)
      .where(and(eq(reportExports.status, 'PENDING'), lte(reportExports.createdAt, asOf)))
      .orderBy(desc(reportExports.createdAt))
      .limit(limit);
  }

  public async markCompleted(
    id: string,
    input: {
      status: JobStatusValue;
      rowCount: number;
      content: string | null;
      contentType: string | null;
      fileName: string | null;
      error: string | null;
      format: ReportFormat;
    },
  ): Promise<ExportRow | null> {
    return this.update(id, {
      status: input.status,
      rowCount: input.rowCount,
      content: input.content,
      contentType: input.contentType,
      fileName: input.fileName,
      error: input.error,
      format: input.format,
      completedAt: new Date(),
    });
  }
}
