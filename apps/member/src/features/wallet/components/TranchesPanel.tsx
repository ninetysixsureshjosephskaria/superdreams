import { useState } from 'react';

import type { DepositTrancheData, DepositTrancheStatus } from '@superdreams/api-client';
import { Alert, Badge, Button, EmptyState, Spinner, type BadgeVariant } from '@superdreams/ui';

import { useMyTranches } from '../hooks';
import { formatBpsAsPercent, formatMinor, formatUnits } from '../money';
import { EarlyUnlockDialog } from './EarlyUnlockDialog';

const STATUS_VARIANT: Record<DepositTrancheStatus, BadgeVariant> = {
  LOCKED: 'warning',
  MATURED: 'success',
  UNLOCKED: 'secondary',
  LIQUIDATED: 'outline',
};

const STATUS_LABEL: Record<DepositTrancheStatus, string> = {
  LOCKED: 'Locked',
  MATURED: 'Matured',
  UNLOCKED: 'Unlocked',
  LIQUIDATED: 'Early-unlocked',
};

function TrancheRow({
  tranche,
  onEarlyUnlock,
}: {
  tranche: DepositTrancheData;
  onEarlyUnlock: (tranche: DepositTrancheData) => void;
}) {
  const { currencyCode } = tranche;
  return (
    <li className="space-y-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {formatUnits(tranche.principalCents)} units ·{' '}
          {formatMinor(tranche.principalCents, currencyCode)}
        </p>
        <Badge variant={STATUS_VARIANT[tranche.status]}>{STATUS_LABEL[tranche.status]}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <dt>Bonus</dt>
          <dd className="font-medium text-foreground">
            {formatBpsAsPercent(tranche.bonusBps)} · {formatMinor(tranche.bonusCents, currencyCode)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Lock</dt>
          <dd className="font-medium text-foreground">{tranche.lockDays} days</dd>
        </div>
        <div className="flex justify-between">
          <dt>Matures</dt>
          <dd className="font-medium text-foreground">
            {new Date(tranche.maturesAt).toLocaleDateString()}
          </dd>
        </div>
        {tranche.status === 'LIQUIDATED' ? (
          <div className="flex justify-between">
            <dt>Fee charged</dt>
            <dd className="font-medium text-foreground">
              {formatMinor(tranche.feeCents, currencyCode)}
            </dd>
          </div>
        ) : (
          <div className="flex justify-between">
            <dt>Tranche</dt>
            <dd className="font-medium text-foreground">{tranche.trancheNumber}</dd>
          </div>
        )}
      </dl>
      {tranche.status === 'LOCKED' ? (
        <Button size="sm" variant="outline" onClick={() => onEarlyUnlock(tranche)}>
          Early-unlock
        </Button>
      ) : null}
    </li>
  );
}

/**
 * The member's deposit tranches: principal, bonus, lock period, maturity date and
 * status. LOCKED tranches can be early-unlocked (with a fee + bonus forfeiture,
 * confirmed in {@link EarlyUnlockDialog}). Read-only otherwise.
 */
export function TranchesPanel() {
  const query = useMyTranches();
  const [selected, setSelected] = useState<DepositTrancheData | null>(null);

  if (query.isPending) {
    return <Spinner label="Loading your tranches" />;
  }
  if (query.isError) {
    return (
      <Alert variant="destructive" title="Could not load your tranches">
        {query.error.message}
      </Alert>
    );
  }
  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No tranches yet"
        description="Approved deposits create a locked tranche that earns a bonus at maturity."
      />
    );
  }

  return (
    <>
      <ul className="divide-y rounded-md border">
        {query.data.map((tranche) => (
          <TrancheRow key={tranche.id} tranche={tranche} onEarlyUnlock={setSelected} />
        ))}
      </ul>
      <EarlyUnlockDialog tranche={selected} onClose={() => setSelected(null)} />
    </>
  );
}
