import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks';
import { useNotificationStore } from '@/store';
import type { CurrencyData } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  ConfirmationDialog,
  DataTable,
  FormField,
  Input,
  Modal,
  Switch,
  type DataTableColumn,
} from '@superdreams/ui';

import { useCreateCurrency, useCurrencies, useDeleteCurrency, useUpdateCurrency } from '../hooks';

function CurrencyFormDialog({
  isOpen,
  editing,
  onClose,
}: {
  isOpen: boolean;
  editing: CurrencyData | null;
  onClose: () => void;
}) {
  const create = useCreateCurrency();
  const update = useUpdateCurrency();
  const notify = useNotificationStore((state) => state.notify);
  const isEdit = editing !== null;

  const [code, setCode] = useState(editing?.code ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [symbol, setSymbol] = useState(editing?.symbol ?? '');
  const [perUnitValue, setPerUnitValue] = useState(editing ? String(editing.perUnitValue) : '');
  const [flagSlug, setFlagSlug] = useState(editing?.flagSlug ?? '');
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);

  const pending = create.isPending || update.isPending;
  const mutationError = create.error ?? update.error;
  const perUnitN = Number(perUnitValue);

  let error: string | undefined;
  if (!isEdit && !/^[A-Za-z]{3}$/.test(code.trim())) {
    error = 'Use a 3-letter ISO currency code.';
  } else if (name.trim() === '') {
    error = 'Name is required.';
  } else if (!Number.isInteger(perUnitN) || perUnitN <= 0) {
    error = 'Enter a per-unit value greater than 0.';
  }

  function submit() {
    if (error || pending) {
      return;
    }
    const onSuccess = () => {
      notify({ variant: 'success', title: isEdit ? 'Currency updated' : 'Currency created' });
      onClose();
    };
    if (isEdit) {
      update.mutate(
        {
          code: editing.code,
          input: {
            name: name.trim(),
            symbol: symbol.trim() || undefined,
            perUnitValue: perUnitN,
            flagSlug: flagSlug.trim() || undefined,
            isActive,
          },
        },
        { onSuccess },
      );
    } else {
      create.mutate(
        {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          symbol: symbol.trim() || undefined,
          perUnitValue: perUnitN,
          flagSlug: flagSlug.trim() || undefined,
          isActive,
        },
        { onSuccess },
      );
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit ${editing.code}` : 'Add currency'}
    >
      <div className="space-y-4">
        {!isEdit ? (
          <FormField label="Code" required hint="3-letter ISO code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. AED" />
          </FormField>
        ) : null}
        <FormField label="Name" required>
          <Input
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. UAE Dirham"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Symbol">
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. د.إ"
            />
          </FormField>
          <FormField label="Per-unit value" required hint="Value of 1 unit ($30 base)">
            <Input
              aria-label="Per-unit value"
              type="number"
              min={1}
              value={perUnitValue}
              onChange={(e) => setPerUnitValue(e.target.value)}
            />
          </FormField>
        </div>
        <FormField label="Flag slug">
          <Input
            value={flagSlug}
            onChange={(e) => setFlagSlug(e.target.value)}
            placeholder="e.g. ae"
          />
        </FormField>
        <Switch checked={isActive} onCheckedChange={setIsActive} label="Active" />

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
            {isEdit ? 'Save changes' : 'Add currency'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Admin currency management (fixed internal table; mutations require currency.manage). */
export default function CurrenciesPage() {
  const query = useCurrencies();
  const del = useDeleteCurrency();
  const notify = useNotificationStore((state) => state.notify);
  const { can } = usePermissions();
  const canManage = can('currency.manage');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CurrencyData | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CurrencyData | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(currency: CurrencyData) {
    setEditing(currency);
    setFormOpen(true);
  }
  function confirmDelete() {
    if (!pendingDelete || del.isPending) {
      return;
    }
    del.mutate(pendingDelete.code, {
      onSuccess: () => notify({ variant: 'success', title: `${pendingDelete.code} removed` }),
      onError: (error) =>
        notify({
          variant: 'error',
          title: 'Could not remove currency',
          description: error.message,
        }),
      onSettled: () => setPendingDelete(null),
    });
  }

  const columns: DataTableColumn<CurrencyData>[] = [
    {
      id: 'code',
      header: 'Code',
      cell: (row) => (
        <span className="flex items-center gap-2 font-medium">
          {row.code}
          {row.isBase ? <Badge variant="secondary">Base</Badge> : null}
        </span>
      ),
    },
    { id: 'name', header: 'Name', cell: (row) => row.name },
    {
      id: 'perUnit',
      header: 'Per unit',
      align: 'right',
      cell: (row) => row.perUnitValue.toLocaleString(),
    },
    {
      id: 'perUsd',
      header: '1 USD =',
      align: 'right',
      cell: (row) => row.perUsd.toLocaleString(),
    },
    {
      id: 'active',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.isActive ? 'success' : 'secondary'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Currencies</title>
      </Helmet>
      <PageHeader
        title="Currencies"
        description="Fixed internal currency table (1 unit = $30 base)"
        actions={canManage ? <Button onClick={openCreate}>Add currency</Button> : undefined}
      />

      {query.isError ? (
        <Alert variant="destructive" title="Could not load currencies">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data ?? []}
          getRowId={(row) => row.code}
          isLoading={query.isPending}
          rowActions={
            canManage
              ? (row) => (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    {!row.isBase ? (
                      <Button size="sm" variant="destructive" onClick={() => setPendingDelete(row)}>
                        Delete
                      </Button>
                    ) : null}
                  </div>
                )
              : undefined
          }
        />
      )}

      {formOpen ? (
        <CurrencyFormDialog
          isOpen={formOpen}
          editing={editing}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
      <ConfirmationDialog
        isOpen={pendingDelete !== null}
        title={pendingDelete ? `Delete ${pendingDelete.code}?` : ''}
        description="Members can no longer lock to this currency. This cannot be undone."
        confirmLabel="Delete"
        tone="destructive"
        isConfirming={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
