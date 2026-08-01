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
  ListProductsParams,
  ListStoreOrdersParams,
  PaginatedProducts,
  PaginatedStoreOrders,
  StoreRedeemInput,
  StoreRedeemResult,
} from '@superdreams/api-client';

import { dreamStoreApi } from './api';
import { dreamStoreKeys } from './query-keys';

export function useCatalog(
  params: ListProductsParams = {},
): UseQueryResult<PaginatedProducts, ApiError> {
  return useQuery({
    queryKey: dreamStoreKeys.catalog(params),
    queryFn: () => dreamStoreApi.getCatalog(params),
    placeholderData: keepPreviousData,
  });
}

export function useMyOrders(
  params: ListStoreOrdersParams = {},
): UseQueryResult<PaginatedStoreOrders, ApiError> {
  return useQuery({
    queryKey: dreamStoreKeys.myOrders(params),
    queryFn: () => dreamStoreApi.getMyOrders(params),
    placeholderData: keepPreviousData,
  });
}

/** Redeems a product. Invalidates the catalog, the member's orders and reward balance. */
export function useRedeem(): UseMutationResult<StoreRedeemResult, ApiError, StoreRedeemInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreRedeemInput) => dreamStoreApi.redeem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dreamStoreKeys.all });
      // The redemption spends reward points — refresh any reward balance views.
      void queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
}
