import type {
  ListInventoryParams,
  ListProductsParams,
  ListStoreOrdersParams,
} from '@superdreams/api-client';

/** TanStack Query keys for the Dream Store admin (predictable cache invalidation). */
export const dreamStoreKeys = {
  all: ['dream-store'] as const,
  products: () => [...dreamStoreKeys.all, 'products'] as const,
  productList: (params: ListProductsParams) =>
    [...dreamStoreKeys.products(), 'list', params] as const,
  product: (id: string) => [...dreamStoreKeys.products(), id] as const,
  inventoryHistory: (id: string) => [...dreamStoreKeys.product(id), 'inventory-history'] as const,
  categories: (params?: { search?: string; includeInactive?: boolean }) =>
    [...dreamStoreKeys.all, 'categories', params ?? {}] as const,
  inventory: (params: ListInventoryParams) => [...dreamStoreKeys.all, 'inventory', params] as const,
  orders: () => [...dreamStoreKeys.all, 'orders'] as const,
  orderList: (params: ListStoreOrdersParams) =>
    [...dreamStoreKeys.orders(), 'list', params] as const,
  order: (id: string) => [...dreamStoreKeys.orders(), id] as const,
};
