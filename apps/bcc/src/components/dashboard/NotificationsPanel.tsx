import { useQuery } from '@tanstack/react-query';

import { notificationsApi } from '@/features/notifications/api';
import { ContentCard, EmptyState } from '@superdreams/ui';

/** Compact notifications panel backed by the signed-in user's inbox. */
export function NotificationsPanel() {
  const query = useQuery({
    queryKey: ['notifications', 'me', 'inbox', 'panel'],
    queryFn: () => notificationsApi.inbox({ pageSize: 5 }),
  });
  const items = query.data?.items ?? [];

  return (
    <ContentCard title="Notifications">
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Couldn’t load notifications.</p>
      ) : items.length === 0 ? (
        <EmptyState title="All caught up" description="You have no new notifications." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const isUnread = item.readAt === null;
            return (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                {isUnread ? (
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                  />
                ) : null}
                <div className={isUnread ? '' : 'pl-4'}>
                  <p className="font-medium">{item.subject ?? 'Notification'}</p>
                  <p className="text-xs text-muted-foreground">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ContentCard>
  );
}
