import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import type { RedemptionRequestData, RedemptionRequestStatus } from '@superdreams/api-client';
import {
  Alert,
  Button,
  DataTable,
  Pagination,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { StatusBadge } from '../badges';
import { RedemptionReviewModal } from '../components/RedemptionReviewModal';
import { useRedemptionRequests } from '../hooks';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

/** Admin approval queue for member points-redemption requests. */
export default function RedemptionQueuePage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useRedemptionRequests({
    page,
    pageSize: PAGE_SIZE,
    status: status ? (status as RedemptionRequestStatus) : undefined,
    order: 'desc',
  });

  const columns: DataTableColumn<RedemptionRequestData>[] = [
    {
      id: 'member',
      header: 'Member',
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.memberId}</span>
      ),
    },
    {
      id: 'points',
      header: 'Points',
      align: 'right',
      cell: (row) => (
        <span className="font-medium tabular-nums">{row.pointsRequested.toLocaleString()}</span>
      ),
    },
    { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'note',
      header: 'Note',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.note ?? '—'}</span>,
    },
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
        <title>Redemption requests</title>
      </Helmet>
      <PageHeader
        title="Redemption requests"
        description="Review and decide member points-redemption requests"
      />

      <div className="mb-4 flex flex-wrap gap-3">
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
        <Alert variant="destructive" title="Could not load redemption requests">
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

      <RedemptionReviewModal requestId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
