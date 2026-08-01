import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { InboxFilter, NotificationChannel, PreferenceInput } from '@superdreams/api-client';
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
  Switch,
  Tabs,
} from '@superdreams/ui';

import {
  useArchiveNotification,
  useInbox,
  useMarkRead,
  usePreferences,
  useUpdatePreferences,
} from '../hooks';

const PAGE_SIZE = 10;

const FILTER_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'Unread', value: 'UNREAD' },
  { label: 'Read', value: 'READ' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const CHANNELS: { channel: NotificationChannel; label: string }[] = [
  { channel: 'IN_APP', label: 'In-app' },
  { channel: 'EMAIL', label: 'Email' },
  { channel: 'SMS', label: 'SMS' },
  { channel: 'PUSH', label: 'Push' },
];

function InboxPanel() {
  const notify = useNotificationStore((state) => state.notify);
  const [filter, setFilter] = useState<InboxFilter>('ALL');
  const [page, setPage] = useState(1);
  const markRead = useMarkRead();
  const archive = useArchiveNotification();
  const query = useInbox({ page, pageSize: PAGE_SIZE, status: filter });

  return (
    <div className="space-y-4">
      <div className="w-48">
        <Select
          aria-label="Filter notifications"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value as InboxFilter);
            setPage(1);
          }}
        />
      </div>
      {query.isError ? (
        <Alert variant="destructive" title="Could not load notifications">
          {query.error.message}
        </Alert>
      ) : query.isPending ? (
        <Spinner label="Loading notifications" />
      ) : query.data.items.length === 0 ? (
        <EmptyState title="No notifications" description="You're all caught up." />
      ) : (
        <ul className="space-y-3">
          {query.data.items.map((n) => {
            const unread = n.readAt === null && n.archivedAt === null;
            return (
              <li
                key={n.id}
                className={`rounded-md border p-4 ${unread ? 'border-primary/40 bg-accent/40' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {n.subject ?? 'Notification'}
                      {unread ? <Badge variant="default">New</Badge> : null}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {unread ? (
                      <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)}>
                        Mark read
                      </Button>
                    ) : null}
                    {n.archivedAt === null ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          archive.mutate(n.id, {
                            onSuccess: () => notify({ variant: 'success', title: 'Archived' }),
                          });
                        }}
                      >
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {query.data ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} notifications</p>
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

function PreferencesPanel() {
  const notify = useNotificationStore((state) => state.notify);
  const query = usePreferences();
  const mutation = useUpdatePreferences();

  const enabledByChannel = useMemo(() => {
    const map = new Map<NotificationChannel, boolean>();
    for (const pref of query.data ?? []) {
      if (pref.groupCode === null) {
        map.set(pref.channel, pref.enabled);
      }
    }
    return map;
  }, [query.data]);

  if (query.isPending) {
    return <Spinner label="Loading preferences" />;
  }
  if (query.isError) {
    return (
      <Alert variant="destructive" title="Could not load preferences">
        {query.error.message}
      </Alert>
    );
  }

  const toggle = (channel: NotificationChannel, enabled: boolean): void => {
    const preferences: PreferenceInput[] = [{ channel, enabled }];
    mutation.mutate(preferences, {
      onSuccess: () => notify({ variant: 'success', title: 'Preferences updated' }),
      onError: (error) =>
        notify({ variant: 'error', title: 'Update failed', description: error.message }),
    });
  };

  return (
    <ContentCard title="Delivery channels">
      <ul className="divide-y">
        {CHANNELS.map(({ channel, label }) => {
          const enabled = enabledByChannel.get(channel) ?? true;
          return (
            <li key={channel} className="flex items-center justify-between py-3">
              <span className="text-sm font-medium">{label}</span>
              <Switch
                checked={enabled}
                aria-label={`${label} notifications`}
                onCheckedChange={(next) => toggle(channel, next)}
              />
            </li>
          );
        })}
      </ul>
    </ContentCard>
  );
}

/** Member self-service notifications: inbox + delivery preferences. */
export default function NotificationsPage() {
  const query = useInbox({ page: 1, pageSize: PAGE_SIZE, status: 'ALL' });

  if (query.isPending) {
    return <LoadingScreen message="Loading notifications…" />;
  }

  return (
    <>
      <Helmet>
        <title>Notifications</title>
      </Helmet>
      <PageHeader title="Notifications" description="Your inbox and delivery preferences." />
      <Tabs
        items={[
          { value: 'inbox', label: 'Inbox', content: <InboxPanel /> },
          { value: 'preferences', label: 'Preferences', content: <PreferencesPanel /> },
        ]}
      />
    </>
  );
}
