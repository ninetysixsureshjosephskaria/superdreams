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
  FinancialLimitsData,
  FinancialRequestData,
  ListFinancialRequestsParams,
  PaginatedFinancialRequests,
  UpdateFinancialLimitsInput,
} from '@superdreams/api-client';

import { financeApi } from './api';
import { financeKeys } from './query-keys';

/** Lists deposit / withdrawal requests (admin action queue). */
export function useFinanceRequests(
  params: ListFinancialRequestsParams,
): UseQueryResult<PaginatedFinancialRequests, ApiError> {
  return useQuery({
    queryKey: financeKeys.requestList(params),
    queryFn: () => financeApi.listRequests(params),
    placeholderData: keepPreviousData,
  });
}

/** System-wide deposit / withdrawal limits policy. */
export function useFinancialLimits(): UseQueryResult<FinancialLimitsData, ApiError> {
  return useQuery({ queryKey: financeKeys.limits(), queryFn: () => financeApi.getLimits() });
}

/** Updates the limits policy (requires finance.limits.manage). Refreshes on success. */
export function useUpdateLimits(): UseMutationResult<
  FinancialLimitsData,
  ApiError,
  UpdateFinancialLimitsInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFinancialLimitsInput) => financeApi.updateLimits(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeKeys.limits() });
    },
  });
}

/** A single request for the review/detail view. */
export function useFinanceRequest(id: string): UseQueryResult<FinancialRequestData, ApiError> {
  return useQuery({
    queryKey: financeKeys.requestDetail(id),
    queryFn: () => financeApi.getRequest(id),
    enabled: id !== '',
  });
}

/** Refreshes the queue lists + the affected request detail after a decision. */
function useDecisionInvalidation(): (id: string) => void {
  const queryClient = useQueryClient();
  return (id: string) => {
    void queryClient.invalidateQueries({ queryKey: financeKeys.requests() });
    void queryClient.invalidateQueries({ queryKey: financeKeys.requestDetail(id) });
  };
}

interface DecisionVars {
  id: string;
  reason?: string;
}

/**
 * Approves a request. The backend performs the transactional wallet movement,
 * tranche creation and audit — the frontend only invokes it and refreshes.
 */
export function useApproveRequest(): UseMutationResult<
  FinancialRequestData,
  ApiError,
  DecisionVars
> {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id, reason }: DecisionVars) =>
      financeApi.approveRequest(id, reason ? { reason } : undefined),
    onSuccess: (data) => invalidate(data.id),
  });
}

/** Rejects a request. Reason is required by the backend contract. */
export function useRejectRequest(): UseMutationResult<
  FinancialRequestData,
  ApiError,
  { id: string; reason: string }
> {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      financeApi.rejectRequest(id, { reason }),
    onSuccess: (data) => invalidate(data.id),
  });
}

/** Places a request on hold. */
export function useHoldRequest(): UseMutationResult<FinancialRequestData, ApiError, DecisionVars> {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id, reason }: DecisionVars) =>
      financeApi.holdRequest(id, reason ? { reason } : undefined),
    onSuccess: (data) => invalidate(data.id),
  });
}
