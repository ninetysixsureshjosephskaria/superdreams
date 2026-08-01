import type { AxiosInstance } from 'axios';

/**
 * Games API resource — the single, shared definition of the games HTTP contract
 * used by the Member Portal (no duplicated API logic). Reward points are integers;
 * JSON dates are strings over the wire.
 */

export type GameStatus = 'ACTIVE' | 'INACTIVE';
export type GameSessionStatus = 'STARTED' | 'COMPLETED' | 'ABANDONED';

export interface Game {
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

export interface GameSession {
  id: string;
  gameId: string;
  gameName: string | null;
  memberId: string;
  status: GameSessionStatus;
  entryCost: number;
  startedAt: string;
  endedAt: string | null;
}

export interface GamePlayResult {
  session: GameSession;
  entryCharged: number;
  balanceAfter: number;
}

export interface GameScoreResult {
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
  status: GameSessionStatus;
  score: number | null;
  pointsAwarded: number;
  playedAt: string;
}

export interface PaginatedGameHistory {
  items: GameHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GameHistoryParams {
  page?: number;
  pageSize?: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface GamesApi {
  listGames(): Promise<Game[]>;
  startGame(gameId: string): Promise<GamePlayResult>;
  submitScore(sessionId: string, score: number): Promise<GameScoreResult>;
  getMyHistory(params?: GameHistoryParams): Promise<PaginatedGameHistory>;
}

/** Binds the games resource to a configured API client. */
export function createGamesApi(client: AxiosInstance): GamesApi {
  const base = '/api/v1/games';
  return {
    async listGames() {
      const response = await client.get<ItemsEnvelope<Game>>(base);
      return response.data.data.items;
    },
    async startGame(gameId) {
      const response = await client.post<Envelope<GamePlayResult>>(`${base}/${gameId}/start`);
      return response.data.data;
    },
    async submitScore(sessionId, score) {
      const response = await client.post<Envelope<GameScoreResult>>(
        `${base}/sessions/${sessionId}/score`,
        { score },
      );
      return response.data.data;
    },
    async getMyHistory(params) {
      const response = await client.get<Envelope<PaginatedGameHistory>>(`${base}/me/history`, {
        params,
      });
      return response.data.data;
    },
  };
}
