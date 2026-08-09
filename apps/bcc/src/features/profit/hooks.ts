import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ApiError,
  DistributeProfitInput,
  PlanScheduleInput,
  ProfitDistributionData,
  ProfitHistoryParams,
  ProfitScheduleData,
  PublishScheduleInput,
  SetScheduleDayInput,
} from '@superdreams/api-client';

import { profitApi } from './api';
import { profitKeys } from './query-keys';

/** The monthly schedule (DRAFT or PUBLISHED). 404 → no schedule yet for that month. */
export function useProfitSchedule(month: string): UseQueryResult<ProfitScheduleData, ApiError> {
  return useQuery({
    queryKey: profitKeys.schedule(month),
    queryFn: () => profitApi.getSchedule(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
    retry: false,
  });
}

/** Distribution history for a date range (requires profit.distribute). */
export function useProfitHistory(
  params: ProfitHistoryParams,
  enabled: boolean,
): UseQueryResult<ProfitDistributionData[], ApiError> {
  return useQuery({
    queryKey: profitKeys.history(params),
    queryFn: () => profitApi.listHistory(params),
    enabled,
  });
}

function useScheduleInvalidation(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: profitKeys.all });
  };
}

/** Auto-plans a DRAFT monthly schedule (requires profit.schedule). */
export function usePlanSchedule(): UseMutationResult<
  ProfitScheduleData,
  ApiError,
  PlanScheduleInput
> {
  const invalidate = useScheduleInvalidation();
  return useMutation({
    mutationFn: (input: PlanScheduleInput) => profitApi.planSchedule(input),
    onSuccess: invalidate,
  });
}

/** Fine-tunes a single day of a DRAFT schedule (requires profit.schedule). */
export function useSetScheduleDay(): UseMutationResult<
  ProfitScheduleData,
  ApiError,
  SetScheduleDayInput
> {
  const invalidate = useScheduleInvalidation();
  return useMutation({
    mutationFn: (input: SetScheduleDayInput) => profitApi.setScheduleDay(input),
    onSuccess: invalidate,
  });
}

/** Publishes a DRAFT schedule (requires profit.schedule). */
export function usePublishSchedule(): UseMutationResult<
  ProfitScheduleData,
  ApiError,
  PublishScheduleInput
> {
  const invalidate = useScheduleInvalidation();
  return useMutation({
    mutationFn: (input: PublishScheduleInput) => profitApi.publishSchedule(input),
    onSuccess: invalidate,
  });
}

/**
 * Triggers the idempotent per-day distribution (requires profit.distribute).
 * The backend resolves published rates, computes each credit and moves the money;
 * this only invokes it and refreshes the schedule + history afterwards.
 */
export function useDistributeProfit(): UseMutationResult<
  ProfitDistributionData,
  ApiError,
  DistributeProfitInput
> {
  const invalidate = useScheduleInvalidation();
  return useMutation({
    mutationFn: (input: DistributeProfitInput) => profitApi.distribute(input),
    onSuccess: invalidate,
  });
}
