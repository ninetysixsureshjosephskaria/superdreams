import { and, desc, eq, sql, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { normalizePagination, notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories/base-repository';
import { gameRewards, gameScores, gameSessions, games } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListHistoryQuery } from '../dto';

export type SessionRow = InferSelectModel<typeof gameSessions>;

export interface HistoryRow {
  sessionId: string;
  gameId: string;
  gameName: string | null;
  status: SessionRow['status'];
  score: number | null;
  pointsAwarded: number | null;
  playedAt: Date;
}

/** Persistence for play sessions, scores and reward records. */
export class SessionRepository extends BaseRepository<typeof gameSessions> {
  public constructor(db: Database) {
    super(db, gameSessions);
  }

  public async lockById(id: string, tx: Executor): Promise<SessionRow | null> {
    const rows = await tx
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.id, id), notDeleted(gameSessions.deletedAt)))
      .for('update')
      .limit(1);
    return rows[0] ?? null;
  }

  public async recordScore(
    input: { sessionId: string; gameId: string; memberId: string; score: number },
    tx: Executor,
  ): Promise<void> {
    await tx.insert(gameScores).values(input);
  }

  public async recordReward(
    input: {
      sessionId: string;
      gameId: string;
      memberId: string;
      points: number;
      rewardTransactionId: string | null;
    },
    tx: Executor,
  ): Promise<void> {
    await tx.insert(gameRewards).values(input);
  }

  public async history(
    memberId: string,
    query: ListHistoryQuery,
  ): Promise<{ rows: HistoryRow[]; total: number }> {
    const { limit, offset } = normalizePagination(query);
    const where = and(eq(gameSessions.memberId, memberId), notDeleted(gameSessions.deletedAt));

    const rows = await this.db
      .select({
        sessionId: gameSessions.id,
        gameId: gameSessions.gameId,
        gameName: games.name,
        status: gameSessions.status,
        score: gameScores.score,
        pointsAwarded: gameRewards.points,
        playedAt: gameSessions.startedAt,
      })
      .from(gameSessions)
      .leftJoin(games, eq(gameSessions.gameId, games.id))
      .leftJoin(gameScores, eq(gameScores.sessionId, gameSessions.id))
      .leftJoin(gameRewards, eq(gameRewards.sessionId, gameSessions.id))
      .where(where)
      .orderBy(desc(gameSessions.startedAt))
      .limit(limit)
      .offset(offset);
    const totalRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(gameSessions)
      .where(where);
    return { rows, total: totalRows[0]?.value ?? 0 };
  }
}
