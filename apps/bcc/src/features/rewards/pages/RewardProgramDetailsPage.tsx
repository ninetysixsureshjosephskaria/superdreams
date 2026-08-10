import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { RewardProgramDetail } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DropdownMenu,
  EmptyState,
  Icon,
  LoadingScreen,
} from '@superdreams/ui';

import { RewardProgramStatusBadge } from '../components/RewardBadges';
import { useChangeProgramStatus, useProgram } from '../hooks';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

/** Admin reward program details: info, rules, expiry and lifecycle actions. */
export default function RewardProgramDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const programQuery = useProgram(id);
  const changeStatus = useChangeProgramStatus(id);

  if (programQuery.isPending) {
    return <LoadingScreen message="Loading program…" />;
  }
  if (programQuery.isError || !programQuery.data) {
    return (
      <Alert variant="destructive" title="Could not load program">
        <div className="space-y-3">
          <p>{programQuery.error?.message ?? 'The program could not be found.'}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void programQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  const program = programQuery.data;
  const setStatus = (status: RewardProgramDetail['status'], label: string): void => {
    changeStatus.mutate(
      { status },
      {
        onSuccess: () => notify({ variant: 'success', title: `Program ${label}` }),
        onError: (error) =>
          notify({ variant: 'error', title: 'Status change failed', description: error.message }),
      },
    );
  };

  return (
    <>
      <Helmet>
        <title>{program.name}</title>
      </Helmet>
      <PageHeader
        title={program.name}
        description={`${program.code} · ${program.type}`}
        actions={
          <div className="flex items-center gap-2">
            <RewardProgramStatusBadge status={program.status} />
            <Button
              variant="outline"
              leftIcon={<Icon name="edit" size="sm" />}
              onClick={() => navigate(`/rewards/programs/${program.id}/edit`)}
            >
              Edit
            </Button>
            <DropdownMenu
              align="end"
              triggerClassName="inline-flex h-10 w-10 items-center justify-center rounded-control border border-input transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[var(--press-scale-icon)]"
              trigger={
                <>
                  <Icon name="more-horizontal" size="sm" />
                  <span className="sr-only">Program actions</span>
                </>
              }
              items={[
                {
                  label: 'Activate',
                  icon: <Icon name="check-circle" size="sm" />,
                  disabled: program.status === 'ACTIVE' || program.status === 'ARCHIVED',
                  onSelect: () => {
                    setStatus('ACTIVE', 'activated');
                  },
                },
                {
                  label: 'Deactivate',
                  icon: <Icon name="alert-triangle" size="sm" />,
                  disabled: program.status !== 'ACTIVE',
                  onSelect: () => {
                    setStatus('INACTIVE', 'deactivated');
                  },
                },
                {
                  label: 'Archive',
                  icon: <Icon name="trash" size="sm" />,
                  destructive: true,
                  disabled: program.status === 'ARCHIVED',
                  onSelect: () => {
                    setStatus('ARCHIVED', 'archived');
                  },
                },
              ]}
            />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard title="Program">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code" value={program.code} />
            <Field label="Type" value={program.type} />
            <Field label="Category" value={program.categoryCode ?? ''} />
            <Field
              label="Expiry"
              value={
                program.expiry
                  ? program.expiry.policy === 'ROLLING'
                    ? `Rolling ${program.expiry.rollingDays ?? '?'} days`
                    : program.expiry.policy === 'FIXED_DATE'
                      ? `Fixed ${program.expiry.fixedDate ? new Date(program.expiry.fixedDate).toLocaleDateString() : ''}`
                      : 'Never'
                  : 'Never'
              }
            />
          </div>
          {program.description ? (
            <p className="mt-4 text-sm text-muted-foreground">{program.description}</p>
          ) : null}
        </ContentCard>

        <ContentCard title="Accrual rules">
          {program.rules.length > 0 ? (
            <ul className="divide-y">
              {program.rules.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{rule.name}</span>{' '}
                    <span className="text-muted-foreground">({rule.type})</span>
                  </span>
                  <span className="text-muted-foreground">
                    {rule.points != null
                      ? `${rule.points.toLocaleString()} pts`
                      : rule.rateBasisPoints != null
                        ? `${rule.rateBasisPoints / 100}%`
                        : '—'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No rules" description="This program has no accrual rules yet." />
          )}
        </ContentCard>
      </div>

      <div className="mt-6">
        <Button variant="ghost" onClick={() => navigate('/rewards')}>
          Back to programs
        </Button>
      </div>
    </>
  );
}
