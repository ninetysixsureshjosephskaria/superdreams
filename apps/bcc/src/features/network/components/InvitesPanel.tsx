import { useState } from 'react';

import { StatusPill } from '@/components/status-pill';
import type { Invite, InviteRole, InviteStatus } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  FormField,
  Input,
  Modal,
  Pagination,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { useCreateInvite, useDeleteInvite, useInvites, useRevokeInvite } from '../hooks';

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { label: 'All roles', value: '' },
  { label: 'Partner', value: 'PARTNER' },
  { label: 'Member', value: 'MEMBER' },
];

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Used', value: 'USED' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Revoked', value: 'REVOKED' },
];

function CreateInviteDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const create = useCreateInvite();
  const [role, setRole] = useState<InviteRole>('MEMBER');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [created, setCreated] = useState<Invite | null>(null);

  function handleClose() {
    setRole('MEMBER');
    setExpiresInDays('');
    setCreated(null);
    create.reset();
    onClose();
  }

  function submit() {
    if (create.isPending) {
      return;
    }
    const days = expiresInDays.trim();
    create.mutate(
      {
        role,
        // Only send expiry when the admin sets it — never invent a default TTL.
        ...(days !== '' && Number.isFinite(Number(days)) ? { expiresInDays: Number(days) } : {}),
      },
      { onSuccess: (invite) => setCreated(invite) },
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create invite" mobileSheet>
      {created ? (
        <div className="space-y-4">
          <Alert variant="success" title="Invite created">
            Code <span className="font-mono font-semibold">{created.code}</span> ({created.role}).
          </Alert>
          <Button fullWidth onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <FormField label="Role" required>
            <Select
              aria-label="Invite role"
              options={ROLE_OPTIONS.slice(1)}
              value={role}
              onChange={(event) => setRole(event.target.value as InviteRole)}
            />
          </FormField>
          <FormField
            label="Expires in days"
            hint="Optional — leave blank to use the backend default"
          >
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="e.g. 7"
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(event.target.value)}
            />
          </FormField>
          {create.isError ? (
            <Alert variant="destructive" title="Could not create invite">
              {create.error.message}
            </Alert>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" fullWidth isLoading={create.isPending} onClick={submit}>
              Create invite
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Admin invite management (requires invite.send): list, create, revoke, delete. */
export function InvitesPanel() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<{ code: string; action: 'revoke' | 'delete' } | null>(
    null,
  );

  const query = useInvites({
    page,
    pageSize: PAGE_SIZE,
    role: role ? (role as InviteRole) : undefined,
    status: status ? (status as InviteStatus) : undefined,
  });
  const revoke = useRevokeInvite();
  const del = useDeleteInvite();
  const mutating = revoke.isPending || del.isPending;

  function confirmAction() {
    if (!pending || mutating) {
      return;
    }
    const onSettled = () => setPending(null);
    if (pending.action === 'revoke') {
      revoke.mutate(pending.code, { onSettled });
    } else {
      del.mutate(pending.code, { onSettled });
    }
  }

  const columns: DataTableColumn<Invite>[] = [
    {
      id: 'code',
      header: 'Code',
      cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
    },
    {
      id: 'role',
      header: 'Role',
      cell: (row) => (
        <Badge soft variant="secondary">
          {row.role}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <StatusPill status={row.status} />,
    },
    {
      id: 'expiresAt',
      header: 'Expires',
      cell: (row) => (
        <span className="tabular-nums">
          {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      align: 'right',
      cell: (row) => (
        <span className="tabular-nums">{new Date(row.createdAt).toLocaleString()}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-40">
          <Select
            aria-label="Filter by role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Filter invites by status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button className="ml-auto" size="sm" onClick={() => setCreateOpen(true)}>
          Create invite
        </Button>
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load invites">
          <div className="space-y-3">
            <p>{query.error.message}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : !query.isPending && query.data && query.data.items.length === 0 ? (
        <EmptyState title="No invites" description="Create an invite to grow the network." />
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={query.isPending}
          rowActions={(row) => (
            <div className="flex gap-2">
              {row.status === 'PENDING' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPending({ code: row.code, action: 'revoke' })}
                >
                  Revoke
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setPending({ code: row.code, action: 'delete' })}
              >
                Delete
              </Button>
            </div>
          )}
        />
      )}

      {query.data ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} invites</p>
          <Pagination
            page={query.data.page}
            pageCount={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <CreateInviteDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmationDialog
        isOpen={pending !== null}
        title={pending?.action === 'revoke' ? 'Revoke invite?' : 'Delete invite?'}
        description={
          pending?.action === 'revoke'
            ? 'The invite code can no longer be used to join.'
            : 'This permanently removes the invite record.'
        }
        confirmLabel={pending?.action === 'revoke' ? 'Revoke' : 'Delete'}
        tone="destructive"
        mobileSheet
        isConfirming={mutating}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
