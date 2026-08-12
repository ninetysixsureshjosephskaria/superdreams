import type { RedemptionRequestStatus } from '@superdreams/api-client';
import { Badge, type BadgeVariant } from '@superdreams/ui';

const STATUS_VARIANT: Record<RedemptionRequestStatus, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

const STATUS_LABEL: Record<RedemptionRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function StatusBadge({ status }: { status: RedemptionRequestStatus }) {
  return (
    <Badge soft variant={STATUS_VARIANT[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
