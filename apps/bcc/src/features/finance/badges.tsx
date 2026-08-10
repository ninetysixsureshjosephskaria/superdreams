import type { FinancialRequestStatus, FinancialRequestType } from '@superdreams/api-client';
import { Badge, type BadgeVariant } from '@superdreams/ui';

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

export function StatusBadge({ status }: { status: FinancialRequestStatus }) {
  return (
    <Badge soft variant={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: FinancialRequestType }) {
  return (
    <Badge soft variant={type === 'DEPOSIT' ? 'success' : 'secondary'}>
      {type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
    </Badge>
  );
}
