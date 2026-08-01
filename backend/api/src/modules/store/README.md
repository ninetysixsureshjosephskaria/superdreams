# Dream Store module

Reward-point storefront. Members redeem reward points for products; administrators
manage the catalog, inventory and redemption orders.

## Responsibilities

- **Catalog** — product categories and products (CRUD, archive, search/filter/sort).
- **Inventory** — signed, append-only stock movements (`store_inventory_history`)
  with a derived stock status (`IN_STOCK` / `LOW_STOCK` / `OUT_OF_STOCK`) from the
  product's `reorderLevel`.
- **Redemption** — a member spends reward points for a product. Runs in **one
  transaction**: lock the product row, verify status + stock, spend points through
  the Rewards ledger, create the order + line item, decrement stock, write an
  inventory movement, and audit. On failure nothing is committed.
- **Cancellation** — restocks each line item and refunds the points through the
  Rewards ledger, again in one transaction.

## Architecture

Follows the platform DNA: **Database → Repository → Service → Controller → Route**.
Point movements are **not re-implemented** here — the service composes the Rewards
module's transaction-aware seam (`spendPointsWithin` / `refundPointsWithin`) so the
ledger, projection and reward audit stay the single source of truth.

```
schema/store.ts          store_categories, store_products, store_orders,
                         store_order_items, store_inventory_history
repositories/            ProductRepository (row-lock, stock, search),
                         CategoryRepository, OrderRepository, InventoryRepository,
                         StoreAuditRepository
services/store.service   business rules + transactional redeem/cancel
controllers/             HTTP boundary (admin + member self-service)
routes/store.routes      /api/v1/dream-store/* (RBAC for admin, auth-only for member)
```

## Permissions

`store.read`, `store.product.manage`, `store.category.manage`,
`store.inventory.manage`, `store.order.manage`. Member self-service endpoints
(`/dream-store/catalog`, `/dream-store/redeem`, `/dream-store/me/orders`) require
authentication only.

## Endpoints

| Method | Path | Guard |
| --- | --- | --- |
| GET | `/api/v1/dream-store/catalog` | auth |
| POST | `/api/v1/dream-store/redeem` | auth |
| GET | `/api/v1/dream-store/me/orders` | auth |
| GET/POST | `/api/v1/dream-store/products` | `store.read` / `store.product.manage` |
| GET/PATCH/DELETE | `/api/v1/dream-store/products/:id` | `store.read` / `store.product.manage` |
| PATCH | `/api/v1/dream-store/products/:id/stock` | `store.inventory.manage` |
| GET | `/api/v1/dream-store/products/:id/inventory-history` | `store.read` |
| GET/POST/PATCH/DELETE | `/api/v1/dream-store/categories` | `store.read` / `store.category.manage` |
| GET | `/api/v1/dream-store/inventory` | `store.read` |
| GET | `/api/v1/dream-store/orders` `/orders/:id` | `store.read` |
| POST | `/api/v1/dream-store/orders/:id/cancel` | `store.order.manage` |

## Tests

`tests/store.integration.test.ts` (PGlite) covers: category+product creation with a
RESTOCK movement, atomic redemption (points deducted, order + item created, stock
decremented, audit written), cancellation (restock + refund), and the two rejection
paths (insufficient stock, insufficient reward balance) — each asserting no partial
state is committed.
