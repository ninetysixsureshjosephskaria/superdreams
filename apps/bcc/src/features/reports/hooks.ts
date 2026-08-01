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
  CreateExportInput,
  CreateScheduleInput,
  DashboardData,
  ListExportsParams,
  ListHistoryParams,
  ListReportsParams,
  ReportExecutionData,
  ReportExportData,
  ReportPaginated,
  ReportDefinitionData,
  ReportResult,
  ReportScheduleData,
  RunReportInput,
  SavedReportData,
  SaveReportInput,
} from '@superdreams/api-client';

import { reportsApi } from './api';
import { reportKeys } from './query-keys';

export function useReportDefinitions(
  params: ListReportsParams,
): UseQueryResult<ReportPaginated<ReportDefinitionData>, ApiError> {
  return useQuery({
    queryKey: reportKeys.definitions(params),
    queryFn: () => reportsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useReportDashboard(): UseQueryResult<DashboardData, ApiError> {
  return useQuery({ queryKey: reportKeys.dashboard(), queryFn: () => reportsApi.dashboard() });
}

export function useReportHistory(
  params: ListHistoryParams,
): UseQueryResult<ReportPaginated<ReportExecutionData>, ApiError> {
  return useQuery({
    queryKey: reportKeys.history(params),
    queryFn: () => reportsApi.history(params),
    placeholderData: keepPreviousData,
  });
}

export function useReportExports(
  params: ListExportsParams,
): UseQueryResult<ReportPaginated<ReportExportData>, ApiError> {
  return useQuery({
    queryKey: reportKeys.exports(params),
    queryFn: () => reportsApi.listExports(params),
    placeholderData: keepPreviousData,
  });
}

export function useReportSchedules(params: {
  page?: number;
  pageSize?: number;
}): UseQueryResult<ReportPaginated<ReportScheduleData>, ApiError> {
  return useQuery({
    queryKey: reportKeys.schedules(params),
    queryFn: () => reportsApi.listSchedules(params),
    placeholderData: keepPreviousData,
  });
}

export function useSavedReports(params: {
  page?: number;
  pageSize?: number;
}): UseQueryResult<ReportPaginated<SavedReportData>, ApiError> {
  return useQuery({
    queryKey: reportKeys.saved(params),
    queryFn: () => reportsApi.listSaved(params),
    placeholderData: keepPreviousData,
  });
}

export function useRunReport(): UseMutationResult<ReportResult, ApiError, RunReportInput> {
  return useMutation({ mutationFn: (input: RunReportInput) => reportsApi.run(input) });
}

export function useCreateExport(): UseMutationResult<
  ReportExportData,
  ApiError,
  CreateExportInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExportInput) => reportsApi.createExport(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useCreateSchedule(): UseMutationResult<
  ReportScheduleData,
  ApiError,
  CreateScheduleInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScheduleInput) => reportsApi.createSchedule(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useDeleteSchedule(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsApi.deleteSchedule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useSaveReport(): UseMutationResult<SavedReportData, ApiError, SaveReportInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveReportInput) => reportsApi.save(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
