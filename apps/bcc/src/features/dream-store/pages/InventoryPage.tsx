import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { StockStatus, StoreProduct } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { DreamStoreTabs } from '../components/DreamStoreTabs';
import { StockAdjustDrawer } from '../components/StockAdjustDrawer';
import { STOCK_STATUS_META } from '../data';
import { useAdjustStock, useInventory } from '../hooks';
import type { StockAdjustFormValues } from '../validation';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: 'All stock', value: '' },
  { label: 'In stock', value: 'IN_STOCK' },
  { label: 'Low stock', value: 'LOW_STOCK' },
  { label: 'Out of stock', value: 'OUT_OF_STOCK' },
];

/** Dream Store admin — inventory / stock management backed by the real API. */
export default function InventoryPage() {
  const notify = useNotificationStore((state) => state.notify);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<StoreProduct | null>(null);

  const inventoryQuery = useInventory({
    page,
    pageSize: PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { stockStatus: status as StockStatus } : {}),
  });
  const adjustStock = useAdjustStock();

  const handleAdjust = (values: StockAdjustFormValues): void => {
    if (!adjustTarget) return;
    adjustStock.mutate(
      { id: adjustTarget.id, input: { change: values.change, reason: values.reason } },
      {
        onSuccess: (updated) => {
          notify({
            variant: 'success',
            title: 'Stock adjusted',
            description: `${updated.name} — new stock ${updated.stock.toLocaleString()}.`,
          });
          setAdjustTarget(null);
        },
        onError: (error) =>
          notify({ variant: 'error', title: 'Adjustment failed', description: error.message }),
      },
    );
  };

  const columns: DataTableColumn<StoreProduct>[] = [
    {
      id: 'name',
      header: 'Product',
      cell: (product) => (
        <div>
          <p className="font-medium">{product.name}</p>
          <p className="text-xs text-muted-foreground">{product.sku}</p>
        </div>
      ),
    },
    { id: 'category', header: 'Category', cell: (product) => product.categoryName ?? '—' },
    { id: 'stock', header: 'In stock', align: 'right', cell: (product) => product.stock },
    {
      id: 'reorder',
      header: 'Reorder level',
      align: 'right',
      cell: (product) => product.reorderLevel,
    },
    {
      id: 'status',
      header: 'Stock status',
      cell: (product) => {
        const meta = STOCK_STATUS_META[product.stockStatus];
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <Helmet>
        <title>Dream Store — Inventory</title>
      </Helmet>
      <PageHeader title="Dream Store · Inventory" description="Stock levels across the catalog." />

      <DreamStoreTabs />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search products or SKU…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Filter by stock status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {inventoryQuery.isError ? (
        <Alert variant="destructive" title="Could not load inventory">
          {inventoryQuery.error.message}
        </Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={inventoryQuery.data?.items ?? []}
            getRowId={(product) => product.id}
            isLoading={inventoryQuery.isPending}
            emptyState="No products match your filters."
            rowActions={(product) => (
              <Button variant="ghost" size="sm" onClick={() => setAdjustTarget(product)}>
                Adjust
              </Button>
            )}
          />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {inventoryQuery.data?.total ?? 0} products
            </p>
            <Pagination
              page={inventoryQuery.data?.page ?? 1}
              pageCount={inventoryQuery.data?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {adjustTarget ? (
        <StockAdjustDrawer
          isOpen
          onClose={() => setAdjustTarget(null)}
          product={adjustTarget}
          isSubmitting={adjustStock.isPending}
          onSubmit={handleAdjust}
        />
      ) : null}
    </>
  );
}
