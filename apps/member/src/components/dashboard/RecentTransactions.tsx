import { useMyWalletTransactions } from '@/features/wallet/hooks';
import { formatMinor } from '@/features/wallet/money';
import { ContentCard, EmptyState } from '@superdreams/ui';
import { cn } from '@superdreams/utils';

/** Recent transactions list backed by the member's real wallet ledger. */
export function RecentTransactions() {
  const query = useMyWalletTransactions({ page: 1, pageSize: 6 });
  const items = query.data?.items ?? [];

  return (
    <ContentCard title="Recent transactions" description="Latest wallet activity">
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Couldn’t load your transactions.</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Your wallet activity will appear here."
        />
      ) : (
        <ul className="divide-y">
          {items.map((transaction) => {
            const isCredit = transaction.direction === 'CREDIT';
            const amount = formatMinor(transaction.amountMinor, transaction.currencyCode);
            return (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {transaction.description ?? transaction.type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 font-medium',
                    isCredit ? 'text-success' : 'text-foreground',
                  )}
                >
                  {isCredit ? '+' : '−'}
                  {amount}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </ContentCard>
  );
}
