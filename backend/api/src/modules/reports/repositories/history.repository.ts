import { and, desc, eq, sql, type InferSelectModel, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { buildPaginatedResult, normalizePagination } from '@/database/helpers';
import { reportExecutionHistory } from '@/database/schema';
import type { Executor, PaginatedResult } from '@/database/types';

import type { JobStatusValue, ListHistoryQuery, ReportFilterValues } from '../dto';

export type ExecutionRow = InferSelectModel<typeof reportExecutionHistory>;

/** Append-only persistence for report execution history. */
export class ReportHistoryRepository {
  public constructor(private readonly db: Database) {}

  public async record(
    input: {
      reportCode: string;
      trigger: string;
      status: JobStatusValue;
      filters: ReportFilterValues | null;
      rowCount: number;
      durationMs: number;
      error: string | null;
      runBy: string | null;
    },
    executor: Executor = this.db,
  ): Promise<ExecutionRow> {
    const rows = await executor
      .insert(reportExecutionHistory)
      .values({
        reportCode: input.reportCode,
        trigger: input.trigger,
        status: input.status,
        filters: input.filters,
        rowCount: input.rowCount,
        durationMs: input.durationMs,
        error: input.error,
        runBy: input.runBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('History insert did not return a row.');
    }
    return created;
  }

  public async search(query: ListHistoryQuery): Promise<PaginatedResult<ExecutionRow>> {
    const { limit, offset, page, pageSize } = normalizePagination(query);
    const conditions: SQL[] = [];
    if (query.code) {
      conditions.push(eq(reportExecutionHistory.reportCode, query.code));
    }
    if (query.status) {
      conditions.push(eq(reportExecutionHistory.status, query.status));
    }
    if (query.trigger) {
      conditions.push(eq(reportExecutionHistory.trigger, query.trigger));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(reportExecutionHistory)
      .where(where)
      .orderBy(desc(reportExecutionHistory.createdAt))
      .limit(limit)
      .offset(offset);
    const totalRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(reportExecutionHistory)
      .where(where);
    return buildPaginatedResult(rows, totalRows[0]?.value ?? 0, page, pageSize);
  }
}
