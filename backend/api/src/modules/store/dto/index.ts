import type { z } from 'zod';

import type { PaginatedResult } from '@/database/types';

import type {
  adjustStockSchema,
  createCategorySchema,
  createProductSchema,
  listInventoryQuerySchema,
  listOrdersQuerySchema,
  listProductsQuerySchema,
  redeemSchema,
  updateCategorySchema,
  updateProductSchema,
} from '../validators';

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type OrderStatus = 'PENDING' | 'FULFILLED' | 'CANCELLED';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type InventoryChangeType = 'RESTOCK' | 'REDEMPTION' | 'CANCELLATION' | 'ADJUSTMENT';

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductData {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemData {
  id: string;
  productId: string;
  productName: string;
  points: number;
  quantity: number;
}

export interface OrderData {
  id: string;
  reference: string;
  memberId: string;
  memberName: string | null;
  status: OrderStatus;
  totalPoints: number;
  rewardTransactionId: string | null;
  refundTransactionId: string | null;
  items: OrderItemData[];
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}

export interface InventoryHistoryData {
  id: string;
  productId: string;
  changeType: InventoryChangeType;
  change: number;
  stockAfter: number;
  reason: string | null;
  createdAt: Date;
}

export interface RedeemResult {
  order: OrderData;
  pointsSpent: number;
  balanceAfter: number;
}

export type PaginatedProducts = PaginatedResult<ProductData>;
export type PaginatedOrders = PaginatedResult<OrderData>;

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type RedeemInput = z.infer<typeof redeemSchema>;

/** Actor + request context for auditing and authorship. */
export interface StoreActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
