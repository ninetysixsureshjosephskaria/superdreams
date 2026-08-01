import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { ReportScheduleData, ScheduleFrequency } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  ContentCard,
  DataTable,
  Input,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { useCreateSchedule, useDeleteSchedule, useReportSchedules } from '../hooks';

const PAGE_SIZE = 10;

const FREQUENCY_OPTIONS = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
];

/** Scheduled reports: list, create and remove recurring runs. */
export default function SchedulesPage() {
  const notify = useNotificationStore((state) => state.notify);
  const [page] = useState(1);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('DAILY');

  const query = useReportSchedules({ page, pageSize: PAGE_SIZE });
  const create = useCreateSchedule();
  const remove = useDeleteSchedule();

  const columns: DataTableColumn<ReportScheduleData>[] = [
    { id: 'name', header: 'Name', cell: (s) => s.name },
    { id: 'report', header: 'Report', cell: (s) => s.reportCode },
    { id: 'frequency', header: 'Frequency', cell: (s) => s.frequency },
    { id: 'format', header: 'Format', cell: (s) => s.format },
    {
      id: 'active',
      header: 'Active',
      cell: (s) => <Badge>{s.isActive ? 'Active' : 'Paused'}</Badge>,
    },
    {
      id: 'next',
      header: 'Next run',
      align: 'right',
      cell: (s) => (s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : '—'),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Scheduled reports</title>
      </Helmet>
      <PageHeader title="Scheduled reports" description="Recurring report runs." />

      <ContentCard title="New schedule" className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="code">
              Report code
            </label>
            <Input
              id="code"
              placeholder="MEMBERS_SUMMARY"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="sname">
              Name
            </label>
            <Input
              id="sname"
              placeholder="Daily members"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              aria-label="Frequency"
              options={FREQUENCY_OPTIONS}
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as ScheduleFrequency)}
            />
          </div>
          <Button
            isLoading={create.isPending}
            disabled={code.trim().length === 0 || name.trim().length === 0}
            onClick={() => {
              create.mutate(
                { code: code.trim(), name: name.trim(), frequency, format: 'CSV' },
                {
                  onSuccess: () => {
                    setCode('');
                    setName('');
                    notify({ variant: 'success', title: 'Schedule created' });
                  },
                  onError: (error) =>
                    notify({
                      variant: 'error',
                      title: 'Could not create',
                      description: error.message,
                    }),
                },
              );
            }}
          >
            Create
          </Button>
        </div>
      </ContentCard>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load schedules">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(s) => s.id}
          isLoading={query.isPending}
          rowActions={(s) => (
            <Button
              variant="ghost"
              size="sm"
              isLoading={remove.isPending}
              onClick={() => {
                remove.mutate(s.id, {
                  onSuccess: () => notify({ variant: 'success', title: 'Schedule removed' }),
                });
              }}
            >
              Delete
            </Button>
          )}
        />
      )}
    </>
  );
}
