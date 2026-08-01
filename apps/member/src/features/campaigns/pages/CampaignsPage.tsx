import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { CampaignType, MemberCampaignView } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  ContentCard,
  EmptyState,
  LoadingScreen,
  Pagination,
  Select,
  Spinner,
  Tabs,
} from '@superdreams/ui';

import { useAvailableCampaigns, useEnrollCampaign, useMyCampaigns } from '../hooks';

const PAGE_SIZE = 6;

const TYPE_FILTER_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Promotional', value: 'PROMOTIONAL' },
  { label: 'Reward', value: 'REWARD' },
  { label: 'Referral', value: 'REFERRAL' },
  { label: 'Seasonal', value: 'SEASONAL' },
  { label: 'Engagement', value: 'ENGAGEMENT' },
];

function CampaignCard({
  campaign,
  onEnroll,
  enrolling,
}: {
  campaign: MemberCampaignView;
  onEnroll?: (id: string) => void;
  enrolling?: boolean;
}) {
  const joined = campaign.participation === 'ENROLLED' || campaign.participation === 'REWARDED';
  return (
    <ContentCard title={campaign.name}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{campaign.type}</Badge>
          {campaign.reward ? (
            <Badge variant="success">{campaign.reward.points.toLocaleString()} pts</Badge>
          ) : null}
          {campaign.participation ? (
            <Badge variant={campaign.participation === 'REWARDED' ? 'success' : 'warning'}>
              {campaign.participation.charAt(0) + campaign.participation.slice(1).toLowerCase()}
            </Badge>
          ) : null}
        </div>
        {campaign.description ? (
          <p className="text-sm text-muted-foreground">{campaign.description}</p>
        ) : null}
        {onEnroll ? (
          joined ? (
            <p className="text-sm text-muted-foreground">You have joined this campaign.</p>
          ) : campaign.eligible ? (
            <Button size="sm" isLoading={enrolling} onClick={() => onEnroll(campaign.id)}>
              Join campaign
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">You are not eligible for this campaign.</p>
          )
        ) : null}
      </div>
    </ContentCard>
  );
}

function AvailablePanel() {
  const notify = useNotificationStore((state) => state.notify);
  const query = useAvailableCampaigns();
  const enroll = useEnrollCampaign();
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const items = query.data ?? [];
    return type ? items.filter((c) => c.type === (type as CampaignType)) : items;
  }, [query.data, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (query.isPending) {
    return <Spinner label="Loading campaigns" />;
  }
  if (query.isError) {
    return (
      <Alert variant="destructive" title="Could not load campaigns">
        {query.error.message}
      </Alert>
    );
  }
  if (filtered.length === 0) {
    return (
      <EmptyState title="No campaigns" description="There are no campaigns available right now." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-48">
        <Select
          aria-label="Filter by type"
          options={TYPE_FILTER_OPTIONS}
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {pageItems.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            enrolling={enroll.isPending}
            onEnroll={(id) => {
              enroll.mutate(id, {
                onSuccess: () => notify({ variant: 'success', title: 'Joined campaign' }),
                onError: (error) =>
                  notify({ variant: 'error', title: 'Could not join', description: error.message }),
              });
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} campaigns</p>
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}

function MyPanel() {
  const query = useMyCampaigns();
  if (query.isPending) {
    return <Spinner label="Loading your campaigns" />;
  }
  if (query.isError) {
    return (
      <Alert variant="destructive" title="Could not load your campaigns">
        {query.error.message}
      </Alert>
    );
  }
  if (!query.data || query.data.length === 0) {
    return <EmptyState title="No campaigns joined" description="Campaigns you join appear here." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {query.data.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}

/** Member self-service campaigns: available to join and joined. */
export default function CampaignsPage() {
  const query = useAvailableCampaigns();

  if (query.isPending) {
    return <LoadingScreen message="Loading campaigns…" />;
  }

  return (
    <>
      <Helmet>
        <title>Campaigns</title>
      </Helmet>
      <PageHeader title="Campaigns" description="Discover and join member campaigns." />
      <Tabs
        items={[
          { value: 'available', label: 'Available', content: <AvailablePanel /> },
          { value: 'mine', label: 'My campaigns', content: <MyPanel /> },
        ]}
      />
    </>
  );
}
