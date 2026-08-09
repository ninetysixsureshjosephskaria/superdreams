import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ActivationConfigData,
  ActivationSweepResult,
  ApiError,
  UpdateActivationConfigInput,
} from '@superdreams/api-client';

import { activationBonusApi } from './api';
import { activationBonusKeys } from './query-keys';

/** The single network-wide activation-bonus config. */
export function useActivationConfig(): UseQueryResult<ActivationConfigData, ApiError> {
  return useQuery({
    queryKey: activationBonusKeys.config(),
    queryFn: () => activationBonusApi.getConfig(),
  });
}

/** Updates the activation-bonus config (requires activation.bonus.manage). */
export function useUpdateActivationConfig(): UseMutationResult<
  ActivationConfigData,
  ApiError,
  UpdateActivationConfigInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateActivationConfigInput) => activationBonusApi.updateConfig(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: activationBonusKeys.config() });
    },
  });
}

/**
 * Runs the idempotent activation-qualification sweep (requires
 * activation.bonus.manage). The backend grants the bonus only to members who
 * genuinely qualify (2 referrals within 24h, active, not already granted); the
 * frontend only triggers it and reports the backend's granted count.
 */
export function useRunActivationSweep(): UseMutationResult<ActivationSweepResult, ApiError, void> {
  return useMutation({
    mutationFn: () => activationBonusApi.runSweep(),
  });
}
