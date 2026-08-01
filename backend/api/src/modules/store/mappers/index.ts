import type {
  CategoryData,
  InventoryHistoryData,
  OrderData,
  OrderItemData,
  ProductData,
} from '../dto';
import type { CategoryRow } from '../repositories/category.repository';
import type { InventoryRow } from '../repositories/inventory.repository';
import type { OrderItemRow, OrderWithMember } from '../repositories/order.repository';
import { stockStatusOf, type ProductWithCategory } from '../repositories/product.repository';

export function toProduct(row: ProductWithCategory): ProductData {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    points: row.points,
    stock: row.stock,
    reorderLevel: row.reorderLevel,
    stockStatus: stockStatusOf(row.stock, row.reorderLevel),
    status: row.status,
    description: row.description,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCategory(row: CategoryRow, productCount: number): CategoryData {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    productCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toOrderItem(row: OrderItemRow): OrderItemData {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    points: row.points,
    quantity: row.quantity,
  };
}

export function toOrder(row: OrderWithMember, items: OrderItemRow[]): OrderData {
  return {
    id: row.id,
    reference: row.reference,
    memberId: row.memberId,
    memberName: row.memberName,
    status: row.status,
    totalPoints: row.totalPoints,
    rewardTransactionId: row.rewardTransactionId,
    refundTransactionId: row.refundTransactionId,
    items: items.map(toOrderItem),
    fulfilledAt: row.fulfilledAt,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
  };
}

export function toInventoryHistory(row: InventoryRow): InventoryHistoryData {
  return {
    id: row.id,
    productId: row.productId,
    changeType: row.changeType,
    change: row.change,
    stockAfter: row.stockAfter,
    reason: row.reason,
    createdAt: row.createdAt,
  };
}
