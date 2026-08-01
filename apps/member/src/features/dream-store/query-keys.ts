import type { ListProductsParams, ListStoreOrdersParams } from '@superdreams/api-client';

/** TanStack Query keys for the member's Dream Store self-service views. */
export const dreamStoreKeys = {
  all: ['dream-store'] as const,
  catalog: (params: ListProductsParams) => ['dream-store', 'catalog', params] as const,
  myOrders: (params: ListStoreOrdersParams) => ['dream-store', 'me', 'orders', params] as const,
};
