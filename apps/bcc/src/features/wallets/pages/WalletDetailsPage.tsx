import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { TransactionType, WalletDetail, WalletTransactionData } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DataTable,
  DropdownMenu,
  EmptyState,
  Icon,
  LoadingScreen,
  Pagination,
  Select,
  Spinner,
  Tabs,
  type DataTableColumn,
} from '@superdreams/ui';

import { AdjustmentForm } from '../components/AdjustmentForm';
import { AmountForm } from '../components/AmountForm';
import { TransactionTypeBadge } from '../components/TransactionTypeBadge';
import { WalletStatusBadge } from '../components/WalletStatusBadge';
import {
  useAdjustWallet,
  useChangeWalletStatus,
  useCreditWallet,
  useDebitWallet,
  useGenerateStatement,
  usePlaceHold,
  useReleaseHold,
  useReverseTransaction,
  useWallet,
  useWalletHolds,
  useWalletStatements,
  useWalletTransactions,
} from '../hooks';
import { formatMinor, toMinor } from '../money';

const PAGE_SIZE = 10;

const TYPE_FILTER_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Credit', value: 'CREDIT' },
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Adjustment', value: 'ADJUSTMENT' },
  { label: 'Hold', value: 'HOLD' },
  { label: 'Release', value: 'RELEASE' },
  { label: 'Reversal', value: 'REVERSAL' },
];

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

function OverviewPanel({ wallet }: { wallet: WalletDetail }) {
  const notify = useNotificationStore((state) => state.notify);
  const credit = useCreditWallet(wallet.id);
  const debit = useDebitWallet(wallet.id);
  const adjust = useAdjustWallet(wallet.id);
  const placeHold = usePlaceHold(wallet.id);

  const disabled = wallet.status !== 'ACTIVE';
  const onError = (error: Error): void => {
    notify({ variant: 'error', title: 'Operation failed', description: error.message });
  };

  return (
    <div className="space-y-4">
      {disabled ? (
        <Alert variant="warning" title="Wallet is not active">
          Credit, debit and hold actions require an active wallet.
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Credit funds">
          <AmountForm
            submitLabel="Credit"
            isSubmitting={credit.isPending}
            onSubmit={(values) => {
              credit.mutate(
                {
                  amountMinor: toMinor(values.amount),
                  description: values.description,
                },
                {
                  onSuccess: () => notify({ variant: 'success', title: 'Wallet credited' }),
                  onError,
                },
              );
            }}
          />
        </ContentCard>
        <ContentCard title="Debit funds">
          <AmountForm
            submitLabel="Debit"
            isSubmitting={debit.isPending}
            onSubmit={(values) => {
              debit.mutate(
                { amountMinor: toMinor(values.amount), description: values.description },
                {
                  onSuccess: () => notify({ variant: 'success', title: 'Wallet debited' }),
                  onError,
                },
              );
            }}
          />
        </ContentCard>
        <ContentCard title="Manual adjustment">
          <AdjustmentForm
            isSubmitting={adjust.isPending}
            onSubmit={(values) => {
              adjust.mutate(
                {
                  direction: values.direction,
                  amountMinor: toMinor(values.amount),
                  reason: values.reason,
                },
                {
                  onSuccess: () => notify({ variant: 'success', title: 'Adjustment posted' }),
                  onError,
                },
              );
            }}
          />
        </ContentCard>
        <ContentCard title="Place hold">
          <AmountForm
            submitLabel="Place hold"
            isSubmitting={placeHold.isPending}
            withDescription={false}
            onSubmit={(values) => {
              placeHold.mutate(
                { amountMinor: toMinor(values.amount) },
                {
                  onSuccess: () => notify({ variant: 'success', title: 'Hold placed' }),
                  onError,
                },
              );
            }}
          />
        </ContentCard>
      </div>
      {wallet.limits ? (
        <ContentCard title="Limits">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Minimum balance</dt>
              <dd>{formatMinor(wallet.limits.minBalanceMinor, wallet.currencyCode)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Allow negative</dt>
              <dd>{wallet.limits.allowNegative ? 'Yes' : 'No'}</dd>
            </div>
            {wallet.limits.singleTransactionLimitMinor != null ? (
              <div>
                <dt className="text-muted-foreground">Per-transaction limit</dt>
                <dd>
                  {formatMinor(wallet.limits.singleTransactionLimitMinor, wallet.currencyCode)}
                </dd>
              </div>
            ) : null}
            {wallet.limits.maxBalanceMinor != null ? (
              <div>
                <dt className="text-muted-foreground">Maximum balance</dt>
                <dd>{formatMinor(wallet.limits.maxBalanceMinor, wallet.currencyCode)}</dd>
              </div>
            ) : null}
          </dl>
        </ContentCard>
      ) : null}
    </div>
  );
}

function LedgerPanel({ wallet }: { wallet: WalletDetail }) {
  const notify = useNotificationStore((state) => state.notify);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const reverse = useReverseTransaction(wallet.id);

  const query = useWalletTransactions(wallet.id, {
    page,
    pageSize: PAGE_SIZE,
    type: type ? (type as TransactionType) : undefined,
  });

  const columns: DataTableColumn<WalletTransactionData>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: (txn) => <TransactionTypeBadge type={txn.type} status={txn.status} />,
    },
    { id: 'reference', header: 'Reference', cell: (txn) => txn.reference },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (txn) =>
        `${txn.direction === 'DEBIT' ? '-' : '+'}${formatMinor(txn.amountMinor, txn.currencyCode)}`,
    },
    {
      id: 'available',
      header: 'Available after',
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

  const canReverse = (txn: WalletTransactionData): boolean =>
    txn.status === 'POSTED' && ['CREDIT', 'DEBIT', 'ADJUSTMENT'].includes(txn.type);

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

function HoldsPanel({ wallet }: { wallet: WalletDetail }) {
  const notify = useNotificationStore((state) => state.notify);
  const query = useWalletHolds(wallet.id);
  const release = useReleaseHold(wallet.id);

  if (query.isPending) {
    return <Spinner label="Loading holds" />;
  }
  if (!query.data || query.data.length === 0) {
    return <EmptyState title="No holds" description="Active and released holds appear here." />;
  }

  return (
    <ul className="divide-y">
      {query.data.map((hold) => (
        <li key={hold.id} className="flex items-center justify-between py-3 text-sm">
          <div>
            <p className="font-medium">{formatMinor(hold.amountMinor, hold.currencyCode)}</p>
            <p className="text-xs text-muted-foreground">
              {hold.reference} · {hold.status}
              {hold.reason ? ` · ${hold.reason}` : ''}
            </p>
          </div>
          {hold.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              size="sm"
              isLoading={release.isPending}
              onClick={() => {
                release.mutate(hold.id, {
                  onSuccess: () => notify({ variant: 'success', title: 'Hold released' }),
                  onError: (error) =>
                    notify({
                      variant: 'error',
                      title: 'Release failed',
                      description: error.message,
                    }),
                });
              }}
            >
              Release
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function StatementsPanel({ wallet }: { wallet: WalletDetail }) {
  const notify = useNotificationStore((state) => state.notify);
  const query = useWalletStatements(wallet.id);
  const generate = useGenerateStatement(wallet.id);

  return (
    <div className="space-y-4">
      <Button
        isLoading={generate.isPending}
        onClick={() => {
          generate.mutate(undefined, {
            onSuccess: () => notify({ variant: 'success', title: 'Statement generated' }),
          });
        }}
      >
        Generate statement
      </Button>
      {query.isPending ? (
        <Spinner label="Loading statements" />
      ) : query.data && query.data.length > 0 ? (
        <ul className="divide-y">
          {query.data.map((statement) => (
            <li key={statement.id} className="py-3 text-sm">
              <p className="font-medium">
                {new Date(statement.periodStart).toLocaleDateString()} –{' '}
                {new Date(statement.periodEnd).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Closing {formatMinor(statement.closingBalanceMinor, statement.currencyCode)} ·{' '}
                {statement.transactionCount} transactions · +
                {formatMinor(statement.totalCreditsMinor, statement.currencyCode)} / -
                {formatMinor(statement.totalDebitsMinor, statement.currencyCode)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No statements" description="Generate a statement to see it here." />
      )}
    </div>
  );
}

/** Admin wallet details: balance, lifecycle actions and ledger/holds/statements tabs. */
export default function WalletDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const walletQuery = useWallet(id);
  const changeStatus = useChangeWalletStatus(id);

  if (walletQuery.isPending) {
    return <LoadingScreen message="Loading wallet…" />;
  }
  if (walletQuery.isError || !walletQuery.data) {
    return (
      <Alert variant="destructive" title="Could not load wallet">
        {walletQuery.error?.message ?? 'The wallet could not be found.'}
      </Alert>
    );
  }

  const wallet = walletQuery.data;
  const setStatus = (status: WalletDetail['status'], label: string): void => {
    changeStatus.mutate(
      { status },
      {
        onSuccess: () => notify({ variant: 'success', title: `Wallet ${label}` }),
        onError: (error) =>
          notify({ variant: 'error', title: 'Status change failed', description: error.message }),
      },
    );
  };

  return (
    <>
      <Helmet>
        <title>{wallet.walletNumber}</title>
      </Helmet>
      <PageHeader
        title={wallet.walletNumber}
        description={`${wallet.currencyCode} wallet`}
        actions={
          <div className="flex items-center gap-2">
            <WalletStatusBadge status={wallet.status} />
            <DropdownMenu
              align="end"
              triggerClassName="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              trigger={
                <>
                  <Icon name="more-horizontal" size="sm" />
                  <span className="sr-only">Wallet actions</span>
                </>
              }
              items={[
                {
                  label: 'Activate',
                  icon: <Icon name="check-circle" size="sm" />,
                  disabled: wallet.status === 'ACTIVE' || wallet.status === 'CLOSED',
                  onSelect: () => {
                    setStatus('ACTIVE', 'activated');
                  },
                },
                {
                  label: 'Suspend',
                  icon: <Icon name="alert-triangle" size="sm" />,
                  disabled: wallet.status !== 'ACTIVE',
                  onSelect: () => {
                    setStatus('SUSPENDED', 'suspended');
                  },
                },
                {
                  label: 'Close',
                  icon: <Icon name="x-circle" size="sm" />,
                  destructive: true,
                  disabled: wallet.status === 'CLOSED',
                  onSelect: () => {
                    setStatus('CLOSED', 'closed');
                  },
                },
              ]}
            />
          </div>
        }
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
          { value: 'overview', label: 'Actions', content: <OverviewPanel wallet={wallet} /> },
          { value: 'ledger', label: 'Ledger', content: <LedgerPanel wallet={wallet} /> },
          { value: 'holds', label: 'Holds', content: <HoldsPanel wallet={wallet} /> },
          {
            value: 'statements',
            label: 'Statements',
            content: <StatementsPanel wallet={wallet} />,
          },
        ]}
      />

      <div className="mt-6">
        <Button variant="ghost" onClick={() => navigate('/wallet')}>
          Back to wallets
        </Button>
      </div>
    </>
  );
}
