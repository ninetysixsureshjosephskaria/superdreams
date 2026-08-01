import type { MemberStatus } from '@superdreams/api-client';
import { Badge, type BadgeVariant } from '@superdreams/ui';

const variantByStatus: Record<MemberStatus, BadgeVariant> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
  ARCHIVED: 'outline',
};

function label(status: MemberStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** Renders a member status as a design-system badge. */
export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return <Badge variant={variantByStatus[status]}>{label(status)}</Badge>;
}
