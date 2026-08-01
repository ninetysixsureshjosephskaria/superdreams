import { and, asc, desc, eq, ilike, or, sql, type InferSelectModel, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { rewardPrograms } from '@/database/schema';

import type { ListProgramsQuery } from '../dto';

export type RewardProgramRow = InferSelectModel<typeof rewardPrograms>;

const sortColumns = {
  createdAt: rewardPrograms.createdAt,
  updatedAt: rewardPrograms.updatedAt,
  name: rewardPrograms.name,
  status: rewardPrograms.status,
  code: rewardPrograms.code,
} as const;

export class RewardProgramRepository extends BaseRepository<typeof rewardPrograms> {
  public constructor(db: Database) {
    super(db, rewardPrograms);
  }

  public async findByCode(code: string): Promise<RewardProgramRow | null> {
    const rows = await this.db
      .select()
      .from(rewardPrograms)
      .where(and(eq(rewardPrograms.code, code), notDeleted(rewardPrograms.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async search(
    query: ListProgramsQuery,
  ): Promise<{ rows: RewardProgramRow[]; total: number }> {
    const conditions: SQL[] = [notDeleted(rewardPrograms.deletedAt)];

    if (query.status) {
      conditions.push(eq(rewardPrograms.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(rewardPrograms.type, query.type));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      const searchCondition = or(
        ilike(rewardPrograms.name, term),
        ilike(rewardPrograms.code, term),
        ilike(rewardPrograms.description, term),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const where = and(...conditions);
    const direction = query.order === 'asc' ? asc : desc;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(rewardPrograms)
      .where(where)
      .orderBy(direction(sortColumns[query.sortBy]))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(rewardPrograms)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}
