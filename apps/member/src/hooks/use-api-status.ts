import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '@/constants';
import { fetchApiInfo, type ApiError, type ApiInfo } from '@/services';

/**
 * Server-state hook (TanStack Query) that reports API reachability using the
 * infrastructure metadata endpoint. Demonstrates the Axios → service → Query
 * wiring; it is not a business data hook.
 */
export function useApiStatus(): UseQueryResult<ApiInfo, ApiError> {
  return useQuery<ApiInfo, ApiError>({
    queryKey: queryKeys.system.info,
    queryFn: fetchApiInfo,
    retry: 1,
    staleTime: 30_000,
  });
}
