import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type {
  CampaignDetail,
  CampaignEnrollmentData,
  CampaignMemberStatus,
  ScheduleCampaignInput,
} from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DataTable,
  DropdownMenu,
  EmptyState,
  Icon,
  Input,
  LoadingScreen,
  Pagination,
  Select,
  Spinner,
  Tabs,
  Textarea,
  type DataTableColumn,
} from '@superdreams/ui';

import { CampaignStatusBadge, ParticipationBadge } from '../components/CampaignBadges';
import {
  useAddCampaignTargets,
  useCampaign,
  useCampaignEnrollments,
  useCampaignHistory,
  useChangeCampaignStatus,
  useExecuteCampaign,
  useScheduleCampaign,
} from '../hooks';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ScheduleCard({ campaign }: { campaign: CampaignDetail }) {
  const notify = useNotificationStore((state) => state.notify);
  const schedule = useScheduleCampaign(campaign.id);
  const [scheduleType, setScheduleType] = useState<ScheduleCampaignInput['scheduleType']>(
    campaign.schedule?.scheduleType ?? 'IMMEDIATE',
  );
  const [startAt, setStartAt] = useState('');

  return (
    <ContentCard title="Schedule">
      <div className="space-y-3">
        <Select
          aria-label="Schedule type"
          options={[
            { label: 'Immediate', value: 'IMMEDIATE' },
            { label: 'Scheduled', value: 'SCHEDULED' },
            { label: 'Recurring', value: 'RECURRING' },
          ]}
          value={scheduleType}
          onChange={(event) => setScheduleType(event.target.value as typeof scheduleType)}
        />
        {scheduleType === 'SCHEDULED' ? (
          <Input
            type="datetime-local"
            aria-label="Start time"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
          />
        ) : null}
        <Button
          isLoading={schedule.isPending}
          onClick={() => {
            const input: ScheduleCampaignInput = { scheduleType };
            if (scheduleType === 'SCHEDULED' && startAt) {
              input.startAt = new Date(startAt).toISOString();
            }
            schedule.mutate(input, {
              onSuccess: () => notify({ variant: 'success', title: 'Campaign scheduled' }),
              onError: (error) =>
                notify({ variant: 'error', title: 'Schedule failed', description: error.message }),
            });
          }}
        >
          Save schedule
        </Button>
      </div>
    </ContentCard>
  );
}

function TargetsCard({ campaignId }: { campaignId: string }) {
  const notify = useNotificationStore((state) => state.notify);
  const addTargets = useAddCampaignTargets(campaignId);
  const [value, setValue] = useState('');

  return (
    <ContentCard title="Add members (manual audience)">
      <div className="space-y-3">
        <Textarea
          rows={3}
          placeholder="Member ids, one per line or comma-separated…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button
          isLoading={addTargets.isPending}
          disabled={value.trim().length === 0}
          onClick={() => {
            const memberIds = value
              .split(/[\s,]+/)
              .map((id) => id.trim())
              .filter((id) => id.length > 0);
            if (memberIds.length === 0) {
              return;
            }
            addTargets.mutate(
              { memberIds },
              {
                onSuccess: () => {
                  notify({ variant: 'success', title: 'Members added' });
                  setValue('');
                },
                onError: (error) =>
                  notify({
                    variant: 'error',
                    title: 'Could not add members',
                    description: error.message,
                  }),
              },
            );
          }}
        >
          Add members
        </Button>
      </div>
    </ContentCard>
  );
}

function OverviewPanel({ campaign }: { campaign: CampaignDetail }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Campaign">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code" value={campaign.code} />
            <Field label="Type" value={campaign.type} />
            <Field label="Audience" value={campaign.audienceType} />
            <Field
              label="Reward"
              value={campaign.reward ? `${campaign.reward.points.toLocaleString()} pts` : 'None'}
            />
          </div>
          {campaign.description ? (
            <p className="mt-4 text-sm text-muted-foreground">{campaign.description}</p>
          ) : null}
          {campaign.rules.length > 0 ? (
            <div className="mt-4 text-sm">
              <p className="text-muted-foreground">Eligibility</p>
              <ul className="mt-1 list-inside list-disc">
                {campaign.rules.map((rule) => (
                  <li key={rule.id}>
                    {rule.type}
                    {rule.value ? `: ${rule.value}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </ContentCard>
        <ContentCard title="Enrollment">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Eligible" value={campaign.enrollment.eligible} />
            <Stat label="Enrolled" value={campaign.enrollment.enrolled} />
            <Stat label="Rewarded" value={campaign.enrollment.rewarded} />
            <Stat label="Total" value={campaign.enrollment.total} />
          </div>
        </ContentCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ScheduleCard campaign={campaign} />
        <TargetsCard campaignId={campaign.id} />
      </div>
    </div>
  );
}

function EnrollmentsPanel({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const query = useCampaignEnrollments(campaignId, {
    page,
    pageSize: 10,
    status: status ? (status as CampaignMemberStatus) : undefined,
  });

  const columns: DataTableColumn<CampaignEnrollmentData>[] = [
    { id: 'member', header: 'Member', cell: (row) => row.memberId },
    { id: 'status', header: 'Status', cell: (row) => <ParticipationBadge status={row.status} /> },
    {
      id: 'enrolled',
      header: 'Enrolled',
      align: 'right',
      cell: (row) => (row.enrolledAt ? new Date(row.enrolledAt).toLocaleDateString() : '—'),
    },
    {
      id: 'rewarded',
      header: 'Rewarded',
      align: 'right',
      cell: (row) => (row.rewardedAt ? new Date(row.rewardedAt).toLocaleDateString() : '—'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="w-48">
        <Select
          aria-label="Filter by participation"
          options={[
            { label: 'All', value: '' },
            { label: 'Eligible', value: 'ELIGIBLE' },
            { label: 'Enrolled', value: 'ENROLLED' },
            { label: 'Rewarded', value: 'REWARDED' },
            { label: 'Excluded', value: 'EXCLUDED' },
          ]}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        />
      </div>
      {query.isError ? (
        <Alert variant="destructive" title="Could not load enrollments">
          <div className="space-y-3">
            <p>{query.error.message}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={query.isPending}
        />
      )}
      {query.data ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} members</p>
          <Pagination
            page={query.data.page}
            pageCount={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}

function HistoryPanel({ campaignId }: { campaignId: string }) {
  const query = useCampaignHistory(campaignId);
  if (query.isPending) {
    return <Spinner label="Loading history" />;
  }
  if (!query.data || query.data.length === 0) {
    return <EmptyState title="No activity" description="Campaign activity appears here." />;
  }
  return (
    <ul className="space-y-3">
      {query.data.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3 text-sm">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon name="info" size="xs" />
          </span>
          <div>
            <p className="font-medium">{entry.description ?? entry.action}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Admin campaign details: lifecycle actions, execution, and config/enrollment/history tabs. */
export default function CampaignDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const campaignQuery = useCampaign(id);
  const changeStatus = useChangeCampaignStatus(id);
  const execute = useExecuteCampaign(id);

  if (campaignQuery.isPending) {
    return <LoadingScreen message="Loading campaign…" />;
  }
  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <Alert variant="destructive" title="Could not load campaign">
        <div className="space-y-3">
          <p>{campaignQuery.error?.message ?? 'The campaign could not be found.'}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void campaignQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  const campaign = campaignQuery.data;
  const setStatus = (status: CampaignDetail['status'], label: string): void => {
    changeStatus.mutate(
      { status },
      {
        onSuccess: () => notify({ variant: 'success', title: `Campaign ${label}` }),
        onError: (error) =>
          notify({ variant: 'error', title: 'Status change failed', description: error.message }),
      },
    );
  };

  return (
    <>
      <Helmet>
        <title>{campaign.name}</title>
      </Helmet>
      <PageHeader
        title={campaign.name}
        description={`${campaign.code} · ${campaign.type}`}
        actions={
          <div className="flex items-center gap-2">
            <CampaignStatusBadge status={campaign.status} />
            {campaign.status === 'ACTIVE' && campaign.reward ? (
              <Button
                isLoading={execute.isPending}
                onClick={() => {
                  execute.mutate(
                    {},
                    {
                      onSuccess: (result) =>
                        notify({
                          variant: 'success',
                          title: 'Campaign executed',
                          description: `Issued ${result.rewardsIssued} reward(s).`,
                        }),
                      onError: (error) =>
                        notify({
                          variant: 'error',
                          title: 'Execution failed',
                          description: error.message,
                        }),
                    },
                  );
                }}
              >
                Execute
              </Button>
            ) : null}
            <Button
              variant="outline"
              leftIcon={<Icon name="edit" size="sm" />}
              onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
            >
              Edit
            </Button>
            <DropdownMenu
              align="end"
              triggerClassName="inline-flex h-10 w-10 items-center justify-center rounded-control border border-input transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[var(--press-scale-icon)]"
              trigger={
                <>
                  <Icon name="more-horizontal" size="sm" />
                  <span className="sr-only">Campaign actions</span>
                </>
              }
              items={[
                {
                  label: 'Activate',
                  icon: <Icon name="check-circle" size="sm" />,
                  disabled: !['DRAFT', 'SCHEDULED', 'PAUSED'].includes(campaign.status),
                  onSelect: () => setStatus('ACTIVE', 'activated'),
                },
                {
                  label: 'Pause',
                  icon: <Icon name="alert-triangle" size="sm" />,
                  disabled: campaign.status !== 'ACTIVE',
                  onSelect: () => setStatus('PAUSED', 'paused'),
                },
                {
                  label: 'Complete',
                  icon: <Icon name="check-circle" size="sm" />,
                  disabled: !['ACTIVE', 'PAUSED'].includes(campaign.status),
                  onSelect: () => setStatus('COMPLETED', 'completed'),
                },
                {
                  label: 'Archive',
                  icon: <Icon name="trash" size="sm" />,
                  destructive: true,
                  disabled: !['DRAFT', 'SCHEDULED', 'COMPLETED'].includes(campaign.status),
                  onSelect: () => setStatus('ARCHIVED', 'archived'),
                },
              ]}
            />
          </div>
        }
      />

      <Tabs
        items={[
          { value: 'overview', label: 'Overview', content: <OverviewPanel campaign={campaign} /> },
          {
            value: 'enrollments',
            label: 'Enrollments',
            content: <EnrollmentsPanel campaignId={campaign.id} />,
          },
          {
            value: 'history',
            label: 'History',
            content: <HistoryPanel campaignId={campaign.id} />,
          },
        ]}
      />

      <div className="mt-6">
        <Button variant="ghost" onClick={() => navigate('/campaigns')}>
          Back to campaigns
        </Button>
      </div>
    </>
  );
}
