import { StatusPill } from '@/components/status-pill';
import type { MemberStatus } from '@superdreams/api-client';

/** Renders a member status as a Super Dreams soft status pill. */
export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return <StatusPill status={status} />;
}
