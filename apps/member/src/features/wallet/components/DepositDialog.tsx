import { useState, type FormEvent } from 'react';

import type { FinancialRequestData } from '@superdreams/api-client';
import { Alert, Button, FormField, Input, Modal } from '@superdreams/ui';

import { useCreateDeposit, useFinancialLimits } from '../hooks';
import { formatMinor, formatUsdFromUnits } from '../money';

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Deposit request form. Amount is entered in whole units (1 unit = $30) with the
 * USD equivalent shown live. Client-side validation mirrors the backend limits
 * for immediate UX feedback, but the backend remains authoritative — submitting
 * only creates a PENDING request; no funds move until an admin approves.
 */
export function DepositDialog({ isOpen, onClose }: DepositDialogProps) {
  const limitsQuery = useFinancialLimits();
  const createDeposit = useCreateDeposit();
  const [unitsText, setUnitsText] = useState('');
  const [submitted, setSubmitted] = useState<FinancialRequestData | null>(null);

  const limits = limitsQuery.data;
  const units = Number(unitsText);
  const hasInput = unitsText.trim() !== '';

  let validationError: string | undefined;
  if (hasInput) {
    if (!Number.isInteger(units) || units < 1) {
      validationError = 'Enter a whole number of units (at least 1).';
    } else if (limits && units < limits.minDepositUnits) {
      validationError = `Minimum deposit is ${limits.minDepositUnits} unit(s).`;
    } else if (limits && units > limits.maxDepositUnits) {
      validationError = `Maximum deposit is ${limits.maxDepositUnits} units.`;
    }
  }

  const canSubmit = hasInput && !validationError && !createDeposit.isPending;

  function handleClose() {
    setUnitsText('');
    setSubmitted(null);
    createDeposit.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    createDeposit.mutate({ units }, { onSuccess: (request) => setSubmitted(request) });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add funds"
      description="Deposit in units — 1 unit = $30"
    >
      {submitted ? (
        <div className="space-y-4">
          <Alert variant="success" title="Deposit request submitted">
            Request {submitted.requestNumber} for {submitted.units} units (
            {formatMinor(submitted.amountCents, submitted.currencyCode)}) is now pending approval.
          </Alert>
          <p className="text-sm text-muted-foreground">
            Your funds wallet is credited only after an administrator approves this request. Track
            its status under “Deposit requests”.
          </p>
          <Button fullWidth onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Units to deposit"
            required
            error={validationError}
            hint={
              limits
                ? `Allowed range: ${limits.minDepositUnits}–${limits.maxDepositUnits} units`
                : 'Loading limits…'
            }
          >
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder="e.g. 10"
              value={unitsText}
              onChange={(event) => setUnitsText(event.target.value)}
              invalid={Boolean(validationError)}
            />
          </FormField>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">USD equivalent</span>
              <span className="font-semibold">
                {hasInput && !validationError ? formatUsdFromUnits(units) : '—'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">1 unit = $30</p>
          </div>

          {limitsQuery.isError ? (
            <Alert variant="destructive" title="Could not load deposit limits">
              {limitsQuery.error.message}
            </Alert>
          ) : null}
          {createDeposit.isError ? (
            <Alert variant="destructive" title="Deposit could not be submitted">
              {createDeposit.error.message}
            </Alert>
          ) : null}

          <Alert variant="info" title="Approval required">
            Submitting a deposit does not credit your funds wallet immediately. Funds are credited
            only after your request is approved.
          </Alert>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              isLoading={createDeposit.isPending}
              disabled={!canSubmit}
            >
              Submit deposit
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
