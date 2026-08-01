import { asc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { settingCategories } from '@/database/schema';

export type CategoryRow = InferSelectModel<typeof settingCategories>;

/** Read access to the seeded settings categories. */
export class SettingCategoryRepository {
  public constructor(private readonly db: Database) {}

  public async listAll(): Promise<CategoryRow[]> {
    return this.db
      .select()
      .from(settingCategories)
      .where(notDeleted(settingCategories.deletedAt))
      .orderBy(asc(settingCategories.sortOrder), asc(settingCategories.label));
  }

  public async findByCode(code: string): Promise<CategoryRow | null> {
    const rows = await this.db
      .select()
      .from(settingCategories)
      .where(eq(settingCategories.code, code))
      .limit(1);
    return rows[0] ?? null;
  }
}
