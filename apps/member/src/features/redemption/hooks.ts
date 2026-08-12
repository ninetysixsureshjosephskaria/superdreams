import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ApiError,
  MemberRewardBalance,
  RedemptionRequestData,
  SubmitRedemptionRequestInput,
} from '@superdreams/api-client';

import { redemptionApi, rewardsApi } from './api';
import { redemptionKeys } from './query-keys';

/** The member's current points balance (read-only). */
export function useMyBalance(): UseQueryResult<MemberRewardBalance, ApiError> {
  return useQuery({
    queryKey: redemptionKeys.balance,
    queryFn: () => rewardsApi.getMine(),
    retry: 1,
  });
}

/** The member's latest redemption request (PENDING / APPROVED / REJECTED), or null. */
export function useMyRedemption(): UseQueryResult<RedemptionRequestData | null, ApiError> {
  return useQuery({
    queryKey: redemptionKeys.mine,
    queryFn: () => redemptionApi.getMine(),
    retry: 1,
  });
}

/** Submits a redemption request. Invalidates the member's request view (and balance). */
export function useSubmitRedemption(): UseMutationResult<
  RedemptionRequestData,
  ApiError,
  SubmitRedemptionRequestInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitRedemptionRequestInput) => redemptionApi.submit(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: redemptionKeys.all });
      void queryClient.invalidateQueries({ queryKey: redemptionKeys.balance });
    },
  });
}
