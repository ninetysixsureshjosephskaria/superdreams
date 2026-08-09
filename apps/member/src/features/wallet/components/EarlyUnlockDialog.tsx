import { useState, type ReactNode } from 'react';

import type { DepositTrancheData } from '@superdreams/api-client';
import { Alert, Button, Modal, Spinner } from '@superdreams/ui';

import { useEarlyUnlockTranche, useFinancialLimits } from '../hooks';
import { feeCentsFromBps, formatBpsAsPercent, formatMinor, formatUnits } from '../money';

interface EarlyUnlockDialogProps {
  /** The tranche to early-unlock; when null the dialog is closed. */
  tranche: DepositTrancheData | null;
  onClose: () => void;
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === 'danger' ? 'font-semibold text-destructive' : 'font-semibold'}>
        {value}
      </span>
    </div>
  );
}

/**
 * Confirms early-unlock of a LOCKED tranche. Before confirmation it discloses the
 * backend-configured fee (rate + amount) and the bonus that will be forfeited.
 * The fee/amount shown are previews of the backend formula; the backend recomputes
 * and charges the authoritative amount atomically at unlock.
 */
export function EarlyUnlockDialog({ tranche, onClose }: EarlyUnlockDialogProps) {
  const limitsQuery = useFinancialLimits();
  const earlyUnlock = useEarlyUnlockTranche();
  const [done, setDone] = useState(false);

  function handleClose() {
    setDone(false);
    earlyUnlock.reset();
    onClose();
  }

  function handleConfirm() {
    if (!tranche || earlyUnlock.isPending) {
      return;
    }
    earlyUnlock.mutate(tranche.id, { onSuccess: () => setDone(true) });
  }

  const currency = tranche?.currencyCode ?? 'USD';
  const feeBps = limitsQuery.data?.earlyWithdrawFeeBps;
  const feeCents =
    tranche && feeBps !== undefined ? feeCentsFromBps(tranche.principalCents, feeBps) : null;

  let content: ReactNode;
  if (!tranche) {
    content = null;
  } else if (done) {
    content = (
      <div className="space-y-4">
        <Alert variant="success" title="Tranche unlocked">
          {tranche.trancheNumber} has been early-unlocked. The fee has been charged and the pending
          bonus forfeited.
        </Alert>
        <Button fullWidth onClick={handleClose}>
          Done
        </Button>
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
        <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          <Row
            label="Principal"
            value={`${formatUnits(tranche.principalCents)} units · ${formatMinor(tranche.principalCents, currency)}`}
          />
          {limitsQuery.isPending ? (
            <Spinner label="Loading fee" />
          ) : feeBps !== undefined && feeCents !== null ? (
            <>
              <Row
                label={`Early-unlock fee (${formatBpsAsPercent(feeBps)})`}
                value={`- ${formatMinor(feeCents, currency)}`}
                tone="danger"
              />
              <Row
                label="Bonus forfeited"
                value={`- ${formatMinor(tranche.bonusCents, currency)}`}
                tone="danger"
              />
            </>
          ) : null}
        </div>

        <Alert variant="warning" title="This cannot be undone">
          Early-unlocking liquidates this tranche now: the fee above is charged to your funds wallet
          and the pending maturity bonus is forfeited. Waiting until{' '}
          {new Date(tranche.maturesAt).toLocaleDateString()} keeps the bonus.
        </Alert>

        {limitsQuery.isError ? (
          <Alert variant="destructive" title="Could not load the fee">
            {limitsQuery.error.message}
          </Alert>
        ) : null}
        {earlyUnlock.isError ? (
          <Alert variant="destructive" title="Early-unlock failed">
            {earlyUnlock.error.message}
          </Alert>
        ) : null}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            fullWidth
            isLoading={earlyUnlock.isPending}
            disabled={limitsQuery.isPending || earlyUnlock.isPending}
            onClick={handleConfirm}
          >
            Confirm early-unlock
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Modal
      isOpen={tranche !== null}
      onClose={handleClose}
      title="Early-unlock tranche"
      description={tranche ? tranche.trancheNumber : undefined}
    >
      {content}
    </Modal>
  );
}
