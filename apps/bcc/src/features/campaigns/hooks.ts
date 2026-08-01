import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  AddTargetsInput,
  ApiError,
  CampaignDetail,
  CampaignExecutionData,
  CampaignHistoryData,
  ChangeCampaignStatusInput,
  CreateCampaignInput,
  ExecuteCampaignInput,
  ListCampaignsParams,
  ListEnrollmentsParams,
  PaginatedCampaigns,
  PaginatedEnrollments,
  ScheduleCampaignInput,
  UpdateCampaignInput,
} from '@superdreams/api-client';

import { campaignsApi } from './api';
import { campaignKeys } from './query-keys';

export function useCampaigns(
  params: ListCampaignsParams,
): UseQueryResult<PaginatedCampaigns, ApiError> {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => campaignsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCampaign(id: string): UseQueryResult<CampaignDetail, ApiError> {
  return useQuery({ queryKey: campaignKeys.detail(id), queryFn: () => campaignsApi.get(id) });
}

export function useCampaignEnrollments(
  id: string,
  params: ListEnrollmentsParams,
): UseQueryResult<PaginatedEnrollments, ApiError> {
  return useQuery({
    queryKey: campaignKeys.enrollments(id, params),
    queryFn: () => campaignsApi.enrollments(id, params),
    placeholderData: keepPreviousData,
  });
}

export function useCampaignHistory(id: string): UseQueryResult<CampaignHistoryData[], ApiError> {
  return useQuery({
    queryKey: campaignKeys.history(id),
    queryFn: () => campaignsApi.history(id),
  });
}

function useCampaignInvalidation(id: string): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
  };
}

export function useCreateCampaign(): UseMutationResult<
  CampaignDetail,
  ApiError,
  CreateCampaignInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => campaignsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

export function useUpdateCampaign(
  id: string,
): UseMutationResult<CampaignDetail, ApiError, UpdateCampaignInput> {
  const invalidate = useCampaignInvalidation(id);
  return useMutation({
    mutationFn: (input: UpdateCampaignInput) => campaignsApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useChangeCampaignStatus(
  id: string,
): UseMutationResult<CampaignDetail, ApiError, ChangeCampaignStatusInput> {
  const invalidate = useCampaignInvalidation(id);
  return useMutation({
    mutationFn: (input: ChangeCampaignStatusInput) => campaignsApi.changeStatus(id, input),
    onSuccess: invalidate,
  });
}

export function useScheduleCampaign(
  id: string,
): UseMutationResult<CampaignDetail, ApiError, ScheduleCampaignInput> {
  const invalidate = useCampaignInvalidation(id);
  return useMutation({
    mutationFn: (input: ScheduleCampaignInput) => campaignsApi.schedule(id, input),
    onSuccess: invalidate,
  });
}

export function useAddCampaignTargets(
  id: string,
): UseMutationResult<CampaignDetail, ApiError, AddTargetsInput> {
  const invalidate = useCampaignInvalidation(id);
  return useMutation({
    mutationFn: (input: AddTargetsInput) => campaignsApi.addTargets(id, input),
    onSuccess: invalidate,
  });
}

export function useExecuteCampaign(
  id: string,
): UseMutationResult<CampaignExecutionData, ApiError, ExecuteCampaignInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExecuteCampaignInput) => campaignsApi.execute(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
    },
  });
}
