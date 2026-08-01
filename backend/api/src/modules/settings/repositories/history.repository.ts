import { and, desc, eq, sql, type InferSelectModel, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { buildPaginatedResult, normalizePagination } from '@/database/helpers';
import { settingHistory } from '@/database/schema';
import type { Executor, PaginatedResult } from '@/database/types';

import type { HistoryQuery } from '../dto';

export type HistoryRow = InferSelectModel<typeof settingHistory>;

/** Append-only persistence for setting version history. */
export class SettingHistoryRepository {
  public constructor(private readonly db: Database) {}

  public async append(
    input: {
      settingId: string | null;
      key: string;
      categoryCode: string;
      oldValue: unknown;
      newValue: unknown;
      version: number;
      changedBy: string | null;
    },
    executor: Executor = this.db,
  ): Promise<void> {
    await executor.insert(settingHistory).values({
      settingId: input.settingId,
      key: input.key,
      categoryCode: input.categoryCode,
      oldValue: input.oldValue,
      newValue: input.newValue,
      version: input.version,
      changedBy: input.changedBy,
    });
  }

  public async search(query: HistoryQuery): Promise<PaginatedResult<HistoryRow>> {
    const { limit, offset, page, pageSize } = normalizePagination(query);
    const conditions: SQL[] = [];
    if (query.key) {
      conditions.push(eq(settingHistory.key, query.key));
    }
    if (query.category) {
      conditions.push(eq(settingHistory.categoryCode, query.category.toUpperCase()));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(settingHistory)
      .where(where)
      .orderBy(desc(settingHistory.createdAt))
      .limit(limit)
      .offset(offset);
    const totalRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(settingHistory)
      .where(where);
    return buildPaginatedResult(rows, totalRows[0]?.value ?? 0, page, pageSize);
  }
}
