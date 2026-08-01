import type { ProductStatus, StockStatus, StoreOrderStatus } from '@superdreams/api-client';
import type { BadgeVariant } from '@superdreams/ui';

/**
 * Presentation metadata for the Dream Store admin. All catalog, order and
 * inventory data comes from the backend (`/api/v1/dream-store/*`); these maps
 * only translate status enums to badge labels and variants.
 */

export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; variant: BadgeVariant }> =
  {
    ACTIVE: { label: 'Active', variant: 'success' },
    DRAFT: { label: 'Draft', variant: 'secondary' },
    ARCHIVED: { label: 'Archived', variant: 'outline' },
  };

export const STOCK_STATUS_META: Record<StockStatus, { label: string; variant: BadgeVariant }> = {
  IN_STOCK: { label: 'In stock', variant: 'success' },
  LOW_STOCK: { label: 'Low stock', variant: 'warning' },
  OUT_OF_STOCK: { label: 'Out of stock', variant: 'destructive' },
};

export const ORDER_STATUS_META: Record<StoreOrderStatus, { label: string; variant: BadgeVariant }> =
  {
    PENDING: { label: 'Pending', variant: 'warning' },
    FULFILLED: { label: 'Fulfilled', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'destructive' },
  };

export function categoryStatusMeta(isActive: boolean): { label: string; variant: BadgeVariant } {
  return isActive
    ? { label: 'Active', variant: 'success' }
    : { label: 'Inactive', variant: 'secondary' };
}
