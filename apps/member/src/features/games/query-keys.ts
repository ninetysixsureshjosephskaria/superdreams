import type { GameHistoryParams } from '@superdreams/api-client';

/** TanStack Query keys for the member's Games views. */
export const gameKeys = {
  all: ['games'] as const,
  list: ['games', 'list'] as const,
  history: (params: GameHistoryParams) => ['games', 'me', 'history', params] as const,
};
