import { useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks';
import { useNotificationStore } from '@/store';
import type {
  BonusCampaignData,
  BonusFrequency,
  BonusScope,
  BonusStatus,
} from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  ConfirmationDialog,
  DataTable,
  FormField,
  Input,
  Modal,
  Select,
  Switch,
  type BadgeProps,
  type DataTableColumn,
} from '@superdreams/ui';

import { bpsToPct, isoToLocalInput, localInputToIso, pctToBps } from '../format';
import {
  useBonusCampaigns,
  useCreateBonusCampaign,
  useDeleteBonusCampaign,
  useUpdateBonusCampaign,
} from '../hooks';

const SCOPE_OPTIONS = [
  { value: 'FIRST_DEPOSIT', label: 'First deposit' },
  { value: 'ALL_DEPOSITS', label: 'All deposits' },
];
const FREQUENCY_OPTIONS = [
  { value: 'SINGLE', label: 'Single (once per member)' },
  { value: 'MULTI', label: 'Multi (every eligible deposit)' },
];

const STATUS_VARIANT: Record<BonusStatus, BadgeProps['variant']> = {
  LIVE: 'success',
  SCHEDULED: 'secondary',
  ENDED: 'secondary',
  DISABLED: 'destructive',
};

function windowLabel(row: BonusCampaignData): string {
  if (row.permanent) {
    return 'Permanent';
  }
  const start = row.startAt ? new Date(row.startAt).toLocaleDateString() : '—';
  const end = row.endAt ? new Date(row.endAt).toLocaleDateString() : '—';
  return `${start} → ${end}`;
}

// --- Create / edit dialog ----------------------------------------------------

function CampaignDialog({
  editing,
  onClose,
}: {
  editing: BonusCampaignData | null;
  onClose: () => void;
}) {
  const create = useCreateBonusCampaign();
  const update = useUpdateBonusCampaign();
  const notify = useNotificationStore((state) => state.notify);
  const isEdit = editing !== null;

  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? '');
  const [scope, setScope] = useState<BonusScope>(editing?.scope ?? 'FIRST_DEPOSIT');
  const [frequency, setFrequency] = useState<BonusFrequency>(editing?.frequency ?? 'SINGLE');
  const [ratePct, setRatePct] = useState(editing ? String(editing.rateBps / 100) : '');
  const [minUnits, setMinUnits] = useState(String(editing?.minUnits ?? 0));
  const [lockDays, setLockDays] = useState(String(editing?.lockDays ?? 30));
  const [permanent, setPermanent] = useState(editing?.permanent ?? false);
  const [startAt, setStartAt] = useState(isoToLocalInput(editing?.startAt ?? null));
  const [endAt, setEndAt] = useState(isoToLocalInput(editing?.endAt ?? null));
  const [enabled, setEnabled] = useState(editing?.enabled ?? true);

  const submittingRef = useRef(false);
  const pending = create.isPending || update.isPending;
  const mutationError = create.error ?? update.error;
  const rateN = Number(ratePct);
  const minN = Number(minUnits);
  const lockN = Number(lockDays);

  let error: string | undefined;
  if (name.trim() === '') {
    error = 'Name is required.';
  } else if (!Number.isFinite(rateN) || rateN < 0 || rateN > 100) {
    error = 'Bonus rate must be between 0 and 100%.';
  } else if (!Number.isInteger(minN) || minN < 0) {
    error = 'Minimum units must be a whole number ≥ 0.';
  } else if (!Number.isInteger(lockN) || lockN < 0 || lockN > 3650) {
    error = 'Lock days must be a whole number between 0 and 3650.';
  } else if (!permanent && startAt !== '' && endAt !== '' && endAt < startAt) {
    error = 'The end date must be on or after the start date.';
  }

  function submit() {
    if (error || pending || submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    const onSuccess = () => {
      notify({ variant: 'success', title: isEdit ? 'Campaign updated' : 'Campaign created' });
      onClose();
    };
    const onSettled = () => {
      submittingRef.current = false;
    };
    if (isEdit) {
      update.mutate(
        {
          id: editing.id,
          input: {
            name: name.trim(),
            icon: icon.trim() || null,
            scope,
            frequency,
            rateBps: pctToBps(rateN),
            minUnits: minN,
            lockDays: lockN,
            permanent,
            startAt: permanent || startAt === '' ? null : localInputToIso(startAt),
            endAt: permanent || endAt === '' ? null : localInputToIso(endAt),
            enabled,
          },
        },
        { onSuccess, onSettled },
      );
    } else {
      create.mutate(
        {
          name: name.trim(),
          scope,
          frequency,
          rateBps: pctToBps(rateN),
          minUnits: minN,
          lockDays: lockN,
          permanent,
          enabled,
          ...(icon.trim() ? { icon: icon.trim() } : {}),
          ...(!permanent && startAt !== '' ? { startAt: localInputToIso(startAt) } : {}),
          ...(!permanent && endAt !== '' ? { endAt: localInputToIso(endAt) } : {}),
        },
        { onSuccess, onSettled },
      );
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? `Edit ${editing.name}` : 'New bonus campaign'}>
      <div className="space-y-4">
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <FormField label="Name" required>
            <Input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Icon" hint="optional">
            <Input
              aria-label="Icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. 🎁"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Eligibility">
            <Select
              aria-label="Eligibility"
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={(e) => setScope(e.target.value as BonusScope)}
            />
          </FormField>
          <FormField label="Claim mode">
            <Select
              aria-label="Claim mode"
              options={FREQUENCY_OPTIONS}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as BonusFrequency)}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Bonus rate (%)" required>
            <Input
              aria-label="Bonus rate (%)"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={ratePct}
              onChange={(e) => setRatePct(e.target.value)}
            />
          </FormField>
          <FormField label="Min units">
            <Input
              aria-label="Min units"
              type="number"
              min={0}
              value={minUnits}
              onChange={(e) => setMinUnits(e.target.value)}
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
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Starts at">
            <Input
              aria-label="Starts at"
              type="datetime-local"
              value={startAt}
              disabled={permanent}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </FormField>
          <FormField label="Ends at">
            <Input
              aria-label="Ends at"
              type="datetime-local"
              value={endAt}
              disabled={permanent}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </FormField>
        </div>
        <div className="flex flex-wrap gap-6">
          <Switch checked={permanent} onCheckedChange={setPermanent} label="Permanent (no dates)" />
          <Switch checked={enabled} onCheckedChange={setEnabled} label="Enabled" />
        </div>

        {error ? (
          <Alert variant="destructive" title="Fix before saving">
            {error}
          </Alert>
        ) : null}
        {mutationError ? (
          <Alert variant="destructive" title="Save failed">
            {mutationError.message}
          </Alert>
        ) : null}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            fullWidth
            isLoading={pending}
            disabled={Boolean(error) || pending}
            onClick={submit}
          >
            {isEdit ? 'Save changes' : 'Create campaign'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Page --------------------------------------------------------------------

/** Admin bonus-campaign management (config only; requires bonus.manage). */
export default function BonusCampaignsPage() {
  const query = useBonusCampaigns();
  const del = useDeleteBonusCampaign();
  const notify = useNotificationStore((state) => state.notify);
  const { can } = usePermissions();
  const canManage = can('bonus.manage');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BonusCampaignData | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BonusCampaignData | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(campaign: BonusCampaignData) {
    setEditing(campaign);
    setDialogOpen(true);
  }
  function confirmDelete() {
    if (!pendingDelete || del.isPending) {
      return;
    }
    del.mutate(pendingDelete.id, {
      onSuccess: () => notify({ variant: 'success', title: `${pendingDelete.name} removed` }),
      onError: (error) =>
        notify({
          variant: 'error',
          title: 'Could not remove campaign',
          description: error.message,
        }),
      onSettled: () => setPendingDelete(null),
    });
  }

  const columns: DataTableColumn<BonusCampaignData>[] = [
    { id: 'name', header: 'Name', cell: (row) => row.name },
    {
      id: 'scope',
      header: 'Eligibility',
      cell: (row) => (
        <Badge variant="secondary">
          {row.scope === 'FIRST_DEPOSIT' ? 'First deposit' : 'All deposits'}
        </Badge>
      ),
    },
    { id: 'frequency', header: 'Mode', cell: (row) => row.frequency },
    { id: 'rate', header: 'Rate', align: 'right', cell: (row) => bpsToPct(row.rateBps) },
    {
      id: 'minUnits',
      header: 'Min units',
      align: 'right',
      cell: (row) => row.minUnits.toLocaleString(),
    },
    { id: 'lockDays', header: 'Lock', align: 'right', cell: (row) => `${row.lockDays}d` },
    { id: 'window', header: 'Window', cell: (row) => windowLabel(row) },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Bonus campaigns</title>
      </Helmet>
      <PageHeader
        title="Bonus campaigns"
        description="Deposit-bonus campaigns (config only — the engine selects and applies bonuses)"
        actions={canManage ? <Button onClick={openCreate}>New campaign</Button> : undefined}
      />

      {query.isError ? (
        <Alert variant="destructive" title="Could not load campaigns">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data ?? []}
          getRowId={(row) => row.id}
          isLoading={query.isPending}
          emptyState="No bonus campaigns yet."
          rowActions={
            canManage
              ? (row) => (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setPendingDelete(row)}>
                      Delete
                    </Button>
                  </div>
                )
              : undefined
          }
        />
      )}

      {dialogOpen ? (
        <CampaignDialog editing={editing} onClose={() => setDialogOpen(false)} />
      ) : null}
      <ConfirmationDialog
        isOpen={pendingDelete !== null}
        title={pendingDelete ? `Delete ${pendingDelete.name}?` : ''}
        description="The campaign stops applying to new deposits. Bonuses already written to tranches are unaffected. This cannot be undone."
        confirmLabel="Delete"
        tone="destructive"
        isConfirming={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
