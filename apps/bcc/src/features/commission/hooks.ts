import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ApiError,
  CommissionConfigView,
  CommissionTargetData,
  CreateCommissionTargetInput,
  SetDefaultTiersInput,
  UpdateReferralRateInput,
} from '@superdreams/api-client';

import { commissionApi } from './api';
import { commissionKeys } from './query-keys';

/** The commission config: referral rate, default tiers and date-ranged targets. */
export function useCommissionConfig(): UseQueryResult<CommissionConfigView, ApiError> {
  return useQuery({
    queryKey: commissionKeys.config(),
    queryFn: () => commissionApi.getConfig(),
  });
}

function useConfigInvalidation(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: commissionKeys.all });
  };
}

/** Updates the one-time member-referral rate (requires commission.manage). */
export function useUpdateReferralRate(): UseMutationResult<
  CommissionConfigView,
  ApiError,
  UpdateReferralRateInput
> {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: (input: UpdateReferralRateInput) => commissionApi.updateReferralRate(input),
    onSuccess: invalidate,
  });
}

/** Replaces the default commission tier table (requires commission.manage). */
export function useSetDefaultTiers(): UseMutationResult<
  CommissionConfigView,
  ApiError,
  SetDefaultTiersInput
> {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: (input: SetDefaultTiersInput) => commissionApi.setDefaultTiers(input),
    onSuccess: invalidate,
  });
}

/** Creates a date-ranged commission target (requires commission.manage). */
export function useCreateTarget(): UseMutationResult<
  CommissionTargetData,
  ApiError,
  CreateCommissionTargetInput
> {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: (input: CreateCommissionTargetInput) => commissionApi.createTarget(input),
    onSuccess: invalidate,
  });
}

/** Deletes a commission target by id (requires commission.manage). */
export function useDeleteTarget(): UseMutationResult<
  { id: string; deleted: boolean },
  ApiError,
  string
> {
  const invalidate = useConfigInvalidation();
  return useMutation({
    mutationFn: (id: string) => commissionApi.deleteTarget(id),
    onSuccess: invalidate,
  });
}
