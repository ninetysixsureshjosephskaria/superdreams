import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type {
  ApiError,
  ReportMemberRewardSummary,
  ReportMemberWalletSummary,
} from '@superdreams/api-client';

import { reportsApi } from './api';

const reportKeys = {
  walletSummary: ['reports', 'me', 'wallet-summary'] as const,
  rewardSummary: ['reports', 'me', 'reward-summary'] as const,
};

export function useMyWalletSummary(): UseQueryResult<ReportMemberWalletSummary, ApiError> {
  return useQuery({
    queryKey: reportKeys.walletSummary,
    queryFn: () => reportsApi.myWalletSummary(),
    retry: 1,
  });
}

export function useMyRewardSummary(): UseQueryResult<ReportMemberRewardSummary, ApiError> {
  return useQuery({
    queryKey: reportKeys.rewardSummary,
    queryFn: () => reportsApi.myRewardSummary(),
    retry: 1,
  });
}
