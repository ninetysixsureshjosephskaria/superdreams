import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ApiError, NetworkMemberNode, ReferralSummary } from '@superdreams/api-client';

import { networkApi } from './api';
import { networkKeys } from './query-keys';

/** The member's own referral summary (direct + total downline counts). */
export function useMyNetworkSummary(): UseQueryResult<ReferralSummary, ApiError> {
  return useQuery({
    queryKey: networkKeys.me,
    queryFn: () => networkApi.getMyReferralSummary(),
  });
}

/** The member's direct referrals. */
export function useMyReferrals(): UseQueryResult<NetworkMemberNode[], ApiError> {
  return useQuery({
    queryKey: networkKeys.referrals,
    queryFn: () => networkApi.getMyReferrals(),
  });
}

/** The member's full downline (backend-scoped to the caller's subtree). */
export function useMyDownline(): UseQueryResult<NetworkMemberNode[], ApiError> {
  return useQuery({
    queryKey: networkKeys.downline,
    queryFn: () => networkApi.getMyDownline(),
  });
}
