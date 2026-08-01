import { and, asc, eq, ilike, type InferSelectModel, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { storeCategories } from '@/database/schema';

export type CategoryRow = InferSelectModel<typeof storeCategories>;

/** Persistence for Dream Store categories. */
export class CategoryRepository extends BaseRepository<typeof storeCategories> {
  public constructor(db: Database) {
    super(db, storeCategories);
  }

  public async listAll(query: {
    search?: string | undefined;
    includeInactive?: boolean | undefined;
  }): Promise<CategoryRow[]> {
    const conditions: SQL[] = [notDeleted(storeCategories.deletedAt)];
    if (!query.includeInactive) {
      conditions.push(eq(storeCategories.isActive, true));
    }
    if (query.search) {
      const match = ilike(storeCategories.name, `%${query.search}%`);
      conditions.push(match);
    }
    return this.db
      .select()
      .from(storeCategories)
      .where(and(...conditions))
      .orderBy(asc(storeCategories.sortOrder), asc(storeCategories.name));
  }

  public async findBySlug(slug: string): Promise<CategoryRow | null> {
    const rows = await this.db
      .select()
      .from(storeCategories)
      .where(and(eq(storeCategories.slug, slug), notDeleted(storeCategories.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
