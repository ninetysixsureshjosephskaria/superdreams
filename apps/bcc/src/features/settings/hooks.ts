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
  CreateFeatureToggleInput,
  FeatureToggleData,
  ListSettingsParams,
  MaintenanceInput,
  MaintenanceStatus,
  SettingCategoryData,
  SettingData,
  SettingHistoryData,
  SettingsHistoryParams,
  SettingsPaginated,
  UpdateFeatureToggleInput,
} from '@superdreams/api-client';

import { settingsApi } from './api';
import { settingKeys } from './query-keys';

export function useSettings(params: ListSettingsParams): UseQueryResult<SettingData[], ApiError> {
  return useQuery({
    queryKey: settingKeys.list(params),
    queryFn: () => settingsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useSettingCategories(): UseQueryResult<SettingCategoryData[], ApiError> {
  return useQuery({ queryKey: settingKeys.categories(), queryFn: () => settingsApi.categories() });
}

export function useSettingsHistory(
  params: SettingsHistoryParams,
): UseQueryResult<SettingsPaginated<SettingHistoryData>, ApiError> {
  return useQuery({
    queryKey: settingKeys.history(params),
    queryFn: () => settingsApi.history(params),
    placeholderData: keepPreviousData,
  });
}

export function useFeatureToggles(): UseQueryResult<FeatureToggleData[], ApiError> {
  return useQuery({
    queryKey: settingKeys.featureToggles(),
    queryFn: () => settingsApi.featureToggles(),
  });
}

export function useMaintenance(): UseQueryResult<MaintenanceStatus, ApiError> {
  return useQuery({
    queryKey: settingKeys.maintenance(),
    queryFn: () => settingsApi.maintenance(),
  });
}

export function useUpdateSettings(): UseMutationResult<
  SettingData[],
  ApiError,
  Record<string, unknown>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, unknown>) => settingsApi.update(updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingKeys.all });
    },
  });
}

export function useCreateFeatureToggle(): UseMutationResult<
  FeatureToggleData,
  ApiError,
  CreateFeatureToggleInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeatureToggleInput) => settingsApi.createFeatureToggle(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingKeys.featureToggles() });
    },
  });
}

export function useUpdateFeatureToggle(): UseMutationResult<
  FeatureToggleData,
  ApiError,
  { id: string; input: UpdateFeatureToggleInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => settingsApi.updateFeatureToggle(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingKeys.featureToggles() });
    },
  });
}

export function useSetMaintenance(): UseMutationResult<
  MaintenanceStatus,
  ApiError,
  MaintenanceInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MaintenanceInput) => settingsApi.setMaintenance(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingKeys.maintenance() });
    },
  });
}
