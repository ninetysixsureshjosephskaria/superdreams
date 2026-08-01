import { useQuery } from '@tanstack/react-query';

import { notificationsApi } from '@/features/notifications/api';
import { Badge, Icon, Popover } from '@superdreams/ui';
import { cn } from '@superdreams/utils';

const TRIGGER_CLASS =
  'relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Relative "time ago" label from an ISO timestamp. */
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Header notifications dropdown backed by the signed-in user's real inbox. */
export function NotificationsMenu() {
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'me', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
  });
  const inboxQuery = useQuery({
    queryKey: ['notifications', 'me', 'inbox', 'recent'],
    queryFn: () => notificationsApi.inbox({ pageSize: 6 }),
  });

  const unread = unreadQuery.data ?? 0;
  const items = inboxQuery.data?.items ?? [];

  return (
    <Popover
      align="end"
      triggerClassName={TRIGGER_CLASS}
      className="w-80 p-0"
      trigger={
        <>
          <Icon name="bell" size="sm" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-medium text-destructive-foreground">
              {unread}
            </span>
          ) : null}
          <span className="sr-only">Notifications ({unread} unread)</span>
        </>
      }
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-semibold">Notifications</p>
        <Badge variant="secondary">{unread} new</Badge>
      </div>
      {inboxQuery.isPending ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : inboxQuery.isError ? (
        <p className="px-4 py-6 text-center text-sm text-destructive">
          Couldn’t load notifications.
        </p>
      ) : items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">You’re all caught up.</p>
      ) : (
        <ul className="max-h-80 divide-y overflow-auto">
          {items.map((item) => {
            const isUnread = item.readAt === null;
            return (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  {isUnread ? (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                    />
                  ) : null}
                  <div className={cn('min-w-0', !isUnread && 'pl-4')}>
                    <p className="truncate text-sm font-medium">{item.subject ?? 'Notification'}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.body}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Popover>
  );
}
