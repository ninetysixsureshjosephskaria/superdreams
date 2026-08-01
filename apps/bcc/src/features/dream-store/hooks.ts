import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  AdjustStockInput,
  ApiError,
  CreateCategoryInput,
  CreateProductInput,
  ListInventoryParams,
  ListProductsParams,
  ListStoreOrdersParams,
  PaginatedProducts,
  PaginatedStoreOrders,
  StoreCategory,
  StoreInventoryHistory,
  StoreOrder,
  StoreProduct,
  UpdateCategoryInput,
  UpdateProductInput,
} from '@superdreams/api-client';

import { dreamStoreApi } from './api';
import { dreamStoreKeys } from './query-keys';

// --- Products ---------------------------------------------------------------

export function useProducts(
  params: ListProductsParams,
): UseQueryResult<PaginatedProducts, ApiError> {
  return useQuery({
    queryKey: dreamStoreKeys.productList(params),
    queryFn: () => dreamStoreApi.listProducts(params),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string): UseQueryResult<StoreProduct, ApiError> {
  return useQuery({
    queryKey: dreamStoreKeys.product(id),
    queryFn: () => dreamStoreApi.getProduct(id),
    enabled: id.length > 0,
  });
}

export function useCreateProduct(): UseMutationResult<StoreProduct, ApiError, CreateProductInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => dreamStoreApi.createProduct(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dreamStoreKeys.all });
    },
  });
}

export function useUpdateProduct(): UseMutationResult<
  StoreProduct,
  ApiError,
  { id: string; input: UpdateProductInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      dreamStoreApi.updateProduct(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dreamStoreKeys.all });
    },
  });
}

export function useArchiveProduct(): UseMutationResult<{ archived: boolean }, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dreamStoreApi.archiveProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dreamStoreKeys.all });
    },
  });
}

export function useAdjustStock(): UseMutationResult<
  StoreProduct,
  ApiError,
  { id: string; input: AdjustStockInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdjustStockInput }) =>
      dreamStoreApi.adjustStock(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dreamStoreKeys.all });
    },
  });
}

export function useInventoryHistory(id: string): UseQueryResult<StoreInventoryHistory[], ApiError> {
  return useQuery({
    queryKey: dreamStoreKeys.inventoryHistory(id),
    queryFn: () => dreamStoreApi.getInventoryHistory(id),
    enabled: id.length > 0,
  });
}

// --- Categories -------------------------------------------------------------

export function useCategories(params?: {
  search?: string;
  includeInactive?: boolean;
}): UseQueryResult<StoreCategory[], ApiError> {
  return useQuery({
    queryKey: dreamStoreKeys.categories(params),
    queryFn: () => dreamStoreApi.listCategories(params),
  });
}

export function useCreateCategory(): UseMutationResult<
  StoreCategory,
  ApiError,
  CreateCategoryInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => dreamStoreApi.createCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dreamStoreKeys.all });
    },
  });
}

export function useUpdateCategory(
  id: string,
): UseMutationResult<StoreCategory, ApiError, UpdateCategoryInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => dreamStoreApi.updateCategory(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dreamStoreKeys.all });
    },
  });
}

export function useDeleteCategory(): UseMutationResult<{ deleted: boolean }, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dreamStoreApi.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dreamStoreKeys.all });
    },
  });
}

// --- Inventory --------------------------------------------------------------

export function useInventory(
  params: ListInventoryParams,
): UseQueryResult<PaginatedProducts, ApiError> {
  return useQuery({
    queryKey: dreamStoreKeys.inventory(params),
    queryFn: () => dreamStoreApi.listInventory(params),
    placeholderData: keepPreviousData,
  });
}

// --- Orders -----------------------------------------------------------------

export function useOrders(
  params: ListStoreOrdersParams,
): UseQueryResult<PaginatedStoreOrders, ApiError> {
  return useQuery({
    queryKey: dreamStoreKeys.orderList(params),
    queryFn: () => dreamStoreApi.listOrders(params),
    placeholderData: keepPreviousData,
  });
}

export function useCancelOrder(): UseMutationResult<StoreOrder, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dreamStoreApi.cancelOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dreamStoreKeys.all });
    },
  });
}
