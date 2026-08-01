import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { StoreOrder, StoreOrderStatus } from '@superdreams/api-client';
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
import { ORDER_STATUS_META } from '../data';
import { useCancelOrder, useOrders } from '../hooks';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Fulfilled', value: 'FULFILLED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

function productSummary(order: StoreOrder): string {
  if (order.items.length === 0) return '—';
  const first = order.items[0]!.productName;
  return order.items.length > 1 ? `${first} +${order.items.length - 1} more` : first;
}

/** Dream Store admin — redemption orders backed by the real API. */
export default function OrdersPage() {
  const notify = useNotificationStore((state) => state.notify);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const ordersQuery = useOrders({
    page,
    pageSize: PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status: status as StoreOrderStatus } : {}),
  });
  const cancelOrder = useCancelOrder();

  const handleCancel = (order: StoreOrder): void => {
    if (!window.confirm(`Cancel order ${order.reference}? Points will be refunded to the member.`))
      return;
    cancelOrder.mutate(order.id, {
      onSuccess: (updated) =>
        notify({
          variant: 'success',
          title: 'Order cancelled',
          description: `${order.reference} — ${updated.totalPoints.toLocaleString()} points refunded.`,
        }),
      onError: (error) =>
        notify({ variant: 'error', title: 'Cancel failed', description: error.message }),
    });
  };

  const columns: DataTableColumn<StoreOrder>[] = [
    { id: 'reference', header: 'Reference', cell: (order) => order.reference },
    { id: 'member', header: 'Member', cell: (order) => order.memberName ?? '—' },
    { id: 'product', header: 'Products', cell: (order) => productSummary(order) },
    {
      id: 'points',
      header: 'Points',
      align: 'right',
      cell: (order) => order.totalPoints.toLocaleString(),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (order) => {
        const meta = ORDER_STATUS_META[order.status];
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      id: 'date',
      header: 'Date',
      align: 'right',
      cell: (order) => new Date(order.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Dream Store — Orders</title>
      </Helmet>
      <PageHeader title="Dream Store · Orders" description="Redemption orders from members." />

      <DreamStoreTabs />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search reference or member…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Filter by status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {ordersQuery.isError ? (
        <Alert variant="destructive" title="Could not load orders">
          {ordersQuery.error.message}
        </Alert>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={ordersQuery.data?.items ?? []}
            getRowId={(order) => order.id}
            isLoading={ordersQuery.isPending}
            emptyState="No orders match your filters."
            rowActions={(order) => (
              <Button
                variant="ghost"
                size="sm"
                disabled={order.status === 'CANCELLED' || cancelOrder.isPending}
                onClick={() => handleCancel(order)}
              >
                Cancel
              </Button>
            )}
          />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{ordersQuery.data?.total ?? 0} orders</p>
            <Pagination
              page={ordersQuery.data?.page ?? 1}
              pageCount={ordersQuery.data?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </>
  );
}
