import { useState, type ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import type { TransactionType } from '@superdreams/api-client';
import { Alert, Badge, Button, ContentCard, EmptyState, Spinner, Tabs } from '@superdreams/ui';

import { DepositDialog } from '../components/DepositDialog';
import { FinancialLedgerPanel } from '../components/FinancialLedgerPanel';
import { FinancialRequestsPanel } from '../components/FinancialRequestsPanel';
import { TranchesPanel } from '../components/TranchesPanel';
import { TransactionsTable } from '../components/TransactionsTable';
import { WithdrawDialog } from '../components/WithdrawDialog';
import {
  useMyFinancialWallet,
  useMyTranches,
  useMyWallet,
  useMyWalletStatements,
  useMyWalletTransactions,
} from '../hooks';
import { formatMinor, formatUnits } from '../money';

const PAGE_SIZE = 10;

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

/** Loyalty wallet transaction history (kind=LOYALTY). */
function LedgerPanel() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const query = useMyWalletTransactions({
    page,
    pageSize: PAGE_SIZE,
    type: type ? (type as TransactionType) : undefined,
  });

  return (
    <TransactionsTable
      query={query}
      type={type}
      onTypeChange={(next) => {
        setType(next);
        setPage(1);
      }}
      onPageChange={setPage}
    />
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

/**
 * Financial (units) wallet overview. Units are the member-facing quantity
 * (1 unit = $30); the USD equivalent is shown alongside. The wallet is created
 * on the member's first approved deposit, so its absence is a friendly empty
 * state, not an error. Locked-tranche capital is shown for context (deposit
 * principal sits in the available balance while its tranche earns a maturity
 * bonus — the lock governs the bonus/early-unlock fee, not a balance hold).
 */
function FinancialSection() {
  const query = useMyFinancialWallet();
  const tranchesQuery = useMyTranches();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const lockedCents = (tranchesQuery.data ?? [])
    .filter((tranche) => tranche.status === 'LOCKED')
    .reduce((sum, tranche) => sum + tranche.principalCents, 0);

  let body: ReactNode;
  if (query.isPending) {
    body = <Spinner label="Loading your funds" />;
  } else if (query.error?.status === 404 || !query.data) {
    body = (
      <EmptyState
        title="No funds wallet yet"
        description="Your funds wallet is created automatically when your first deposit is approved."
      />
    );
  } else if (query.isError) {
    body = (
      <Alert variant="destructive" title="Could not load your funds">
        {query.error.message}
      </Alert>
    );
  } else {
    const { balance, currencyCode } = query.data;
    body = (
      <ContentCard>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Available balance</p>
          <Badge variant="secondary">1 unit = $30</Badge>
        </div>
        <p className="mt-1 text-3xl font-bold text-primary">
          {formatUnits(balance.availableMinor)} units
        </p>
        <p className="text-sm text-muted-foreground">
          ≈ {formatMinor(balance.availableMinor, currencyCode)}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4 text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Available</p>
            <p className="mt-1 font-semibold">
              {formatMinor(balance.availableMinor, currencyCode)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Held</p>
            <p className="mt-1 font-semibold">{formatMinor(balance.heldMinor, currencyCode)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="mt-1 font-semibold">{formatMinor(balance.totalMinor, currencyCode)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">In locked tranches</span>
          <span className="font-semibold">
            {formatUnits(lockedCents)} units · {formatMinor(lockedCents, currencyCode)}
          </span>
        </div>
      </ContentCard>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Funds</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setWithdrawOpen(true)}>
            Withdraw
          </Button>
          <Button size="sm" onClick={() => setDepositOpen(true)}>
            Add funds
          </Button>
        </div>
      </div>
      {body}
      <div className="mt-5">
        <Tabs
          items={[
            { value: 'tranches', label: 'Tranches', content: <TranchesPanel /> },
            { value: 'requests', label: 'Requests', content: <FinancialRequestsPanel /> },
            { value: 'activity', label: 'Activity', content: <FinancialLedgerPanel /> },
          ]}
        />
      </div>
      <DepositDialog isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawDialog isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
    </section>
  );
}

/**
 * Loyalty (points) wallet — the pre-existing member wallet, preserved intact as
 * a clearly separated secondary section below the funds overview.
 */
function LoyaltySection() {
  const query = useMyWallet();

  let body: ReactNode;
  if (query.isPending) {
    body = <Spinner label="Loading your points" />;
  } else if (query.isError || !query.data) {
    body = (
      <Alert variant="destructive" title="Could not load your loyalty wallet">
        {query.error?.message ?? 'No loyalty wallet is linked to your account yet.'}
      </Alert>
    );
  } else {
    const wallet = query.data;
    body = (
      <>
        <p className="mb-3 text-sm text-muted-foreground">
          {wallet.walletNumber} · {wallet.currencyCode}
        </p>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <BalanceCard
            label="Available"
            minor={wallet.balance.availableMinor}
            currency={wallet.currencyCode}
          />
          <BalanceCard
            label="Held"
            minor={wallet.balance.heldMinor}
            currency={wallet.currencyCode}
          />
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

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Loyalty points</h2>
      {body}
    </section>
  );
}

/** Member self-service wallet: funds (units) overview + loyalty points. */
export default function WalletPage() {
  return (
    <>
      <Helmet>
        <title>My wallet</title>
      </Helmet>
      <PageHeader title="My wallet" description="Your funds and loyalty points" />
      <FinancialSection />
      <LoyaltySection />
    </>
  );
}
