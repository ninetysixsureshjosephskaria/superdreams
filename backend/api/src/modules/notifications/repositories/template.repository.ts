import { and, asc, desc, eq, ilike, or, sql, type InferSelectModel, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { notificationTemplates } from '@/database/schema';

import type { ListTemplatesQuery } from '../dto';

export type TemplateRow = InferSelectModel<typeof notificationTemplates>;

const sortColumns = {
  createdAt: notificationTemplates.createdAt,
  updatedAt: notificationTemplates.updatedAt,
  name: notificationTemplates.name,
  code: notificationTemplates.code,
} as const;

export class NotificationTemplateRepository extends BaseRepository<typeof notificationTemplates> {
  public constructor(db: Database) {
    super(db, notificationTemplates);
  }

  public async findByCode(code: string): Promise<TemplateRow | null> {
    const rows = await this.db
      .select()
      .from(notificationTemplates)
      .where(and(eq(notificationTemplates.code, code), notDeleted(notificationTemplates.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async search(query: ListTemplatesQuery): Promise<{ rows: TemplateRow[]; total: number }> {
    const conditions: SQL[] = [notDeleted(notificationTemplates.deletedAt)];

    if (query.channel) {
      conditions.push(eq(notificationTemplates.channel, query.channel));
    }
    if (query.status) {
      conditions.push(eq(notificationTemplates.status, query.status));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      const searchCondition = or(
        ilike(notificationTemplates.name, term),
        ilike(notificationTemplates.code, term),
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
      .from(notificationTemplates)
      .where(where)
      .orderBy(direction(sortColumns[query.sortBy]))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(notificationTemplates)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}
