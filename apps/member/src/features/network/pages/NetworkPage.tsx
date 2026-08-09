import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import type { NetworkMemberNode } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  ContentCard,
  EmptyState,
  LoadingScreen,
  Spinner,
  Tabs,
} from '@superdreams/ui';

import { useMyDownline, useMyNetworkSummary, useMyReferrals } from '../hooks';

/** A single network member, showing only the fields the backend returns. */
function MemberRow({ member }: { member: NetworkMemberNode }) {
  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{member.name}</p>
        <p className="text-xs text-muted-foreground">{member.memberNumber}</p>
      </div>
      <Badge variant="secondary">
        {member.directReferralCount} referral{member.directReferralCount === 1 ? '' : 's'}
      </Badge>
    </li>
  );
}

function ReferralsPanel() {
  const query = useMyReferrals();
  if (query.isPending) {
    return <Spinner label="Loading your referrals" />;
  }
  if (query.isError) {
    return (
      <Alert variant="destructive" title="Could not load your referrals">
        {query.error.message}
      </Alert>
    );
  }
  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No direct referrals yet"
        description="Members who join through you appear here."
      />
    );
  }
  return (
    <ul className="divide-y rounded-md border">
      {query.data.map((member) => (
        <MemberRow key={member.memberId} member={member} />
      ))}
    </ul>
  );
}

function DownlinePanel() {
  const query = useMyDownline();
  if (query.isPending) {
    return <Spinner label="Loading your downline" />;
  }
  if (query.isError) {
    return (
      <Alert variant="destructive" title="Could not load your downline">
        {query.error.message}
      </Alert>
    );
  }
  if (query.data.length === 0) {
    return (
      <EmptyState
        title="Your network is empty"
        description="As your referrals grow their own networks, your downline appears here by level."
      />
    );
  }

  // Level-based presentation using the backend-provided `depth` (no hierarchy is
  // reconstructed in the frontend). Levels are rendered in ascending order.
  const byLevel = new Map<number, NetworkMemberNode[]>();
  for (const member of query.data) {
    const bucket = byLevel.get(member.depth) ?? [];
    bucket.push(member);
    byLevel.set(member.depth, bucket);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      {levels.map((level) => {
        const members = byLevel.get(level) ?? [];
        return (
          <div key={level}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Level {level}</h3>
              <span className="text-xs text-muted-foreground">
                {members.length} member{members.length === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="divide-y rounded-md border">
              {members.map((member) => (
                <MemberRow key={member.memberId} member={member} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function OverviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

/** Member self-service network: referral summary, direct referrals and downline. */
export default function NetworkPage() {
  const summary = useMyNetworkSummary();

  if (summary.isPending) {
    return <LoadingScreen message="Loading your network…" />;
  }
  if (summary.isError || !summary.data) {
    return (
      <>
        <PageHeader title="My network" />
        <Alert variant="destructive" title="Could not load your network">
          {summary.error?.message ?? 'Your network is not available right now.'}
        </Alert>
      </>
    );
  }

  const { memberNumber, directReferralCount, totalDownlineCount } = summary.data;

  return (
    <>
      <Helmet>
        <title>My network</title>
      </Helmet>
      <PageHeader title="My network" description={memberNumber} />

      <ContentCard className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <OverviewStat label="Direct referrals" value={directReferralCount} />
          <OverviewStat label="Total network" value={totalDownlineCount} />
        </div>
      </ContentCard>

      <Tabs
        items={[
          { value: 'referrals', label: 'Direct referrals', content: <ReferralsPanel /> },
          { value: 'downline', label: 'Downline', content: <DownlinePanel /> },
        ]}
      />
    </>
  );
}
