import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { SectionHeading } from '@/components/section-heading';
import { ROUTES } from '@/constants';
import type { FinancialRequestData } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DataTable,
  Icon,
  Skeleton,
  StatCard,
  type DataTableColumn,
} from '@superdreams/ui';

import { StatusBadge, TypeBadge } from '../badges';
import { usd } from '../format';
import { useFinancialLimits, useFinanceRequests } from '../hooks';

const RECENT_PARAMS = { pageSize: 8, sortBy: 'createdAt', order: 'desc' } as const;

const columns: DataTableColumn<FinancialRequestData>[] = [
  { id: 'type', header: 'Type', cell: (row) => <TypeBadge type={row.type} /> },
  {
    id: 'requestNumber',
    header: 'Request',
    cell: (row) => <span className="tabular-nums">{row.requestNumber}</span>,
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
    cell: (row) => <span className="tabular-nums">{new Date(row.createdAt).toLocaleString()}</span>,
  },
];

/**
 * Finance operations dashboard. Composed from the real action-queue endpoint
 * (`GET /finance/requests`) — counts are the paginated `total` for each filter —
 * and the limits policy. No fabricated aggregates: network-wide balances and
 * profit-paid figures have no backend endpoint yet (see report).
 */
export default function FinanceDashboardPage() {
  const navigate = useNavigate();
  const pendingDeposits = useFinanceRequests({ status: 'PENDING', type: 'DEPOSIT', pageSize: 1 });
  const pendingWithdrawals = useFinanceRequests({
    status: 'PENDING',
    type: 'WITHDRAW',
    pageSize: 1,
  });
  const held = useFinanceRequests({ status: 'HOLD', pageSize: 1 });
  const recent = useFinanceRequests(RECENT_PARAMS);
  const limits = useFinancialLimits();

  const count = (value: number | undefined): string =>
    value === undefined ? '—' : value.toLocaleString();

  return (
    <>
      <Helmet>
        <title>Finance</title>
      </Helmet>
      <PageHeader
        title="Finance"
        description="Deposit &amp; withdrawal operations and limits"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(ROUTES.financeProfit)}>
              Daily profit
            </Button>
            <Button variant="secondary" onClick={() => navigate(ROUTES.financeLimits)}>
              Limits
            </Button>
            <Button
              onClick={() => navigate(ROUTES.financeQueue)}
              leftIcon={<Icon name="receipt" size="sm" />}
            >
              Action queue
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending deposits"
          value={<span className="tabular-nums">{count(pendingDeposits.data?.total)}</span>}
          hint="awaiting approval"
          icon={<Icon name="wallet" size="sm" />}
        />
        <StatCard
          label="Pending withdrawals"
          value={<span className="tabular-nums">{count(pendingWithdrawals.data?.total)}</span>}
          hint="awaiting approval"
          icon={<Icon name="receipt" size="sm" />}
        />
        <StatCard
          label="On hold"
          value={<span className="tabular-nums">{count(held.data?.total)}</span>}
          hint="deposits + withdrawals"
          icon={<Icon name="alert-triangle" size="sm" />}
        />
        <StatCard
          label="Early withdrawal"
          value={limits.data ? (limits.data.earlyWithdrawAllowed ? 'Allowed' : 'Disabled') : '—'}
          hint={limits.data ? `fee ${(limits.data.earlyWithdrawFeeBps / 100).toString()}%` : ''}
          icon={<Icon name="bar-chart" size="sm" />}
        />
      </div>

      <div className="mb-6">
        <SectionHeading title="Recent requests" />

        {recent.isError ? (
          <Alert variant="destructive" title="Could not load recent requests">
            <div className="space-y-3">
              <p>{recent.error.message}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void recent.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          </Alert>
        ) : (
          <DataTable
            columns={columns}
            rows={recent.data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={recent.isPending}
          />
        )}
      </div>

      <ContentCard title="Limits & policy">
        {limits.isError ? (
          <Alert variant="destructive" title="Could not load limits">
            <div className="space-y-3">
              <p>{limits.error.message}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void limits.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          </Alert>
        ) : limits.data ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Min deposit</dt>
              <dd className="font-medium tabular-nums">{limits.data.minDepositUnits} units</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Max deposit</dt>
              <dd className="font-medium tabular-nums">{limits.data.maxDepositUnits} units</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Min withdrawal</dt>
              <dd className="font-medium tabular-nums">{usd(limits.data.minWithdrawCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Early-withdraw fee</dt>
              <dd className="font-medium tabular-nums">{limits.data.earlyWithdrawFeeBps / 100}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Processing time</dt>
              <dd className="font-medium tabular-nums">
                {limits.data.processingMinDays}–{limits.data.processingMaxDays} days
              </dd>
            </div>
          </dl>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        )}
      </ContentCard>
    </>
  );
}
