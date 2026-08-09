import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { ROUTES } from '@/constants';
import type { FinancialRequestData } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DataTable,
  Icon,
  StatCard,
  type DataTableColumn,
} from '@superdreams/ui';

import { StatusBadge, TypeBadge } from '../badges';
import { usd } from '../format';
import { useFinancialLimits, useFinanceRequests } from '../hooks';

const RECENT_PARAMS = { pageSize: 8, sortBy: 'createdAt', order: 'desc' } as const;

const columns: DataTableColumn<FinancialRequestData>[] = [
  { id: 'type', header: 'Type', cell: (row) => <TypeBadge type={row.type} /> },
  { id: 'requestNumber', header: 'Request', cell: (row) => row.requestNumber },
  { id: 'units', header: 'Units', align: 'right', cell: (row) => row.units.toLocaleString() },
  { id: 'amount', header: 'Amount', align: 'right', cell: (row) => usd(row.amountCents) },
  { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  {
    id: 'createdAt',
    header: 'Submitted',
    align: 'right',
    cell: (row) => new Date(row.createdAt).toLocaleString(),
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
          value={count(pendingDeposits.data?.total)}
          hint="awaiting approval"
          icon={<Icon name="wallet" size="sm" />}
        />
        <StatCard
          label="Pending withdrawals"
          value={count(pendingWithdrawals.data?.total)}
          hint="awaiting approval"
          icon={<Icon name="receipt" size="sm" />}
        />
        <StatCard
          label="On hold"
          value={count(held.data?.total)}
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
        <h2 className="mb-3 text-lg font-semibold">Recent requests</h2>
        {recent.isError ? (
          <Alert variant="destructive" title="Could not load recent requests">
            {recent.error.message}
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

      <ContentCard>
        <h2 className="mb-3 text-lg font-semibold">Limits &amp; policy</h2>
        {limits.isError ? (
          <Alert variant="destructive" title="Could not load limits">
            {limits.error.message}
          </Alert>
        ) : limits.data ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Min deposit</dt>
              <dd className="font-medium">{limits.data.minDepositUnits} units</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Max deposit</dt>
              <dd className="font-medium">{limits.data.maxDepositUnits} units</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Min withdrawal</dt>
              <dd className="font-medium">{usd(limits.data.minWithdrawCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Early-withdraw fee</dt>
              <dd className="font-medium">{limits.data.earlyWithdrawFeeBps / 100}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Processing time</dt>
              <dd className="font-medium">
                {limits.data.processingMinDays}–{limits.data.processingMaxDays} days
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </ContentCard>
    </>
  );
}
