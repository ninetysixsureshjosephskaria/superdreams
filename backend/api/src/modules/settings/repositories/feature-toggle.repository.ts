import { and, asc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { featureToggles } from '@/database/schema';

export type FeatureToggleRow = InferSelectModel<typeof featureToggles>;

/** Persistence for feature toggle definitions. */
export class FeatureToggleRepository extends BaseRepository<typeof featureToggles> {
  public constructor(db: Database) {
    super(db, featureToggles);
  }

  public async findByKey(key: string): Promise<FeatureToggleRow | null> {
    const rows = await this.db
      .select()
      .from(featureToggles)
      .where(and(eq(featureToggles.key, key), notDeleted(featureToggles.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async listAll(): Promise<FeatureToggleRow[]> {
    return this.db
      .select()
      .from(featureToggles)
      .where(notDeleted(featureToggles.deletedAt))
      .orderBy(asc(featureToggles.name));
  }
}
