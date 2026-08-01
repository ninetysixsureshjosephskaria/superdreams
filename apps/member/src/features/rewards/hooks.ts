import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import type {
  ApiError,
  MemberHistoryParams,
  MemberRewardBalance,
  PaginatedRewardTransactions,
} from '@superdreams/api-client';

import { rewardsApi } from './api';
import { rewardKeys } from './query-keys';

export function useMyRewards(): UseQueryResult<MemberRewardBalance, ApiError> {
  return useQuery({ queryKey: rewardKeys.me, queryFn: () => rewardsApi.getMine(), retry: 1 });
}

export function useMyRewardHistory(
  params: MemberHistoryParams,
): UseQueryResult<PaginatedRewardTransactions, ApiError> {
  return useQuery({
    queryKey: rewardKeys.history(params),
    queryFn: () => rewardsApi.getMyHistory(params),
    placeholderData: keepPreviousData,
  });
}
