import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import type { TransactionType, WalletTransactionData } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  ContentCard,
  DataTable,
  EmptyState,
  LoadingScreen,
  Pagination,
  Select,
  Spinner,
  Tabs,
  type BadgeVariant,
  type DataTableColumn,
} from '@superdreams/ui';

import { useMyWallet, useMyWalletStatements, useMyWalletTransactions } from '../hooks';
import { formatMinor } from '../money';

const PAGE_SIZE = 10;

const TYPE_FILTER_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Credit', value: 'CREDIT' },
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Adjustment', value: 'ADJUSTMENT' },
  { label: 'Hold', value: 'HOLD' },
  { label: 'Release', value: 'RELEASE' },
];

const variantByType: Record<TransactionType, BadgeVariant> = {
  CREDIT: 'success',
  RELEASE: 'success',
  DEBIT: 'destructive',
  HOLD: 'warning',
  ADJUSTMENT: 'secondary',
  REVERSAL: 'outline',
};

function BalanceCard({
  label,
  minor,
  currency,
}: {
  label: string;
  minor: number;
  currency: string;
}) {
  return (
    <ContentCard>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{formatMinor(minor, currency)}</p>
    </ContentCard>
  );
}

function LedgerPanel() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const query = useMyWalletTransactions({
    page,
    pageSize: PAGE_SIZE,
    type: type ? (type as TransactionType) : undefined,
  });

  const columns: DataTableColumn<WalletTransactionData>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: (txn) => (
        <Badge variant={variantByType[txn.type]}>
          {txn.type.charAt(0) + txn.type.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (txn) =>
        `${txn.direction === 'DEBIT' ? '-' : '+'}${formatMinor(txn.amountMinor, txn.currencyCode)}`,
    },
    {
      id: 'balance',
      header: 'Balance',
      align: 'right',
      cell: (txn) => formatMinor(txn.availableAfterMinor, txn.currencyCode),
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

function StatementsPanel() {
  const query = useMyWalletStatements();
  if (query.isPending) {
    return <Spinner label="Loading statements" />;
  }
  if (!query.data || query.data.length === 0) {
    return <EmptyState title="No statements" description="Your statements will appear here." />;
  }
  return (
    <ul className="divide-y">
      {query.data.map((statement) => (
        <li key={statement.id} className="py-3 text-sm">
          <p className="font-medium">
            {new Date(statement.periodStart).toLocaleDateString()} –{' '}
            {new Date(statement.periodEnd).toLocaleDateString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Closing balance {formatMinor(statement.closingBalanceMinor, statement.currencyCode)} ·{' '}
            {statement.transactionCount} transactions
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Member self-service wallet: balance, transaction history and statements. */
export default function WalletPage() {
  const query = useMyWallet();

  if (query.isPending) {
    return <LoadingScreen message="Loading your wallet…" />;
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="My wallet" />
        <Alert variant="destructive" title="Could not load your wallet">
          {query.error?.message ?? 'No wallet is linked to your account yet.'}
        </Alert>
      </>
    );
  }

  const wallet = query.data;

  return (
    <>
      <Helmet>
        <title>My wallet</title>
      </Helmet>
      <PageHeader
        title="My wallet"
        description={`${wallet.walletNumber} · ${wallet.currencyCode}`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <BalanceCard
          label="Available"
          minor={wallet.balance.availableMinor}
          currency={wallet.currencyCode}
        />
        <BalanceCard label="Held" minor={wallet.balance.heldMinor} currency={wallet.currencyCode} />
        <BalanceCard
          label="Total"
          minor={wallet.balance.totalMinor}
          currency={wallet.currencyCode}
        />
      </div>

      <Tabs
        items={[
          { value: 'history', label: 'Transaction history', content: <LedgerPanel /> },
          { value: 'statements', label: 'Statements', content: <StatementsPanel /> },
        ]}
      />
    </>
  );
}
