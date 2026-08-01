import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { ApiError, CampaignEnrollmentData, MemberCampaignView } from '@superdreams/api-client';

import { campaignsApi } from './api';
import { campaignKeys } from './query-keys';

export function useAvailableCampaigns(): UseQueryResult<MemberCampaignView[], ApiError> {
  return useQuery({
    queryKey: campaignKeys.available,
    queryFn: () => campaignsApi.available(),
    retry: 1,
  });
}

export function useMyCampaigns(): UseQueryResult<MemberCampaignView[], ApiError> {
  return useQuery({ queryKey: campaignKeys.mine, queryFn: () => campaignsApi.mine(), retry: 1 });
}

export function useEnrollCampaign(): UseMutationResult<CampaignEnrollmentData, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => campaignsApi.enroll(campaignId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}
