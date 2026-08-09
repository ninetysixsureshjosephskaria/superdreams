import { useState, type FormEvent, type ReactNode } from 'react';

import type { FinancialRequestData } from '@superdreams/api-client';
import { Alert, Button, FormField, Input, Modal, Spinner } from '@superdreams/ui';

import { useCreateWithdrawal, useFinancialLimits, useMyFinancialWallet } from '../hooks';
import { formatMinor, formatUnits, unitsToCents } from '../money';

interface WithdrawDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Available / requested / remaining, shown as units + USD. */
function BalanceRow({
  label,
  cents,
  currency,
  emphasis,
}: {
  label: string;
  cents: number;
  currency: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={emphasis ? 'font-semibold' : 'font-medium'}>
        {formatUnits(cents)} units · {formatMinor(cents, currency)}
      </span>
    </div>
  );
}

/**
 * Withdrawal request form. Amount is entered in whole units (1 unit = $30). Shows
 * available balance, the requested amount and the resulting remaining balance.
 * Client-side validation mirrors the backend (minimum withdrawal + available
 * balance) for immediate UX, but the backend remains authoritative — submitting
 * only creates a PENDING request; the wallet is debited only at approval.
 *
 * No fee is shown: the withdrawal endpoint charges none (the early-unlock fee
 * applies to the separate tranche early-unlock flow, not to withdrawals).
 */
export function WithdrawDialog({ isOpen, onClose }: WithdrawDialogProps) {
  const walletQuery = useMyFinancialWallet();
  const limitsQuery = useFinancialLimits();
  const createWithdrawal = useCreateWithdrawal();
  const [unitsText, setUnitsText] = useState('');
  const [submitted, setSubmitted] = useState<FinancialRequestData | null>(null);

  const wallet = walletQuery.data;
  const limits = limitsQuery.data;
  const availableCents = wallet?.balance.availableMinor ?? 0;
  const currency = wallet?.currencyCode ?? 'USD';
  const units = Number(unitsText);
  const hasInput = unitsText.trim() !== '';
  const amountCents = hasInput && Number.isFinite(units) ? unitsToCents(units) : 0;

  let validationError: string | undefined;
  if (hasInput) {
    if (!Number.isInteger(units) || units < 1) {
      validationError = 'Enter a whole number of units (at least 1).';
    } else if (limits && amountCents < limits.minWithdrawCents) {
      validationError = `Minimum withdrawal is ${formatMinor(limits.minWithdrawCents, currency)}.`;
    } else if (amountCents > availableCents) {
      validationError = 'Withdrawal exceeds your available balance.';
    }
  }

  const noBalance = !walletQuery.isPending && (walletQuery.error?.status === 404 || !wallet);
  const canSubmit = hasInput && !validationError && !createWithdrawal.isPending && !noBalance;

  function handleClose() {
    setUnitsText('');
    setSubmitted(null);
    createWithdrawal.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    createWithdrawal.mutate({ units }, { onSuccess: (request) => setSubmitted(request) });
  }

  let content: ReactNode;
  if (submitted) {
    content = (
      <div className="space-y-4">
        <Alert variant="success" title="Withdrawal request submitted">
          Request {submitted.requestNumber} for {submitted.units} units (
          {formatMinor(submitted.amountCents, submitted.currencyCode)}) has been submitted and is
          awaiting approval.
        </Alert>
        <p className="text-sm text-muted-foreground">
          Your wallet is debited only after an administrator approves this request. Track its status
          under “Deposit &amp; withdrawal requests”.
        </p>
        <Button fullWidth onClick={handleClose}>
          Done
        </Button>
      </div>
    );
  } else if (walletQuery.isPending) {
    content = <Spinner label="Loading your balance" />;
  } else if (noBalance) {
    content = (
      <div className="space-y-4">
        <Alert variant="info" title="No funds to withdraw">
          You don’t have a funds balance yet. Your funds wallet is created when your first deposit
          is approved.
        </Alert>
        <Button fullWidth variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </div>
    );
  } else {
    const remainingCents =
      amountCents > 0 && !validationError ? availableCents - amountCents : null;
    content = (
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <BalanceRow label="Available balance" cents={availableCents} currency={currency} />
        </div>

        <FormField
          label="Units to withdraw"
          required
          error={validationError}
          hint={
            limits
              ? `Minimum withdrawal: ${formatMinor(limits.minWithdrawCents, currency)}`
              : 'Loading limits…'
          }
        >
          <Input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="e.g. 5"
            value={unitsText}
            onChange={(event) => setUnitsText(event.target.value)}
            invalid={Boolean(validationError)}
          />
        </FormField>

        <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          <BalanceRow
            label="Withdrawal amount"
            cents={hasInput && !validationError ? amountCents : 0}
            currency={currency}
            emphasis
          />
          {remainingCents !== null ? (
            <BalanceRow label="Remaining balance" cents={remainingCents} currency={currency} />
          ) : null}
          <p className="text-xs text-muted-foreground">1 unit = $30</p>
        </div>

        {limitsQuery.isError ? (
          <Alert variant="destructive" title="Could not load withdrawal limits">
            {limitsQuery.error.message}
          </Alert>
        ) : null}
        {createWithdrawal.isError ? (
          <Alert variant="destructive" title="Withdrawal could not be submitted">
            {createWithdrawal.error.message}
          </Alert>
        ) : null}

        <Alert variant="info" title="Approval required">
          Submitting a withdrawal does not debit your wallet immediately. Your balance is reduced
          only after your request is approved.
        </Alert>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            fullWidth
            isLoading={createWithdrawal.isPending}
            disabled={!canSubmit}
          >
            Submit withdrawal
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Withdraw funds"
      description="Withdraw in units — 1 unit = $30"
    >
      {content}
    </Modal>
  );
}
