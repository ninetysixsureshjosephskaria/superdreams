import { asc, and, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { games } from '@/database/schema';

export type GameRow = InferSelectModel<typeof games>;

/** Persistence for the games catalog. */
export class GameRepository extends BaseRepository<typeof games> {
  public constructor(db: Database) {
    super(db, games);
  }

  public async listActive(): Promise<GameRow[]> {
    return this.db
      .select()
      .from(games)
      .where(and(eq(games.status, 'ACTIVE'), notDeleted(games.deletedAt)))
      .orderBy(asc(games.name));
  }

  public async findActiveById(id: string): Promise<GameRow | null> {
    const rows = await this.db
      .select()
      .from(games)
      .where(and(eq(games.id, id), eq(games.status, 'ACTIVE'), notDeleted(games.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
