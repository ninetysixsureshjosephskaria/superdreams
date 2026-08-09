import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks';
import { useNotificationStore } from '@/store';
import type { FinancialLimitsData, UpdateFinancialLimitsInput } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  FormField,
  Input,
  LoadingScreen,
  Switch,
} from '@superdreams/ui';

import { useFinancialLimits, useUpdateLimits } from '../hooks';

function LimitsForm({ initial }: { initial: FinancialLimitsData }) {
  const update = useUpdateLimits();
  const notify = useNotificationStore((state) => state.notify);
  const { can } = usePermissions();
  const canManage = can('finance.limits.manage');

  const [minDeposit, setMinDeposit] = useState(String(initial.minDepositUnits));
  const [maxDeposit, setMaxDeposit] = useState(String(initial.maxDepositUnits));
  const [minWithdrawUsd, setMinWithdrawUsd] = useState((initial.minWithdrawCents / 100).toString());
  const [earlyAllowed, setEarlyAllowed] = useState(initial.earlyWithdrawAllowed);
  const [feePct, setFeePct] = useState((initial.earlyWithdrawFeeBps / 100).toString());
  const [procMin, setProcMin] = useState(String(initial.processingMinDays));
  const [procMax, setProcMax] = useState(String(initial.processingMaxDays));

  const minDepN = Number(minDeposit);
  const maxDepN = Number(maxDeposit);
  const feeN = Number(feePct);

  let error: string | undefined;
  if (!Number.isInteger(minDepN) || minDepN < 1) {
    error = 'Minimum deposit must be a whole number of at least 1 unit.';
  } else if (!Number.isInteger(maxDepN) || maxDepN < minDepN) {
    error = 'Maximum deposit must be a whole number ≥ the minimum.';
  } else if (!Number.isFinite(feeN) || feeN < 0 || feeN > 100) {
    error = 'Early-unlock fee must be between 0 and 100%.';
  }

  function save() {
    if (error || update.isPending) {
      return;
    }
    const input: UpdateFinancialLimitsInput = {
      minDepositUnits: minDepN,
      maxDepositUnits: maxDepN,
      minWithdrawCents: Math.round(Number(minWithdrawUsd) * 100),
      earlyWithdrawAllowed: earlyAllowed,
      earlyWithdrawFeeBps: Math.round(feeN * 100),
      processingMinDays: Math.round(Number(procMin)),
      processingMaxDays: Math.round(Number(procMax)),
    };
    update.mutate(input, {
      onSuccess: () => notify({ variant: 'success', title: 'Limits updated' }),
      onError: (err) =>
        notify({ variant: 'error', title: 'Could not update limits', description: err.message }),
    });
  }

  return (
    <ContentCard title="Deposit & withdrawal policy">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Minimum deposit (units)" required>
          <Input
            aria-label="Minimum deposit (units)"
            type="number"
            min={1}
            value={minDeposit}
            onChange={(e) => setMinDeposit(e.target.value)}
          />
        </FormField>
        <FormField label="Maximum deposit (units)" required>
          <Input
            type="number"
            min={1}
            value={maxDeposit}
            onChange={(e) => setMaxDeposit(e.target.value)}
          />
        </FormField>
        <FormField label="Minimum withdrawal (USD)" required>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={minWithdrawUsd}
            onChange={(e) => setMinWithdrawUsd(e.target.value)}
          />
        </FormField>
        <FormField
          label="Early-unlock fee (%)"
          required
          hint="Applied to a tranche's principal on early-unlock"
        >
          <Input
            aria-label="Early-unlock fee (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={feePct}
            onChange={(e) => setFeePct(e.target.value)}
          />
        </FormField>
        <FormField label="Processing time — min (days)">
          <Input
            type="number"
            min={0}
            value={procMin}
            onChange={(e) => setProcMin(e.target.value)}
          />
        </FormField>
        <FormField label="Processing time — max (days)">
          <Input
            type="number"
            min={0}
            value={procMax}
            onChange={(e) => setProcMax(e.target.value)}
          />
        </FormField>
      </div>

      <div className="mt-4">
        <Switch
          checked={earlyAllowed}
          onCheckedChange={setEarlyAllowed}
          label="Allow early withdrawal / early tranche unlock"
        />
      </div>

      {error ? (
        <Alert className="mt-4" variant="destructive" title="Fix before saving">
          {error}
        </Alert>
      ) : null}
      {update.isError ? (
        <Alert className="mt-4" variant="destructive" title="Update failed">
          {update.error.message}
        </Alert>
      ) : null}

      {canManage ? (
        <div className="mt-4">
          <Button
            isLoading={update.isPending}
            disabled={Boolean(error) || update.isPending}
            onClick={save}
          >
            Save limits
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          You do not have permission to change limits.
        </p>
      )}
    </ContentCard>
  );
}

/** Admin editor for the system-wide finance limits + early-unlock policy. */
export default function FinanceLimitsPage() {
  const query = useFinancialLimits();

  return (
    <>
      <Helmet>
        <title>Finance limits</title>
      </Helmet>
      <PageHeader
        title="Limits & withdrawals"
        description="System-wide deposit, withdrawal and early-unlock policy"
      />
      {query.isPending ? (
        <LoadingScreen message="Loading limits…" />
      ) : query.isError || !query.data ? (
        <Alert variant="destructive" title="Could not load limits">
          {query.error?.message ?? 'Limits are unavailable.'}
        </Alert>
      ) : (
        <LimitsForm initial={query.data} />
      )}
    </>
  );
}
