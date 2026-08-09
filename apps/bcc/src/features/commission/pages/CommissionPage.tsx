import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks';
import { useNotificationStore } from '@/store';
import type {
  CommissionConfigView,
  CommissionTargetData,
  CommissionTierData,
  CommissionTierInput,
} from '@superdreams/api-client';
import {
  Alert,
  Button,
  ConfirmationDialog,
  ContentCard,
  DataTable,
  FormField,
  Input,
  LoadingScreen,
  Modal,
  type DataTableColumn,
} from '@superdreams/ui';

import { bpsToPct, pctToBps, tierRangeLabel } from '../format';
import {
  useCommissionConfig,
  useCreateTarget,
  useDeleteTarget,
  useSetDefaultTiers,
  useUpdateReferralRate,
} from '../hooks';

// --- Tier editor -------------------------------------------------------------

interface TierRow {
  fromUnits: string;
  toUnits: string;
  ratePct: string;
}

function toRows(tiers: CommissionTierData[]): TierRow[] {
  if (tiers.length === 0) {
    return [{ fromUnits: '0', toUnits: '', ratePct: '' }];
  }
  return tiers.map((t) => ({
    fromUnits: String(t.fromUnits),
    toUnits: t.toUnits === null ? '' : String(t.toUnits),
    ratePct: String(bpsToPct(t.rateBps)),
  }));
}

/** Validates the editor rows, returning either an error or the backend payload. */
function validateRows(rows: TierRow[]): { error?: string; tiers?: CommissionTierInput[] } {
  if (rows.length === 0) {
    return { error: 'Add at least one tier.' };
  }
  const tiers: CommissionTierInput[] = [];
  for (const [i, row] of rows.entries()) {
    const from = Number(row.fromUnits);
    const rate = Number(row.ratePct);
    const open = row.toUnits.trim() === '';
    const to = Number(row.toUnits);
    const label = `Tier ${i + 1}`;
    if (!Number.isInteger(from) || from < 0) {
      return { error: `${label}: "from units" must be a whole number ≥ 0.` };
    }
    if (!open && (!Number.isInteger(to) || to < from)) {
      return { error: `${label}: "to units" must be a whole number ≥ from (or blank for ∞).` };
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return { error: `${label}: rate must be between 0 and 100%.` };
    }
    tiers.push({ fromUnits: from, toUnits: open ? null : to, rateBps: pctToBps(rate) });
  }
  return { tiers };
}

function TierEditor({ rows, onChange }: { rows: TierRow[]; onChange: (rows: TierRow[]) => void }) {
  function update(index: number, patch: Partial<TierRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function addRow() {
    onChange([...rows, { fromUnits: '', toUnits: '', ratePct: '' }]);
  }
  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
        <span>From (units)</span>
        <span>To (units)</span>
        <span>Rate (%)</span>
        <span className="sr-only">Remove</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
          <Input
            aria-label={`Tier ${i + 1} from units`}
            type="number"
            min={0}
            value={row.fromUnits}
            onChange={(e) => update(i, { fromUnits: e.target.value })}
          />
          <Input
            aria-label={`Tier ${i + 1} to units`}
            type="number"
            min={0}
            placeholder="∞"
            value={row.toUnits}
            onChange={(e) => update(i, { toUnits: e.target.value })}
          />
          <Input
            aria-label={`Tier ${i + 1} rate percent`}
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={row.ratePct}
            onChange={(e) => update(i, { ratePct: e.target.value })}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={`Remove tier ${i + 1}`}
            disabled={rows.length <= 1}
            onClick={() => removeRow(i)}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={addRow}>
        Add tier
      </Button>
    </div>
  );
}

// --- Referral rate -----------------------------------------------------------

function ReferralRateCard({ config }: { config: CommissionConfigView }) {
  const update = useUpdateReferralRate();
  const notify = useNotificationStore((state) => state.notify);
  const { can } = usePermissions();
  const canManage = can('commission.manage');
  const [pct, setPct] = useState(String(bpsToPct(config.referralRateBps)));

  const rate = Number(pct);
  const error =
    !Number.isFinite(rate) || rate < 0 || rate > 100
      ? 'Referral rate must be between 0 and 100%.'
      : undefined;

  function save() {
    if (error || update.isPending) {
      return;
    }
    update.mutate(
      { rateBps: pctToBps(rate) },
      {
        onSuccess: () => notify({ variant: 'success', title: 'Referral rate updated' }),
        onError: (err) =>
          notify({ variant: 'error', title: 'Could not update rate', description: err.message }),
      },
    );
  }

  return (
    <ContentCard
      title="Member referral rate"
      description="One-time bonus credited to a member's referrer on the referred member's deposit"
    >
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Referral rate (%)" required>
          <Input
            aria-label="Referral rate (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            disabled={!canManage}
          />
        </FormField>
        {canManage ? (
          <Button
            isLoading={update.isPending}
            disabled={Boolean(error) || update.isPending}
            onClick={save}
          >
            Save rate
          </Button>
        ) : null}
      </div>
      {error ? (
        <Alert className="mt-3" variant="destructive" title="Fix before saving">
          {error}
        </Alert>
      ) : null}
      {update.isError ? (
        <Alert className="mt-3" variant="destructive" title="Update failed">
          {update.error.message}
        </Alert>
      ) : null}
      {!canManage ? (
        <p className="mt-3 text-xs text-muted-foreground">
          You do not have permission to change commission config.
        </p>
      ) : null}
    </ContentCard>
  );
}

// --- Default tiers -----------------------------------------------------------

function tierColumns(): DataTableColumn<CommissionTierData>[] {
  return [
    { id: 'range', header: 'Network units', cell: (row) => tierRangeLabel(row) },
    {
      id: 'rate',
      header: 'Commission rate',
      align: 'right',
      cell: (row) => `${bpsToPct(row.rateBps)}%`,
    },
  ];
}

function DefaultTiersDialog({
  isOpen,
  initial,
  onClose,
}: {
  isOpen: boolean;
  initial: CommissionTierData[];
  onClose: () => void;
}) {
  const setTiers = useSetDefaultTiers();
  const notify = useNotificationStore((state) => state.notify);
  const [rows, setRows] = useState<TierRow[]>(() => toRows(initial));

  const { error, tiers } = validateRows(rows);

  function submit() {
    if (error || !tiers || setTiers.isPending) {
      return;
    }
    setTiers.mutate(
      { tiers },
      {
        onSuccess: () => {
          notify({ variant: 'success', title: 'Default tiers updated' });
          onClose();
        },
      },
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit default commission tiers">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Rates are matched against a partner&apos;s total network units. Replacing the table
          overwrites all default tiers.
        </p>
        <TierEditor rows={rows} onChange={setRows} />
        {error ? (
          <Alert variant="destructive" title="Fix before saving">
            {error}
          </Alert>
        ) : null}
        {setTiers.isError ? (
          <Alert variant="destructive" title="Save failed">
            {setTiers.error.message}
          </Alert>
        ) : null}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            fullWidth
            isLoading={setTiers.isPending}
            disabled={Boolean(error) || setTiers.isPending}
            onClick={submit}
          >
            Save tiers
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DefaultTiersCard({ config }: { config: CommissionConfigView }) {
  const { can } = usePermissions();
  const canManage = can('commission.manage');
  const [editing, setEditing] = useState(false);

  return (
    <ContentCard
      title="Default commission tiers"
      description="Fallback tier table used when no dated target is active"
      actions={
        canManage ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit tiers
          </Button>
        ) : undefined
      }
    >
      <DataTable
        columns={tierColumns()}
        rows={config.defaultTiers}
        getRowId={(row) => row.id}
        emptyState="No default tiers configured."
      />
      {editing ? (
        <DefaultTiersDialog
          isOpen={editing}
          initial={config.defaultTiers}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </ContentCard>
  );
}

// --- Targets -----------------------------------------------------------------

function CreateTargetDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const create = useCreateTarget();
  const notify = useNotificationStore((state) => state.notify);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState<TierRow[]>(() => toRows([]));

  const tierResult = validateRows(rows);
  let error = tierResult.error;
  if (!error && (startDate === '' || endDate === '')) {
    error = 'Choose a start and end date.';
  } else if (!error && startDate > endDate) {
    error = 'End date must be on or after the start date.';
  }

  function submit() {
    if (error || !tierResult.tiers || create.isPending) {
      return;
    }
    create.mutate(
      { startDate, endDate, tiers: tierResult.tiers },
      {
        onSuccess: () => {
          notify({ variant: 'success', title: 'Commission target created' });
          onClose();
        },
      },
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New commission target">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start date" required>
            <Input
              aria-label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormField>
          <FormField label="End date" required>
            <Input
              aria-label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </FormField>
        </div>
        <TierEditor rows={rows} onChange={setRows} />
        {error ? (
          <Alert variant="destructive" title="Fix before saving">
            {error}
          </Alert>
        ) : null}
        {create.isError ? (
          <Alert variant="destructive" title="Could not create target">
            {create.error.message}
          </Alert>
        ) : null}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            fullWidth
            isLoading={create.isPending}
            disabled={Boolean(error) || create.isPending}
            onClick={submit}
          >
            Create target
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TargetsCard({ config }: { config: CommissionConfigView }) {
  const del = useDeleteTarget();
  const notify = useNotificationStore((state) => state.notify);
  const { can } = usePermissions();
  const canManage = can('commission.manage');
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CommissionTargetData | null>(null);

  function confirmDelete() {
    if (!pendingDelete || del.isPending) {
      return;
    }
    del.mutate(pendingDelete.id, {
      onSuccess: () => notify({ variant: 'success', title: 'Target removed' }),
      onError: (error) =>
        notify({ variant: 'error', title: 'Could not remove target', description: error.message }),
      onSettled: () => setPendingDelete(null),
    });
  }

  const columns: DataTableColumn<CommissionTargetData>[] = [
    { id: 'start', header: 'Start', cell: (row) => row.startDate },
    { id: 'end', header: 'End', cell: (row) => row.endDate },
    {
      id: 'tiers',
      header: 'Tiers',
      cell: (row) =>
        row.tiers.map((t) => `${tierRangeLabel(t)} → ${bpsToPct(t.rateBps)}%`).join(', '),
    },
  ];

  return (
    <ContentCard
      title="Commission targets"
      description="Date-ranged tier tables that override the defaults while active"
      actions={
        canManage ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            New target
          </Button>
        ) : undefined
      }
    >
      <DataTable
        columns={columns}
        rows={config.targets}
        getRowId={(row) => row.id}
        emptyState="No commission targets scheduled."
        rowActions={
          canManage
            ? (row) => (
                <Button size="sm" variant="destructive" onClick={() => setPendingDelete(row)}>
                  Delete
                </Button>
              )
            : undefined
        }
      />
      {creating ? (
        <CreateTargetDialog isOpen={creating} onClose={() => setCreating(false)} />
      ) : null}
      <ConfirmationDialog
        isOpen={pendingDelete !== null}
        title={
          pendingDelete
            ? `Delete target ${pendingDelete.startDate} – ${pendingDelete.endDate}?`
            : ''
        }
        description="The default tiers will apply again for these dates. This cannot be undone."
        confirmLabel="Delete"
        tone="destructive"
        isConfirming={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </ContentCard>
  );
}

// --- Page --------------------------------------------------------------------

/** Admin commission & referral configuration (requires commission.manage). */
export default function CommissionPage() {
  const query = useCommissionConfig();

  return (
    <>
      <Helmet>
        <title>Commission</title>
      </Helmet>
      <PageHeader
        title="Commission & referral"
        description="Tiered partner commission and the one-time member-referral rate"
      />
      {query.isPending ? (
        <LoadingScreen message="Loading commission config…" />
      ) : query.isError || !query.data ? (
        <Alert variant="destructive" title="Could not load commission config">
          {query.error?.message ?? 'Commission config is unavailable.'}
        </Alert>
      ) : (
        <div className="space-y-6">
          <ReferralRateCard config={query.data} />
          <DefaultTiersCard config={query.data} />
          <TargetsCard config={query.data} />
        </div>
      )}
    </>
  );
}
