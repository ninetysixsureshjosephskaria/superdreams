import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { formatMinor } from '@/features/wallet';
import { Alert, Badge, ContentCard, EmptyState, LoadingScreen, Select } from '@superdreams/ui';

import {
  EARNING_CATEGORY_LABEL,
  summariseEarnings,
  toEarnings,
  type EarningCategory,
} from '../earnings';
import { useMyEarningsLedger } from '../hooks';

const CATEGORY_ORDER: EarningCategory[] = [
  'COMMISSION',
  'REFERRAL',
  'PROFIT',
  'BONUS',
  'ACTIVATION',
];

const FILTER_OPTIONS = [
  { label: 'All earnings', value: '' },
  ...CATEGORY_ORDER.map((category) => ({
    label: EARNING_CATEGORY_LABEL[category],
    value: category,
  })),
];

function OverviewStat({
  label,
  cents,
  currency,
}: {
  label: string;
  cents: number;
  currency: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{formatMinor(cents, currency)}</p>
    </div>
  );
}

/** Member self-service earnings: overview + categorised history from the FINANCIAL ledger. */
export default function EarningsPage() {
  const query = useMyEarningsLedger();
  const [filter, setFilter] = useState('');

  const earnings = useMemo(() => toEarnings(query.data?.items ?? []), [query.data]);
  const summary = useMemo(() => summariseEarnings(earnings), [earnings]);
  const currency = earnings[0]?.transaction.currencyCode ?? 'USD';
  const visible = filter ? earnings.filter((entry) => entry.category === filter) : earnings;
  const hasMore = query.data ? query.data.totalPages > 1 : false;

  if (query.isPending) {
    return <LoadingScreen message="Loading your earnings…" />;
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title="Earnings" />
        <Alert variant="destructive" title="Could not load your earnings">
          {query.error.message}
        </Alert>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Earnings</title>
      </Helmet>
      <PageHeader title="Earnings" description="Commission, profit and bonuses" />

      <ContentCard className="mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total earnings</p>
        <p className="mt-1 text-3xl font-bold text-primary">
          {formatMinor(summary.total, currency)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORY_ORDER.map((category) => (
            <OverviewStat
              key={category}
              label={EARNING_CATEGORY_LABEL[category]}
              cents={summary.byCategory[category]}
              currency={currency}
            />
          ))}
        </div>
        {hasMore ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Totals reflect your 100 most recent credits.
          </p>
        ) : null}
      </ContentCard>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Earnings history</h2>
        <div className="w-48">
          <Select
            aria-label="Filter by earning type"
            options={FILTER_OPTIONS}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No earnings yet"
          description="Commission, daily profit and bonuses appear here once they are credited to your funds wallet."
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {visible.map(({ transaction, category }) => (
            <li key={transaction.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{EARNING_CATEGORY_LABEL[category]}</Badge>
                  <p className="truncate text-sm font-medium">
                    +{formatMinor(transaction.amountMinor, transaction.currencyCode)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {transaction.reference} · {new Date(transaction.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
