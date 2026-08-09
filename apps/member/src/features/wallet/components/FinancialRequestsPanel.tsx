import type { FinancialRequestStatus, FinancialRequestType } from '@superdreams/api-client';
import { Alert, Badge, EmptyState, Spinner, type BadgeVariant } from '@superdreams/ui';

import { useMyFinancialRequests } from '../hooks';
import { formatMinor } from '../money';

const STATUS_VARIANT: Record<FinancialRequestStatus, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  HOLD: 'secondary',
};

const STATUS_LABEL: Record<FinancialRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  HOLD: 'Held',
};

const TYPE_LABEL: Record<FinancialRequestType, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAW: 'Withdrawal',
};

/**
 * The member's financial requests — both deposits and withdrawals — with the real
 * backend status. Read-only: the approval workflow lives server-side. This is the
 * single request-history surface (deposits and withdrawals are clearly labelled).
 */
export function FinancialRequestsPanel() {
  const query = useMyFinancialRequests();

  if (query.isPending) {
    return <Spinner label="Loading your requests" />;
  }
  if (query.isError) {
    return (
      <Alert variant="destructive" title="Could not load your requests">
        {query.error.message}
      </Alert>
    );
  }
  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No requests yet"
        description="Your deposit and withdrawal requests appear here with their approval status."
      />
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {query.data.map((request) => (
        <li key={request.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{TYPE_LABEL[request.type]}</Badge>
              <p className="truncate text-sm font-medium">
                {request.units} units · {formatMinor(request.amountCents, request.currencyCode)}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {request.requestNumber} · {new Date(request.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[request.status]}>{STATUS_LABEL[request.status]}</Badge>
        </li>
      ))}
    </ul>
  );
}
