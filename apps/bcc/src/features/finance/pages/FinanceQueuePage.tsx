import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import type {
  FinancialRequestStatus,
  FinancialRequestType,
  FinancialRequestData,
} from '@superdreams/api-client';
import {
  Alert,
  Button,
  DataTable,
  Pagination,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { StatusBadge, TypeBadge } from '../badges';
import { RequestReviewModal } from '../components/RequestReviewModal';
import { usd } from '../format';
import { useFinanceRequests } from '../hooks';

const PAGE_SIZE = 20;

const TYPE_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Deposits', value: 'DEPOSIT' },
  { label: 'Withdrawals', value: 'WITHDRAW' },
];

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'On hold', value: 'HOLD' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

/** Admin action queue for deposit / withdrawal requests. */
export default function FinanceQueuePage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useFinanceRequests({
    page,
    pageSize: PAGE_SIZE,
    type: type ? (type as FinancialRequestType) : undefined,
    status: status ? (status as FinancialRequestStatus) : undefined,
    sortBy: 'createdAt',
    order: 'desc',
  });

  const columns: DataTableColumn<FinancialRequestData>[] = [
    { id: 'type', header: 'Type', cell: (row) => <TypeBadge type={row.type} /> },
    {
      id: 'requestNumber',
      header: 'Request',
      cell: (row) => <span className="tabular-nums">{row.requestNumber}</span>,
    },
    {
      id: 'member',
      header: 'Member',
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.memberId}</span>
      ),
    },
    {
      id: 'units',
      header: 'Units',
      align: 'right',
      cell: (row) => <span className="tabular-nums">{row.units.toLocaleString()}</span>,
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (row) => <span className="font-medium tabular-nums">{usd(row.amountCents)}</span>,
    },
    { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'createdAt',
      header: 'Submitted',
      align: 'right',
      cell: (row) => (
        <span className="tabular-nums">{new Date(row.createdAt).toLocaleString()}</span>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Action queue</title>
      </Helmet>
      <PageHeader
        title="Action queue"
        description="Review and decide deposit &amp; withdrawal requests"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            aria-label="Filter by type"
            options={TYPE_OPTIONS}
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-48">
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

      {query.isError ? (
        <Alert variant="destructive" title="Could not load the action queue">
          <div className="space-y-3">
            <p>{query.error.message}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={query.isPending}
          rowActions={(row) => (
            <Button size="sm" variant="outline" onClick={() => setSelectedId(row.id)}>
              Review
            </Button>
          )}
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} requests</p>
          <Pagination
            page={query.data.page}
            pageCount={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <RequestReviewModal requestId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
