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
  ListRedemptionRequestsParams,
  PaginatedRedemptionRequests,
  RedemptionRequestData,
} from '@superdreams/api-client';

import { redemptionApi } from './api';
import { redemptionKeys } from './query-keys';

/** Lists member points-redemption requests (admin approval queue). */
export function useRedemptionRequests(
  params: ListRedemptionRequestsParams,
): UseQueryResult<PaginatedRedemptionRequests, ApiError> {
  return useQuery({
    queryKey: redemptionKeys.requestList(params),
    queryFn: () => redemptionApi.list(params),
    placeholderData: keepPreviousData,
  });
}

/** A single request for the review/detail view. */
export function useRedemptionRequest(id: string): UseQueryResult<RedemptionRequestData, ApiError> {
  return useQuery({
    queryKey: redemptionKeys.requestDetail(id),
    queryFn: () => redemptionApi.get(id),
    enabled: id !== '',
  });
}

/** Refreshes the queue lists + the affected request detail after a decision. */
function useDecisionInvalidation(): (id: string) => void {
  const queryClient = useQueryClient();
  return (id: string) => {
    void queryClient.invalidateQueries({ queryKey: redemptionKeys.requests() });
    void queryClient.invalidateQueries({ queryKey: redemptionKeys.requestDetail(id) });
  };
}

/**
 * Approves a request. The backend debits the points, records the completed
 * redemption, marks the request APPROVED and audits — all transactionally. The
 * frontend only invokes it and refreshes.
 */
export function useApproveRedemption(): UseMutationResult<
  RedemptionRequestData,
  ApiError,
  { id: string }
> {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => redemptionApi.approve(id),
    onSuccess: (data) => invalidate(data.id),
  });
}

/** Rejects a request (reason optional). No points move. */
export function useRejectRedemption(): UseMutationResult<
  RedemptionRequestData,
  ApiError,
  { id: string; reason?: string }
> {
  const invalidate = useDecisionInvalidation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      redemptionApi.reject(id, reason ? { reason } : undefined),
    onSuccess: (data) => invalidate(data.id),
  });
}
