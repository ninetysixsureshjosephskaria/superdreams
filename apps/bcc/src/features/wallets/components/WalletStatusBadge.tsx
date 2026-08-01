import type { WalletStatus } from '@superdreams/api-client';
import { Badge, type BadgeVariant } from '@superdreams/ui';

const variantByStatus: Record<WalletStatus, BadgeVariant> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'destructive',
  CLOSED: 'outline',
};

function label(status: WalletStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** Renders a wallet status as a design-system badge. */
export function WalletStatusBadge({ status }: { status: WalletStatus }) {
  return <Badge variant={variantByStatus[status]}>{label(status)}</Badge>;
}
