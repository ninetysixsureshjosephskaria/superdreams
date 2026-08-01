import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import type { RewardTransactionData, RewardTransactionType } from '@superdreams/api-client';
import {
  Alert,
  Button,
  DataTable,
  Pagination,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { RewardTxnBadge } from '../components/RewardBadges';
import { useRewardTransactions } from '../hooks';

const PAGE_SIZE = 15;

const TYPE_FILTER_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Earn', value: 'EARN' },
  { label: 'Redeem', value: 'REDEEM' },
  { label: 'Adjustment', value: 'ADJUSTMENT' },
  { label: 'Expire', value: 'EXPIRE' },
  { label: 'Reversal', value: 'REVERSAL' },
];

/** Admin global reward ledger with type filter and pagination. */
export default function RewardTransactionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');

  const query = useRewardTransactions({
    page,
    pageSize: PAGE_SIZE,
    type: type ? (type as RewardTransactionType) : undefined,
  });

  const columns: DataTableColumn<RewardTransactionData>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: (txn) => <RewardTxnBadge type={txn.type} status={txn.status} />,
    },
    { id: 'reference', header: 'Reference', cell: (txn) => txn.reference },
    {
      id: 'points',
      header: 'Points',
      align: 'right',
      cell: (txn) => `${txn.direction === 'DEBIT' ? '-' : '+'}${txn.points.toLocaleString()}`,
    },
    {
      id: 'date',
      header: 'Date',
      align: 'right',
      cell: (txn) => new Date(txn.createdAt).toLocaleString(),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Reward transactions</title>
      </Helmet>
      <PageHeader title="Reward transactions" description="The global reward points ledger." />

      <div className="mb-4 w-48">
        <Select
          aria-label="Filter by type"
          options={TYPE_FILTER_OPTIONS}
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load transactions">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(txn) => txn.id}
          isLoading={query.isPending}
          rowActions={(txn) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/rewards/members/${txn.memberId}`)}
            >
              Member
            </Button>
          )}
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} transactions</p>
          <Pagination
            page={query.data.page}
            pageCount={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </>
  );
}
