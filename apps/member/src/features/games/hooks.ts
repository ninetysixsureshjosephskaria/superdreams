import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ApiError,
  Game,
  GameHistoryParams,
  GamePlayResult,
  GameScoreResult,
  PaginatedGameHistory,
} from '@superdreams/api-client';

import { gamesApi } from './api';
import { gameKeys } from './query-keys';

export function useGames(): UseQueryResult<Game[], ApiError> {
  return useQuery({ queryKey: gameKeys.list, queryFn: () => gamesApi.listGames(), retry: 1 });
}

export function useMyGameHistory(
  params: GameHistoryParams = {},
): UseQueryResult<PaginatedGameHistory, ApiError> {
  return useQuery({
    queryKey: gameKeys.history(params),
    queryFn: () => gamesApi.getMyHistory(params),
    placeholderData: keepPreviousData,
  });
}

export function useStartGame(): UseMutationResult<GamePlayResult, ApiError, string> {
  return useMutation({ mutationFn: (gameId: string) => gamesApi.startGame(gameId) });
}

export function useSubmitScore(): UseMutationResult<
  GameScoreResult,
  ApiError,
  { sessionId: string; score: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, score }: { sessionId: string; score: number }) =>
      gamesApi.submitScore(sessionId, score),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gameKeys.all });
      // Playing spends/awards reward points — refresh any reward balance views.
      void queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
}
