import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import {
  Alert,
  ContentCard,
  DataTable,
  EmptyState,
  Spinner,
  StatCard,
  type DataTableColumn,
} from '@superdreams/ui';

import { useMyRewardSummary, useMyWalletSummary } from '../hooks';

interface WalletLine {
  reference: string;
  type: string;
  direction: string;
  amountMinor: number;
  description: string | null;
  createdAt: string;
}

interface RewardLine {
  reference: string;
  type: string;
  direction: string;
  points: number;
  description: string | null;
  createdAt: string;
}

function formatMinor(minor: number): string {
  return (minor / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

/** Member statements: a read-only summary of the member's own wallet and rewards. */
export default function StatementsPage() {
  const wallet = useMyWalletSummary();
  const rewards = useMyRewardSummary();

  const walletColumns: DataTableColumn<WalletLine>[] = [
    { id: 'type', header: 'Type', cell: (t) => t.type },
    { id: 'description', header: 'Description', cell: (t) => t.description ?? '—' },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (t) => `${t.direction === 'DEBIT' ? '-' : '+'}${formatMinor(t.amountMinor)}`,
    },
    {
      id: 'date',
      header: 'Date',
      align: 'right',
      cell: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
  ];

  const rewardColumns: DataTableColumn<RewardLine>[] = [
    { id: 'type', header: 'Type', cell: (t) => t.type },
    { id: 'description', header: 'Description', cell: (t) => t.description ?? '—' },
    {
      id: 'points',
      header: 'Points',
      align: 'right',
      cell: (t) => `${t.direction === 'DEBIT' ? '-' : '+'}${t.points.toLocaleString()}`,
    },
    {
      id: 'date',
      header: 'Date',
      align: 'right',
      cell: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Statements</title>
      </Helmet>
      <PageHeader title="Statements" description="Your wallet and reward summaries." />

      <ContentCard title="Wallet summary" className="mb-6">
        {wallet.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : wallet.isError ? (
          <Alert variant="destructive" title="Could not load your wallet summary">
            {wallet.error.message}
          </Alert>
        ) : wallet.data && wallet.data.hasWallet ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Available" value={formatMinor(wallet.data.availableMinor)} />
              <StatCard label="Held" value={formatMinor(wallet.data.heldMinor)} />
              <StatCard label="Total" value={formatMinor(wallet.data.totalMinor)} />
            </div>
            <DataTable
              columns={walletColumns}
              rows={wallet.data.recentTransactions}
              getRowId={(t) => t.reference}
            />
          </>
        ) : (
          <EmptyState title="No wallet" description="You do not have a wallet yet." />
        )}
      </ContentCard>

      <ContentCard title="Reward history summary">
        {rewards.isPending ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : rewards.isError ? (
          <Alert variant="destructive" title="Could not load your reward summary">
            {rewards.error.message}
          </Alert>
        ) : rewards.data ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Points balance"
                value={rewards.data.pointsBalance.toLocaleString()}
              />
              <StatCard
                label="Lifetime earned"
                value={rewards.data.lifetimeEarned.toLocaleString()}
              />
              <StatCard
                label="Lifetime redeemed"
                value={rewards.data.lifetimeRedeemed.toLocaleString()}
              />
            </div>
            <DataTable
              columns={rewardColumns}
              rows={rewards.data.recentTransactions}
              getRowId={(t) => t.reference}
            />
          </>
        ) : null}
      </ContentCard>
    </>
  );
}
