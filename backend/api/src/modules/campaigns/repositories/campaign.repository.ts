import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type InferSelectModel,
  type SQL,
} from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { campaigns } from '@/database/schema';

import type { ListCampaignsQuery } from '../dto';

export type CampaignRow = InferSelectModel<typeof campaigns>;

const sortColumns = {
  createdAt: campaigns.createdAt,
  updatedAt: campaigns.updatedAt,
  name: campaigns.name,
  status: campaigns.status,
  startsAt: campaigns.startsAt,
} as const;

export class CampaignRepository extends BaseRepository<typeof campaigns> {
  public constructor(db: Database) {
    super(db, campaigns);
  }

  public async findByCode(code: string): Promise<CampaignRow | null> {
    const rows = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.code, code), notDeleted(campaigns.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async search(query: ListCampaignsQuery): Promise<{ rows: CampaignRow[]; total: number }> {
    const conditions: SQL[] = [notDeleted(campaigns.deletedAt)];

    if (query.status) {
      conditions.push(eq(campaigns.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(campaigns.type, query.type));
    }
    if (query.dateFrom) {
      conditions.push(gte(campaigns.startsAt, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      conditions.push(lte(campaigns.startsAt, new Date(query.dateTo)));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      const searchCondition = or(
        ilike(campaigns.name, term),
        ilike(campaigns.code, term),
        ilike(campaigns.description, term),
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
      .from(campaigns)
      .where(where)
      .orderBy(direction(sortColumns[query.sortBy]))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  /** Active campaigns (for the member portal's available list). */
  public async listActive(): Promise<CampaignRow[]> {
    return this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.status, 'ACTIVE'), notDeleted(campaigns.deletedAt)))
      .orderBy(desc(campaigns.createdAt));
  }
}
