import { usePermissions } from '@/hooks';
import { Alert, ContentCard, EmptyState, Spinner } from '@superdreams/ui';

import { useNetworkMember } from '../hooks';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

/**
 * A member's network relationships (referred-by, partner, downline counts, units)
 * from the Phase 2D network module. Read-only; the graph is backend-provided and
 * never reconstructed here. Requires network.read (query is disabled otherwise).
 */
export function NetworkRelationshipsCard({ memberId }: { memberId: string }) {
  const { can } = usePermissions();
  const canRead = can('network.read');
  // Passing '' disables the query, so no forbidden call is made without permission.
  const query = useNetworkMember(canRead ? memberId : '');

  return (
    <ContentCard title="Network relationships">
      {!canRead ? (
        <p className="text-xs text-muted-foreground">
          You do not have permission to view network information.
        </p>
      ) : query.isPending ? (
        <Spinner label="Loading network" />
      ) : query.error?.status === 404 ? (
        <EmptyState title="Not in a network" description="This member has no network node yet." />
      ) : query.isError || !query.data ? (
        <Alert variant="destructive" title="Could not load network">
          {query.error?.message ?? 'Network information is unavailable.'}
        </Alert>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Row label="Referred by" value={query.data.referredBy ?? ''} />
          <Row label="Partner" value={query.data.partnerId ?? ''} />
          <Row label="Direct referrals" value={query.data.directReferralCount.toLocaleString()} />
          <Row label="Total downline" value={query.data.totalDownlineCount.toLocaleString()} />
          <Row label="Units" value={query.data.units.toLocaleString()} />
          <Row label="Network status" value={query.data.status} />
        </div>
      )}
    </ContentCard>
  );
}
