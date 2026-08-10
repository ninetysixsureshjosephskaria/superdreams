import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { RewardTransactionData, RewardTransactionType } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DataTable,
  LoadingScreen,
  Pagination,
  Select,
  Tabs,
  type DataTableColumn,
} from '@superdreams/ui';

import { AllocateForm, RedeemForm, RewardAdjustForm } from '../components/PointsForm';
import { RewardTxnBadge } from '../components/RewardBadges';
import {
  useAdjustPoints,
  useAllocatePoints,
  useMemberRewardHistory,
  useMemberRewards,
  useRedeemPoints,
  useReverseRewardTransaction,
} from '../hooks';

const PAGE_SIZE = 10;

const TYPE_FILTER_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Earn', value: 'EARN' },
  { label: 'Redeem', value: 'REDEEM' },
  { label: 'Adjustment', value: 'ADJUSTMENT' },
  { label: 'Expire', value: 'EXPIRE' },
  { label: 'Reversal', value: 'REVERSAL' },
];

function BalanceCard({ label, value }: { label: string; value: number }) {
  return (
    <ContentCard>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</p>
    </ContentCard>
  );
}

function HistoryPanel({ memberId }: { memberId: string }) {
  const notify = useNotificationStore((state) => state.notify);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const reverse = useReverseRewardTransaction(memberId);

  const query = useMemberRewardHistory(memberId, {
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
    {
      id: 'points',
      header: 'Points',
      align: 'right',
      cell: (txn) => `${txn.direction === 'DEBIT' ? '-' : '+'}${txn.points.toLocaleString()}`,
    },
    {
      id: 'balance',
      header: 'Balance after',
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

  const canReverse = (txn: RewardTransactionData): boolean =>
    txn.status === 'POSTED' && ['EARN', 'REDEEM', 'ADJUSTMENT'].includes(txn.type);

  return (
    <div className="space-y-4">
      <div className="w-48">
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
        <Alert variant="destructive" title="Could not load history">
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
          getRowId={(txn) => txn.id}
          isLoading={query.isPending}
          rowActions={(txn) =>
            canReverse(txn) ? (
              <Button
                variant="ghost"
                size="sm"
                isLoading={reverse.isPending}
                onClick={() => {
                  reverse.mutate(txn.id, {
                    onSuccess: () => notify({ variant: 'success', title: 'Transaction reversed' }),
                    onError: (error) =>
                      notify({
                        variant: 'error',
                        title: 'Reversal failed',
                        description: error.message,
                      }),
                  });
                }}
              >
                Reverse
              </Button>
            ) : null
          }
        />
      )}
      {query.data ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} transactions</p>
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

function ActionsPanel({ memberId }: { memberId: string }) {
  const notify = useNotificationStore((state) => state.notify);
  const allocate = useAllocatePoints(memberId);
  const redeem = useRedeemPoints(memberId);
  const adjust = useAdjustPoints(memberId);
  const onError = (error: Error): void => {
    notify({ variant: 'error', title: 'Operation failed', description: error.message });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ContentCard title="Earn points">
        <AllocateForm
          isSubmitting={allocate.isPending}
          onSubmit={(values) => {
            allocate.mutate(
              { points: values.points, description: values.description },
              { onSuccess: () => notify({ variant: 'success', title: 'Points earned' }), onError },
            );
          }}
        />
      </ContentCard>
      <ContentCard title="Redeem points">
        <RedeemForm
          isSubmitting={redeem.isPending}
          onSubmit={(values) => {
            redeem.mutate(
              { points: values.points, note: values.note },
              {
                onSuccess: () => notify({ variant: 'success', title: 'Points redeemed' }),
                onError,
              },
            );
          }}
        />
      </ContentCard>
      <ContentCard title="Manual adjustment">
        <RewardAdjustForm
          isSubmitting={adjust.isPending}
          onSubmit={(values) => {
            adjust.mutate(
              { direction: values.direction, points: values.points, reason: values.reason },
              {
                onSuccess: () => notify({ variant: 'success', title: 'Adjustment posted' }),
                onError,
              },
            );
          }}
        />
      </ContentCard>
    </div>
  );
}

/** Admin member rewards: balance, history and earn/redeem/adjust actions. */
export default function MemberRewardsPage() {
  const { memberId = '' } = useParams();
  const navigate = useNavigate();
  const query = useMemberRewards(memberId);

  if (query.isPending) {
    return <LoadingScreen message="Loading member rewards…" />;
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="Member rewards" />
        <Alert variant="destructive" title="Could not load member rewards">
          <div className="space-y-3">
            <p>{query.error?.message ?? 'The member could not be found.'}</p>
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
        <div className="mt-4">
          <Button variant="ghost" onClick={() => navigate('/rewards')}>
            Back to programs
          </Button>
        </div>
      </>
    );
  }

  const balance = query.data;

  return (
    <>
      <Helmet>
        <title>Member rewards</title>
      </Helmet>
      <PageHeader title="Member rewards" description={`Member ${memberId}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <BalanceCard label="Points balance" value={balance.pointsBalance} />
        <BalanceCard label="Lifetime earned" value={balance.lifetimeEarned} />
        <BalanceCard label="Lifetime redeemed" value={balance.lifetimeRedeemed} />
      </div>

      <Tabs
        items={[
          { value: 'actions', label: 'Actions', content: <ActionsPanel memberId={memberId} /> },
          { value: 'history', label: 'History', content: <HistoryPanel memberId={memberId} /> },
        ]}
      />

      <div className="mt-6">
        <Button variant="ghost" onClick={() => navigate('/rewards')}>
          Back to programs
        </Button>
      </div>
    </>
  );
}
