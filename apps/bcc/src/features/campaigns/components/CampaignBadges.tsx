import type { CampaignMemberStatus, CampaignStatus } from '@superdreams/api-client';
import { Badge, type BadgeVariant } from '@superdreams/ui';

const statusVariant: Record<CampaignStatus, BadgeVariant> = {
  ACTIVE: 'success',
  DRAFT: 'secondary',
  SCHEDULED: 'warning',
  PAUSED: 'warning',
  COMPLETED: 'default',
  ARCHIVED: 'outline',
};

const participationVariant: Record<CampaignMemberStatus, BadgeVariant> = {
  ELIGIBLE: 'secondary',
  ENROLLED: 'warning',
  REWARDED: 'success',
  EXCLUDED: 'outline',
};

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** Campaign status as a design-system badge. */
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge soft variant={statusVariant[status]}>
      {titleCase(status)}
    </Badge>
  );
}

/** Member participation status as a design-system badge. */
export function ParticipationBadge({ status }: { status: CampaignMemberStatus }) {
  return (
    <Badge soft variant={participationVariant[status]}>
      {titleCase(status)}
    </Badge>
  );
}
