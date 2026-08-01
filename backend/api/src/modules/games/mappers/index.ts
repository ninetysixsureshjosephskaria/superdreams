import type { GameData, GameHistoryItem, GameSessionData } from '../dto';
import type { GameRow } from '../repositories/game.repository';
import type { HistoryRow, SessionRow } from '../repositories/session.repository';

export function toGame(row: GameRow): GameData {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    entryCost: row.entryCost,
    minReward: row.minReward,
    maxReward: row.maxReward,
    maxScore: row.maxScore,
    status: row.status,
  };
}

export function toSession(
  row: SessionRow,
  gameName: string | null,
  entryCost: number,
): GameSessionData {
  return {
    id: row.id,
    gameId: row.gameId,
    gameName,
    memberId: row.memberId,
    status: row.status,
    entryCost,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
  };
}

export function toHistoryItem(row: HistoryRow): GameHistoryItem {
  return {
    sessionId: row.sessionId,
    gameId: row.gameId,
    gameName: row.gameName,
    status: row.status,
    score: row.score,
    pointsAwarded: row.pointsAwarded ?? 0,
    playedAt: row.playedAt,
  };
}
