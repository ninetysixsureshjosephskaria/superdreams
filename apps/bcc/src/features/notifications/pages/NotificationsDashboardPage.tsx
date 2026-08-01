import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { NotificationData, NotificationStatus } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DataTable,
  Icon,
  Pagination,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { NotificationStatusBadge } from '../components/NotificationBadges';
import {
  useCancelNotification,
  useNotifications,
  useProcessQueue,
  useQueueOverview,
  useRetryNotification,
} from '../hooks';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

function QueueStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** Notification dashboard: queue overview, delivery history and queue actions. */
export default function NotificationsDashboardPage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const queue = useQueueOverview();
  const process = useProcessQueue();
  const retry = useRetryNotification();
  const cancel = useCancelNotification();
  const query = useNotifications({
    page,
    pageSize: PAGE_SIZE,
    status: status ? (status as NotificationStatus) : undefined,
  });

  const counts = queue.data?.counts ?? {};

  const columns: DataTableColumn<NotificationData>[] = [
    {
      id: 'subject',
      header: 'Notification',
      cell: (n) => (
        <div>
          <p className="font-medium">{n.subject ?? n.body.slice(0, 40)}</p>
          <p className="text-xs text-muted-foreground">{n.channel}</p>
        </div>
      ),
    },
    {
      id: 'recipient',
      header: 'Recipient',
      cell: (n) => n.recipientMemberId ?? n.recipientUserId ?? '—',
    },
    { id: 'status', header: 'Status', cell: (n) => <NotificationStatusBadge status={n.status} /> },
    {
      id: 'date',
      header: 'Created',
      align: 'right',
      cell: (n) => new Date(n.createdAt).toLocaleString(),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Notifications</title>
      </Helmet>
      <PageHeader
        title="Notifications"
        description="Queue, delivery status and history."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/notifications/templates')}>
              Templates
            </Button>
            <Button
              variant="outline"
              isLoading={process.isPending}
              onClick={() => {
                process.mutate(undefined, {
                  onSuccess: (result) =>
                    notify({
                      variant: 'success',
                      title: 'Queue processed',
                      description: `${result.sent} sent, ${result.failed} failed, ${result.dead} dead-lettered.`,
                    }),
                });
              }}
            >
              Process queue
            </Button>
            <Button
              leftIcon={<Icon name="plus" size="sm" />}
              onClick={() => navigate('/notifications/send')}
            >
              Send
            </Button>
          </div>
        }
      />

      <ContentCard title="Queue" className="mb-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <QueueStat label="Pending" value={counts.PENDING ?? 0} />
          <QueueStat label="Processing" value={counts.PROCESSING ?? 0} />
          <QueueStat label="Sent" value={counts.SENT ?? 0} />
          <QueueStat label="Failed" value={counts.FAILED ?? 0} />
          <QueueStat label="Dead" value={counts.DEAD ?? 0} />
          <QueueStat label="Cancelled" value={counts.CANCELLED ?? 0} />
        </div>
      </ContentCard>

      <div className="mb-4 w-48">
        <Select
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load notifications">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(n) => n.id}
          isLoading={query.isPending}
          rowActions={(n) =>
            n.status === 'FAILED' ? (
              <Button
                variant="ghost"
                size="sm"
                isLoading={retry.isPending}
                onClick={() => {
                  retry.mutate(n.id, {
                    onSuccess: () => notify({ variant: 'success', title: 'Requeued' }),
                  });
                }}
              >
                Retry
              </Button>
            ) : ['DRAFT', 'QUEUED'].includes(n.status) ? (
              <Button
                variant="ghost"
                size="sm"
                isLoading={cancel.isPending}
                onClick={() => {
                  cancel.mutate(n.id, {
                    onSuccess: () => notify({ variant: 'success', title: 'Cancelled' }),
                  });
                }}
              >
                Cancel
              </Button>
            ) : null
          }
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} notifications</p>
          <Pagination
            page={query.data.page}
            pageCount={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </>
  );
}
