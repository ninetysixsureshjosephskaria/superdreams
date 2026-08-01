import { and, asc, eq, ilike, or, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { systemSettings } from '@/database/schema';
import type { Executor } from '@/database/types';

export type SettingRow = InferSelectModel<typeof systemSettings>;

/** Persistence for the typed key-value configuration store. */
export class SettingsRepository extends BaseRepository<typeof systemSettings> {
  public constructor(db: Database) {
    super(db, systemSettings);
  }

  public async findByKey(key: string, executor: Executor = this.db): Promise<SettingRow | null> {
    const rows = await executor
      .select()
      .from(systemSettings)
      .where(and(eq(systemSettings.key, key), notDeleted(systemSettings.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async listAll(): Promise<SettingRow[]> {
    return this.db
      .select()
      .from(systemSettings)
      .where(notDeleted(systemSettings.deletedAt))
      .orderBy(asc(systemSettings.categoryCode), asc(systemSettings.key));
  }

  public async listByCategory(categoryCode: string): Promise<SettingRow[]> {
    return this.db
      .select()
      .from(systemSettings)
      .where(
        and(eq(systemSettings.categoryCode, categoryCode), notDeleted(systemSettings.deletedAt)),
      )
      .orderBy(asc(systemSettings.key));
  }

  public async search(term: string): Promise<SettingRow[]> {
    const like = `%${term}%`;
    const match = or(
      ilike(systemSettings.key, like),
      ilike(systemSettings.label, like),
      ilike(systemSettings.description, like),
    );
    return this.db
      .select()
      .from(systemSettings)
      .where(and(notDeleted(systemSettings.deletedAt), match))
      .orderBy(asc(systemSettings.categoryCode), asc(systemSettings.key));
  }

  /** Loads every setting's key→value for the configuration cache. */
  public async loadValues(): Promise<Array<{ key: string; value: unknown }>> {
    const rows = await this.db
      .select({ key: systemSettings.key, value: systemSettings.value })
      .from(systemSettings)
      .where(notDeleted(systemSettings.deletedAt));
    return rows.map((row) => ({ key: row.key, value: row.value }));
  }
}
