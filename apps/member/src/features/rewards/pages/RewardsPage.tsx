import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import type { RewardTransactionData, RewardTransactionType } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  ContentCard,
  DataTable,
  LoadingScreen,
  Pagination,
  Select,
  type BadgeVariant,
  type DataTableColumn,
} from '@superdreams/ui';

import { useMyRewardHistory, useMyRewards } from '../hooks';

const PAGE_SIZE = 10;

const TYPE_FILTER_OPTIONS = [
  { label: 'All activity', value: '' },
  { label: 'Earned', value: 'EARN' },
  { label: 'Redeemed', value: 'REDEEM' },
  { label: 'Adjustments', value: 'ADJUSTMENT' },
  { label: 'Expired', value: 'EXPIRE' },
];

const variantByType: Record<RewardTransactionType, BadgeVariant> = {
  EARN: 'success',
  REDEEM: 'destructive',
  ADJUSTMENT: 'secondary',
  EXPIRE: 'warning',
  REVERSAL: 'outline',
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <ContentCard>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</p>
    </ContentCard>
  );
}

function HistoryPanel() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const query = useMyRewardHistory({
    page,
    pageSize: PAGE_SIZE,
    type: type ? (type as RewardTransactionType) : undefined,
  });

  const columns: DataTableColumn<RewardTransactionData>[] = [
    {
      id: 'type',
      header: 'Activity',
      cell: (txn) => (
        <Badge variant={variantByType[txn.type]}>
          {txn.type.charAt(0) + txn.type.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      id: 'points',
      header: 'Points',
      align: 'right',
      cell: (txn) => `${txn.direction === 'DEBIT' ? '-' : '+'}${txn.points.toLocaleString()}`,
    },
    {
      id: 'balance',
      header: 'Balance',
      align: 'right',
      cell: (txn) => txn.balanceAfter.toLocaleString(),
    },
    {
      id: 'date',
      header: 'Date',
      align: 'right',
      cell: (txn) => new Date(txn.createdAt).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="w-48">
        <Select
          aria-label="Filter activity"
          options={TYPE_FILTER_OPTIONS}
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
        />
      </div>
      {query.isError ? (
        <Alert variant="destructive" title="Could not load your rewards history">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(txn) => txn.id}
          isLoading={query.isPending}
        />
      )}
      {query.data ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} activities</p>
          <Pagination
            page={query.data.page}
            pageCount={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Member self-service rewards: points balance and history. */
export default function RewardsPage() {
  const query = useMyRewards();

  if (query.isPending) {
    return <LoadingScreen message="Loading your rewards…" />;
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="My rewards" />
        <Alert variant="destructive" title="Could not load your rewards">
          {query.error?.message ?? 'No reward account is linked to your profile yet.'}
        </Alert>
      </>
    );
  }

  const rewards = query.data;

  return (
    <>
      <Helmet>
        <title>My rewards</title>
      </Helmet>
      <PageHeader title="My rewards" description="Your points balance and activity." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Points balance" value={rewards.pointsBalance} />
        <StatCard label="Total earned" value={rewards.lifetimeEarned} />
        <StatCard label="Total redeemed" value={rewards.lifetimeRedeemed} />
      </div>

      <ContentCard title="Rewards history">
        <HistoryPanel />
      </ContentCard>
    </>
  );
}
