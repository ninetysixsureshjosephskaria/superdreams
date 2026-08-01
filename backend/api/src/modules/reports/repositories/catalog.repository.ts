import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { normalizePagination, notDeleted } from '@/database/helpers';
import { reportCategories, reportDefinitions } from '@/database/schema';

import type { ListReportsQuery } from '../dto';

export interface DefinitionRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  source: string;
  isActive: boolean;
  categoryCode: string | null;
  categoryLabel: string | null;
}

/** Projection shared by every definition query (definition + category join). */
const DEFINITION_SELECTION = {
  id: reportDefinitions.id,
  code: reportDefinitions.code,
  name: reportDefinitions.name,
  description: reportDefinitions.description,
  source: reportDefinitions.source,
  isActive: reportDefinitions.isActive,
  categoryCode: reportCategories.code,
  categoryLabel: reportCategories.label,
} as const;

/** Read access to the seeded report catalog (categories + definitions). */
export class ReportCatalogRepository {
  public constructor(private readonly db: Database) {}

  public async listCategories(): Promise<
    Array<{ id: string; code: string; label: string; description: string | null }>
  > {
    return this.db
      .select({
        id: reportCategories.id,
        code: reportCategories.code,
        label: reportCategories.label,
        description: reportCategories.description,
      })
      .from(reportCategories)
      .where(notDeleted(reportCategories.deletedAt))
      .orderBy(asc(reportCategories.label));
  }

  public async findByCode(code: string): Promise<DefinitionRow | null> {
    const rows = await this.db
      .select(DEFINITION_SELECTION)
      .from(reportDefinitions)
      .leftJoin(reportCategories, eq(reportDefinitions.categoryId, reportCategories.id))
      .where(and(eq(reportDefinitions.code, code), notDeleted(reportDefinitions.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findById(id: string): Promise<DefinitionRow | null> {
    const rows = await this.db
      .select(DEFINITION_SELECTION)
      .from(reportDefinitions)
      .leftJoin(reportCategories, eq(reportDefinitions.categoryId, reportCategories.id))
      .where(and(eq(reportDefinitions.id, id), notDeleted(reportDefinitions.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async search(query: ListReportsQuery): Promise<{ rows: DefinitionRow[]; total: number }> {
    const { limit, offset } = normalizePagination(query);
    const conditions: SQL[] = [notDeleted(reportDefinitions.deletedAt)];
    if (query.search) {
      const term = `%${query.search}%`;
      const match = or(
        ilike(reportDefinitions.name, term),
        ilike(reportDefinitions.code, term),
        ilike(reportDefinitions.description, term),
      );
      if (match) {
        conditions.push(match);
      }
    }
    if (query.category) {
      conditions.push(eq(reportCategories.code, query.category.toUpperCase()));
    }
    if (query.source) {
      conditions.push(eq(reportDefinitions.source, query.source.toUpperCase()));
    }
    const where = and(...conditions);

    const sortColumn =
      query.sortBy === 'code'
        ? reportDefinitions.code
        : query.sortBy === 'createdAt'
          ? reportDefinitions.createdAt
          : reportDefinitions.name;
    const direction = query.order === 'desc' ? desc : asc;

    const rows = await this.db
      .select(DEFINITION_SELECTION)
      .from(reportDefinitions)
      .leftJoin(reportCategories, eq(reportDefinitions.categoryId, reportCategories.id))
      .where(where)
      .orderBy(direction(sortColumn))
      .limit(limit)
      .offset(offset);

    const totalRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(reportDefinitions)
      .leftJoin(reportCategories, eq(reportDefinitions.categoryId, reportCategories.id))
      .where(where);

    return { rows, total: totalRows[0]?.value ?? 0 };
  }
}
