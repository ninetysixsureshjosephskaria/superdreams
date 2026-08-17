import { useMyRewardHistory } from '@/features/rewards/hooks';
import { ContentCard, EmptyState } from '@superdreams/ui';
import { cn } from '@superdreams/utils';

/**
 * Recent reward activity backed by the member's real points ledger. Points only —
 * this replaces the former monetary "Recent transactions" wallet card (Super
 * Dreams communicates points/rewards, not currency).
 */
export function RecentRewardActivity() {
  const query = useMyRewardHistory({ page: 1, pageSize: 6 });
  const items = query.data?.items ?? [];

  return (
    <ContentCard
      title="Recent reward activity"
      description="Your latest points earned and redeemed"
    >
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Couldn’t load your reward activity.</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No reward activity yet"
          description="Points you earn and redeem will appear here."
        />
      ) : (
        <ul className="divide-y">
          {items.map((txn) => {
            const isEarn = txn.direction !== 'DEBIT';
            return (
              <li
                key={txn.id}
                className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {txn.description ?? txn.type.charAt(0) + txn.type.slice(1).toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(txn.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 font-medium',
                    isEarn ? 'text-success' : 'text-foreground',
                  )}
                >
                  {isEarn ? '+' : '−'}
                  {txn.points.toLocaleString()} pts
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ContentCard>
  );
}
