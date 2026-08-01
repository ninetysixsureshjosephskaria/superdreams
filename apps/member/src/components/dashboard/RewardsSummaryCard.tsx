import { useMyRewards } from '@/features/rewards/hooks';
import { ContentCard, Icon } from '@superdreams/ui';

/** Rewards summary card backed by the member's real reward balance. */
export function RewardsSummaryCard() {
  const query = useMyRewards();

  return (
    <ContentCard
      title="Rewards"
      actions={<Icon name="gift" size="sm" className="text-muted-foreground" />}
    >
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Couldn’t load your rewards.</p>
      ) : (
        <>
          <p className="text-3xl font-semibold tracking-tight">
            {query.data.pointsBalance.toLocaleString()} pts
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Available points balance</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Lifetime earned</dt>
              <dd className="font-medium">{query.data.lifetimeEarned.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Lifetime redeemed</dt>
              <dd className="font-medium">{query.data.lifetimeRedeemed.toLocaleString()}</dd>
            </div>
          </dl>
        </>
      )}
    </ContentCard>
  );
}
