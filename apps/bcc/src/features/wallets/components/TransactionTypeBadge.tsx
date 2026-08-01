import type { TransactionStatus, TransactionType } from '@superdreams/api-client';
import { Badge, type BadgeVariant } from '@superdreams/ui';

const variantByType: Record<TransactionType, BadgeVariant> = {
  CREDIT: 'success',
  RELEASE: 'success',
  DEBIT: 'destructive',
  HOLD: 'warning',
  ADJUSTMENT: 'secondary',
  REVERSAL: 'outline',
};

function label(type: TransactionType): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

/** Renders a ledger transaction type (and a reversed marker) as badges. */
export function TransactionTypeBadge({
  type,
  status,
}: {
  type: TransactionType;
  status: TransactionStatus;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant={variantByType[type]}>{label(type)}</Badge>
      {status === 'REVERSED' ? <Badge variant="outline">Reversed</Badge> : null}
    </span>
  );
}
