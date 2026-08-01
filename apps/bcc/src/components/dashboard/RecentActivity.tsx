import type { RecentActivityItem } from '@superdreams/api-client';
import { ContentCard, EmptyState, Icon } from '@superdreams/ui';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Recent activity feed backed by the platform audit log. */
export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <ContentCard title="Recent activity" description="Latest platform events">
      {items.length === 0 ? (
        <EmptyState title="No recent activity" description="Platform events will appear here." />
      ) : (
        <ul className="space-y-4">
          {items.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon name="info" size="sm" />
              </span>
              <div className="min-w-0 text-sm">
                <p>
                  <span className="font-medium capitalize">{entry.action}</span>{' '}
                  <span className="text-muted-foreground">{entry.entityType}</span>
                  {entry.module ? (
                    <span className="text-muted-foreground"> · {entry.module}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ContentCard>
  );
}
