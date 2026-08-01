import { useNavigate } from 'react-router-dom';

import { useMyWallet } from '@/features/wallet/hooks';
import { formatMinor } from '@/features/wallet/money';
import { Button, ContentCard, Icon } from '@superdreams/ui';

/** Wallet summary card backed by the member's real wallet. */
export function WalletSummaryCard() {
  const navigate = useNavigate();
  const query = useMyWallet();

  return (
    <ContentCard
      title="Wallet"
      actions={<Icon name="wallet" size="sm" className="text-muted-foreground" />}
    >
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Couldn’t load your wallet.</p>
      ) : (
        <>
          <p className="text-3xl font-semibold tracking-tight">
            {formatMinor(query.data.balance.availableMinor, query.data.balance.currencyCode)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMinor(query.data.balance.totalMinor, query.data.balance.currencyCode)} total ·{' '}
            {query.data.balance.currencyCode}
          </p>
        </>
      )}
      <Button
        className="mt-4"
        variant="outline"
        leftIcon={<Icon name="wallet" size="sm" />}
        onClick={() => navigate('/wallet')}
      >
        View wallet
      </Button>
    </ContentCard>
  );
}
