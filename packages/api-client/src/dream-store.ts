import type { AxiosInstance } from 'axios';

/**
 * Dream Store API resource — the single, shared definition of the storefront HTTP
 * contract used by every application (no duplicated API logic). Reward points are
 * integers; JSON dates are strings over the wire.
 */

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type OrderStatus = 'PENDING' | 'FULFILLED' | 'CANCELLED';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type InventoryChangeType = 'RESTOCK' | 'REDEMPTION' | 'CANCELLATION' | 'ADJUSTMENT';

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  categoryName: string | null;
  points: number;
  stock: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  status: ProductStatus;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOrderItem {
  id: string;
  productId: string;
  productName: string;
  points: number;
  quantity: number;
}

export interface StoreOrder {
  id: string;
  reference: string;
  memberId: string;
  memberName: string | null;
  status: OrderStatus;
  totalPoints: number;
  rewardTransactionId: string | null;
  refundTransactionId: string | null;
  items: StoreOrderItem[];
  fulfilledAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface StoreInventoryHistory {
  id: string;
  productId: string;
  changeType: InventoryChangeType;
  change: number;
  stockAfter: number;
  reason: string | null;
  createdAt: string;
}

export interface StoreRedeemResult {
  order: StoreOrder;
  pointsSpent: number;
  balanceAfter: number;
}

export interface PaginatedProducts {
  items: StoreProduct[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedStoreOrders {
  items: StoreOrder[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type ProductSortField = 'createdAt' | 'name' | 'points' | 'stock';

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  sortBy?: ProductSortField;
  order?: 'asc' | 'desc';
}

export interface ListInventoryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  stockStatus?: StockStatus;
}

export interface ListStoreOrdersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OrderStatus;
  memberId?: string;
  sortBy?: 'createdAt' | 'totalPoints' | 'status';
  order?: 'asc' | 'desc';
}

export interface CreateProductInput {
  name: string;
  sku: string;
  categoryId?: string;
  points: number;
  stock?: number;
  reorderLevel?: number;
  status?: ProductStatus;
  description?: string;
  imageUrl?: string;
}

export interface UpdateProductInput {
  name?: string;
  categoryId?: string | null;
  points?: number;
  reorderLevel?: number;
  status?: ProductStatus;
  description?: string | null;
  imageUrl?: string | null;
}

export interface AdjustStockInput {
  change: number;
  reason: string;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface StoreRedeemInput {
  productId: string;
  quantity?: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface DreamStoreApi {
  // Member self-service.
  getCatalog(params?: ListProductsParams): Promise<PaginatedProducts>;
  redeem(input: StoreRedeemInput): Promise<StoreRedeemResult>;
  getMyOrders(params?: ListStoreOrdersParams): Promise<PaginatedStoreOrders>;
  // Products (admin).
  listProducts(params?: ListProductsParams): Promise<PaginatedProducts>;
  getProduct(id: string): Promise<StoreProduct>;
  createProduct(input: CreateProductInput): Promise<StoreProduct>;
  updateProduct(id: string, input: UpdateProductInput): Promise<StoreProduct>;
  archiveProduct(id: string): Promise<{ archived: boolean }>;
  adjustStock(id: string, input: AdjustStockInput): Promise<StoreProduct>;
  getInventoryHistory(id: string): Promise<StoreInventoryHistory[]>;
  // Categories (admin).
  listCategories(params?: { search?: string; includeInactive?: boolean }): Promise<StoreCategory[]>;
  createCategory(input: CreateCategoryInput): Promise<StoreCategory>;
  updateCategory(id: string, input: UpdateCategoryInput): Promise<StoreCategory>;
  deleteCategory(id: string): Promise<{ deleted: boolean }>;
  // Inventory (admin).
  listInventory(params?: ListInventoryParams): Promise<PaginatedProducts>;
  // Orders (admin).
  listOrders(params?: ListStoreOrdersParams): Promise<PaginatedStoreOrders>;
  getOrder(id: string): Promise<StoreOrder>;
  cancelOrder(id: string): Promise<StoreOrder>;
}

/** Binds the Dream Store resource to a configured API client. */
export function createDreamStoreApi(client: AxiosInstance): DreamStoreApi {
  const base = '/api/v1/dream-store';
  return {
    async getCatalog(params) {
      const response = await client.get<Envelope<PaginatedProducts>>(`${base}/catalog`, { params });
      return response.data.data;
    },
    async redeem(input) {
      const response = await client.post<Envelope<StoreRedeemResult>>(`${base}/redeem`, input);
      return response.data.data;
    },
    async getMyOrders(params) {
      const response = await client.get<Envelope<PaginatedStoreOrders>>(`${base}/me/orders`, {
        params,
      });
      return response.data.data;
    },
    async listProducts(params) {
      const response = await client.get<Envelope<PaginatedProducts>>(`${base}/products`, {
        params,
      });
      return response.data.data;
    },
    async getProduct(id) {
      const response = await client.get<Envelope<StoreProduct>>(`${base}/products/${id}`);
      return response.data.data;
    },
    async createProduct(input) {
      const response = await client.post<Envelope<StoreProduct>>(`${base}/products`, input);
      return response.data.data;
    },
    async updateProduct(id, input) {
      const response = await client.patch<Envelope<StoreProduct>>(`${base}/products/${id}`, input);
      return response.data.data;
    },
    async archiveProduct(id) {
      const response = await client.delete<Envelope<{ archived: boolean }>>(
        `${base}/products/${id}`,
      );
      return response.data.data;
    },
    async adjustStock(id, input) {
      const response = await client.patch<Envelope<StoreProduct>>(
        `${base}/products/${id}/stock`,
        input,
      );
      return response.data.data;
    },
    async getInventoryHistory(id) {
      const response = await client.get<ItemsEnvelope<StoreInventoryHistory>>(
        `${base}/products/${id}/inventory-history`,
      );
      return response.data.data.items;
    },
    async listCategories(params) {
      const response = await client.get<ItemsEnvelope<StoreCategory>>(`${base}/categories`, {
        params,
      });
      return response.data.data.items;
    },
    async createCategory(input) {
      const response = await client.post<Envelope<StoreCategory>>(`${base}/categories`, input);
      return response.data.data;
    },
    async updateCategory(id, input) {
      const response = await client.patch<Envelope<StoreCategory>>(
        `${base}/categories/${id}`,
        input,
      );
      return response.data.data;
    },
    async deleteCategory(id) {
      const response = await client.delete<Envelope<{ deleted: boolean }>>(
        `${base}/categories/${id}`,
      );
      return response.data.data;
    },
    async listInventory(params) {
      const response = await client.get<Envelope<PaginatedProducts>>(`${base}/inventory`, {
        params,
      });
      return response.data.data;
    },
    async listOrders(params) {
      const response = await client.get<Envelope<PaginatedStoreOrders>>(`${base}/orders`, {
        params,
      });
      return response.data.data;
    },
    async getOrder(id) {
      const response = await client.get<Envelope<StoreOrder>>(`${base}/orders/${id}`);
      return response.data.data;
    },
    async cancelOrder(id) {
      const response = await client.post<Envelope<StoreOrder>>(`${base}/orders/${id}/cancel`);
      return response.data.data;
    },
  };
}
