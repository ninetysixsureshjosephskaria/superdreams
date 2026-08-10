import type {
  RewardProgramStatus,
  RewardTransactionStatus,
  RewardTransactionType,
} from '@superdreams/api-client';
import { Badge, type BadgeVariant } from '@superdreams/ui';

const programVariant: Record<RewardProgramStatus, BadgeVariant> = {
  ACTIVE: 'success',
  DRAFT: 'warning',
  INACTIVE: 'secondary',
  ARCHIVED: 'outline',
};

const txnVariant: Record<RewardTransactionType, BadgeVariant> = {
  EARN: 'success',
  REDEEM: 'destructive',
  ADJUSTMENT: 'secondary',
  EXPIRE: 'warning',
  REVERSAL: 'outline',
};

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** Reward program status as a design-system badge. */
export function RewardProgramStatusBadge({ status }: { status: RewardProgramStatus }) {
  return (
    <Badge soft variant={programVariant[status]}>
      {titleCase(status)}
    </Badge>
  );
}

/** Reward transaction type (with reversed marker) as badges. */
export function RewardTxnBadge({
  type,
  status,
}: {
  type: RewardTransactionType;
  status: RewardTransactionStatus;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge soft variant={txnVariant[type]}>
        {titleCase(type)}
      </Badge>
      {status === 'REVERSED' ? (
        <Badge soft variant="outline">
          Reversed
        </Badge>
      ) : null}
    </span>
  );
}
