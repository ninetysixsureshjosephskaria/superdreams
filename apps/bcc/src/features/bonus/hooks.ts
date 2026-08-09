import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ApiError,
  BonusCampaignData,
  CreateBonusCampaignInput,
  UpdateBonusCampaignInput,
} from '@superdreams/api-client';

import { bonusApi } from './api';
import { bonusKeys } from './query-keys';

/** All bonus campaigns (status is derived server-side). */
export function useBonusCampaigns(): UseQueryResult<BonusCampaignData[], ApiError> {
  return useQuery({ queryKey: bonusKeys.list(), queryFn: () => bonusApi.list() });
}

function useBonusInvalidation(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: bonusKeys.all });
  };
}

/** Creates a bonus campaign (requires bonus.manage). */
export function useCreateBonusCampaign(): UseMutationResult<
  BonusCampaignData,
  ApiError,
  CreateBonusCampaignInput
> {
  const invalidate = useBonusInvalidation();
  return useMutation({
    mutationFn: (input: CreateBonusCampaignInput) => bonusApi.create(input),
    onSuccess: invalidate,
  });
}

/** Updates a bonus campaign (requires bonus.manage). */
export function useUpdateBonusCampaign(): UseMutationResult<
  BonusCampaignData,
  ApiError,
  { id: string; input: UpdateBonusCampaignInput }
> {
  const invalidate = useBonusInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBonusCampaignInput }) =>
      bonusApi.update(id, input),
    onSuccess: invalidate,
  });
}

/** Deletes (soft) a bonus campaign (requires bonus.manage). */
export function useDeleteBonusCampaign(): UseMutationResult<
  { id: string; deleted: boolean },
  ApiError,
  string
> {
  const invalidate = useBonusInvalidation();
  return useMutation({
    mutationFn: (id: string) => bonusApi.remove(id),
    onSuccess: invalidate,
  });
}
