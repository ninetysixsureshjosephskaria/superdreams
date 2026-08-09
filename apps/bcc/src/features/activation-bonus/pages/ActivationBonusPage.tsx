import { useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks';
import { useNotificationStore } from '@/store';
import type { ActivationConfigData, ActivationRewardType } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ConfirmationDialog,
  ContentCard,
  FormField,
  Input,
  LoadingScreen,
  Select,
  Switch,
} from '@superdreams/ui';

import { useActivationConfig, useRunActivationSweep, useUpdateActivationConfig } from '../hooks';

const REWARD_OPTIONS = [
  { value: 'PERCENT', label: 'Percentage of balance' },
  { value: 'FIXED', label: 'Fixed amount (USD)' },
];

// --- Config form -------------------------------------------------------------

function ConfigForm({ initial }: { initial: ActivationConfigData }) {
  const update = useUpdateActivationConfig();
  const notify = useNotificationStore((state) => state.notify);
  const { can } = usePermissions();
  const canManage = can('activation.bonus.manage');

  const [enabled, setEnabled] = useState(initial.enabled);
  const [rewardType, setRewardType] = useState<ActivationRewardType>(initial.rewardType);
  // Both PERCENT (bps) and FIXED (cents) are stored as value/100 for display.
  const [value, setValue] = useState(String(initial.value / 100));
  const [lockDays, setLockDays] = useState(String(initial.lockDays));

  const valueN = Number(value);
  const lockN = Number(lockDays);
  const isPercent = rewardType === 'PERCENT';

  let error: string | undefined;
  if (!Number.isFinite(valueN) || valueN < 0) {
    error = 'Enter a reward value of zero or greater.';
  } else if (isPercent && valueN > 100) {
    error = 'A percentage reward cannot exceed 100%.';
  } else if (!isPercent && valueN > 100_000) {
    error = 'A fixed reward cannot exceed $100,000.';
  } else if (!Number.isInteger(lockN) || lockN < 0 || lockN > 3650) {
    error = 'Lock days must be a whole number between 0 and 3650.';
  }

  function save() {
    if (error || update.isPending) {
      return;
    }
    update.mutate(
      {
        enabled,
        rewardType,
        value: Math.round(valueN * 100),
        lockDays: lockN,
      },
      {
        onSuccess: () => notify({ variant: 'success', title: 'Activation bonus updated' }),
        onError: (err) =>
          notify({ variant: 'error', title: 'Could not update config', description: err.message }),
      },
    );
  }

  return (
    <ContentCard
      title="Configuration"
      description="Granted automatically when a member adds 2 members within 24 hours"
    >
      <div className="mb-4">
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          label="Activation bonus enabled"
          disabled={!canManage}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Reward type">
          <Select
            aria-label="Reward type"
            options={REWARD_OPTIONS}
            value={rewardType}
            onChange={(e) => setRewardType(e.target.value as ActivationRewardType)}
            disabled={!canManage}
          />
        </FormField>
        <FormField label={isPercent ? 'Reward (% of balance)' : 'Reward (USD)'} required>
          <Input
            aria-label="Reward value"
            type="number"
            min={0}
            step={isPercent ? '0.01' : '1'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!canManage}
          />
        </FormField>
        <FormField label="Lock days">
          <Input
            aria-label="Lock days"
            type="number"
            min={0}
            max={3650}
            value={lockDays}
            onChange={(e) => setLockDays(e.target.value)}
            disabled={!canManage}
          />
        </FormField>
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
            Save config
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          You do not have permission to change the activation bonus.
        </p>
      )}
    </ContentCard>
  );
}

// --- Operational sweep -------------------------------------------------------

function SweepCard() {
  const sweep = useRunActivationSweep();
  const notify = useNotificationStore((state) => state.notify);
  const [confirming, setConfirming] = useState(false);
  const submittingRef = useRef(false);

  function run() {
    if (submittingRef.current || sweep.isPending) {
      return;
    }
    submittingRef.current = true;
    sweep.mutate(undefined, {
      onSuccess: (result) =>
        notify({
          variant: 'success',
          title: 'Activation sweep complete',
          description: `${result.granted} member(s) newly granted`,
        }),
      onError: (err) =>
        notify({ variant: 'error', title: 'Sweep failed', description: err.message }),
      onSettled: () => {
        submittingRef.current = false;
        setConfirming(false);
      },
    });
  }

  return (
    <ContentCard
      title="Run qualification sweep"
      description="Re-evaluate every recruiter and grant the bonus to those who now qualify"
    >
      <p className="mb-4 text-sm text-muted-foreground">
        The backend credits a real activation bonus only to members who genuinely qualify. The run
        is idempotent — members already granted are skipped.
      </p>
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Run activation sweep
      </Button>

      <ConfirmationDialog
        isOpen={confirming}
        title="Run the activation-bonus sweep?"
        description="This evaluates every recruiter and credits a real activation bonus (TXN-A) to each member who now qualifies. It moves money. The run is idempotent — already-granted members are skipped."
        confirmLabel="Run sweep"
        tone="destructive"
        isConfirming={sweep.isPending}
        onConfirm={run}
        onCancel={() => setConfirming(false)}
      />
    </ContentCard>
  );
}

// --- Page --------------------------------------------------------------------

/** Admin activation-bonus config + qualification sweep (requires activation.bonus.manage). */
export default function ActivationBonusPage() {
  const query = useActivationConfig();
  const { can } = usePermissions();
  const canManage = can('activation.bonus.manage');

  return (
    <>
      <Helmet>
        <title>Activation bonus</title>
      </Helmet>
      <PageHeader
        title="Activation bonus"
        description="Network-wide activation reward for members who recruit two members within 24 hours"
      />
      {query.isPending ? (
        <LoadingScreen message="Loading activation config…" />
      ) : query.isError || !query.data ? (
        <Alert variant="destructive" title="Could not load activation config">
          {query.error?.message ?? 'The config is unavailable.'}
        </Alert>
      ) : (
        <div className="space-y-6">
          <ConfigForm initial={query.data} />
          {canManage ? <SweepCard /> : null}
        </div>
      )}
    </>
  );
}
