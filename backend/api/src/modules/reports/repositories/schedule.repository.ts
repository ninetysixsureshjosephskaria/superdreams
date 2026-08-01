import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  lte,
  sql,
  type InferSelectModel,
  type SQL,
} from 'drizzle-orm';

import type { Database } from '@/database/client';
import { buildPaginatedResult, normalizePagination, notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { reportSchedules } from '@/database/schema';
import type { PaginatedResult, PaginationParams } from '@/database/types';

export type ScheduleRow = InferSelectModel<typeof reportSchedules>;

/** Persistence for scheduled reports. */
export class ReportScheduleRepository extends BaseRepository<typeof reportSchedules> {
  public constructor(db: Database) {
    super(db, reportSchedules);
  }

  public async search(query: PaginationParams): Promise<PaginatedResult<ScheduleRow>> {
    const { limit, offset, page, pageSize } = normalizePagination(query);
    const where = notDeleted(reportSchedules.deletedAt);
    const rows = await this.db
      .select()
      .from(reportSchedules)
      .where(where)
      .orderBy(desc(reportSchedules.createdAt))
      .limit(limit)
      .offset(offset);
    const totalRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(reportSchedules)
      .where(where);
    return buildPaginatedResult(rows, totalRows[0]?.value ?? 0, page, pageSize);
  }

  /** Active schedules that are due (nextRunAt at or before `asOf`), oldest first. */
  public async listDue(asOf: Date, limit: number): Promise<ScheduleRow[]> {
    const conditions: SQL[] = [
      notDeleted(reportSchedules.deletedAt),
      eq(reportSchedules.isActive, true),
      isNotNull(reportSchedules.nextRunAt),
      lte(reportSchedules.nextRunAt, asOf),
    ];
    return this.db
      .select()
      .from(reportSchedules)
      .where(and(...conditions))
      .orderBy(asc(reportSchedules.nextRunAt))
      .limit(limit);
  }
}
