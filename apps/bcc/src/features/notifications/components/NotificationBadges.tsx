import type { NotificationStatus, TemplateStatus } from '@superdreams/api-client';
import { Badge, type BadgeVariant } from '@superdreams/ui';

const statusVariant: Record<NotificationStatus, BadgeVariant> = {
  DRAFT: 'secondary',
  QUEUED: 'warning',
  SENDING: 'warning',
  SENT: 'default',
  DELIVERED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'outline',
};

const templateVariant: Record<TemplateStatus, BadgeVariant> = {
  ACTIVE: 'success',
  DRAFT: 'secondary',
  INACTIVE: 'outline',
};

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** Notification delivery status as a design-system badge. */
export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  return <Badge variant={statusVariant[status]}>{titleCase(status)}</Badge>;
}

/** Template status as a design-system badge. */
export function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  return <Badge variant={templateVariant[status]}>{titleCase(status)}</Badge>;
}
