import type { z } from 'zod';

import type { PaginatedResult } from '@/database/types';

import type { listHistoryQuerySchema, submitScoreSchema } from '../validators';

export type GameStatus = 'ACTIVE' | 'INACTIVE';
export type SessionStatus = 'STARTED' | 'COMPLETED' | 'ABANDONED';

export interface GameData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entryCost: number;
  minReward: number;
  maxReward: number;
  maxScore: number;
  status: GameStatus;
}

export interface GameSessionData {
  id: string;
  gameId: string;
  gameName: string | null;
  memberId: string;
  status: SessionStatus;
  entryCost: number;
  startedAt: Date;
  endedAt: Date | null;
}

export interface PlayResult {
  session: GameSessionData;
  entryCharged: number;
  balanceAfter: number;
}

export interface ScoreResult {
  sessionId: string;
  gameId: string;
  gameName: string | null;
  score: number;
  pointsAwarded: number;
  balanceAfter: number;
}

export interface GameHistoryItem {
  sessionId: string;
  gameId: string;
  gameName: string | null;
  status: SessionStatus;
  score: number | null;
  pointsAwarded: number;
  playedAt: Date;
}

export type PaginatedHistory = PaginatedResult<GameHistoryItem>;

export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;
export type ListHistoryQuery = z.infer<typeof listHistoryQuerySchema>;

/** Actor + request context for auditing and authorship. */
export interface GameActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
