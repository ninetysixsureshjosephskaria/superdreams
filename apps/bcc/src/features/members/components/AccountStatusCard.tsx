import { useState } from 'react';

import { usePermissions } from '@/hooks';
import { useNotificationStore } from '@/store';
import {
  Button,
  ConfirmationDialog,
  ContentCard,
  EmptyState,
  Spinner,
  Textarea,
} from '@superdreams/ui';

import { useChangeMemberAccountStatus, useMemberAccount } from '../hooks';

/** The account statuses an admin can set (PENDING is system-only, not settable). */
type ManageableStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
type AccountAction = { status: ManageableStatus; label: string; destructive: boolean };

const ACCOUNT_ACTIONS: AccountAction[] = [
  { status: 'ACTIVE', label: 'Reactivate', destructive: false },
  { status: 'INACTIVE', label: 'Inactivate', destructive: false },
  { status: 'SUSPENDED', label: 'Suspend', destructive: true },
  { status: 'DEACTIVATED', label: 'Deactivate', destructive: true },
];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

/**
 * Login/account status management for a member. Targets `PATCH /members/:id/account-status`
 * (auth account status — distinct from the member profile status). All transitions
 * are validated + audited server-side, and SUSPEND/DEACTIVATE revoke sessions
 * server-side; this component only invokes the endpoint and confirms first.
 */
export function AccountStatusCard({ id }: { id: string }) {
  const query = useMemberAccount(id);
  const changeAccount = useChangeMemberAccountStatus(id);
  const notify = useNotificationStore((state) => state.notify);
  const { can } = usePermissions();
  const canManage = can('account.status');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<AccountAction | null>(null);

  function confirm() {
    if (!pending || changeAccount.isPending) {
      return; // guard against double submission
    }
    const trimmed = reason.trim();
    changeAccount.mutate(
      { status: pending.status, reason: trimmed || undefined },
      {
        onSuccess: () => {
          notify({ variant: 'success', title: `Login ${pending.label.toLowerCase()}d` });
          setReason('');
          setPending(null);
        },
        onError: (error) => {
          notify({
            variant: 'error',
            title: 'Account status change failed',
            description: error.message,
          });
        },
      },
    );
  }

  return (
    <ContentCard title="Login / account status">
      <p className="mb-3 text-xs text-muted-foreground">
        Controls whether this member can sign in. Separate from the member profile status. Suspend
        and Deactivate revoke active sessions immediately.
      </p>
      {query.isPending ? (
        <Spinner label="Loading account" />
      ) : !query.data || !query.data.linked ? (
        <EmptyState
          title="No login account"
          description="This member has no linked sign-in account."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Account status" value={query.data.accountStatus ?? '—'} />
            <Field label="Email verified" value={query.data.emailVerified ? 'Yes' : 'No'} />
          </div>
          {canManage ? (
            <div className="mt-4 space-y-3">
              <Textarea
                aria-label="Reason"
                placeholder="Reason (optional) — recorded in the audit trail"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_ACTIONS.map((action) => (
                  <Button
                    key={action.status}
                    size="sm"
                    variant="outline"
                    disabled={
                      query.data?.accountStatus === action.status || changeAccount.isPending
                    }
                    onClick={() => setPending(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              You do not have permission to change account status.
            </p>
          )}
        </>
      )}
      <ConfirmationDialog
        isOpen={pending !== null}
        title={pending ? `${pending.label} login account?` : ''}
        description={
          pending?.destructive
            ? 'This revokes the member’s active sessions and blocks sign-in until reactivated.'
            : 'This updates the member’s sign-in access. The backend enforces valid transitions.'
        }
        confirmLabel={pending?.label ?? 'Confirm'}
        tone={pending?.destructive ? 'destructive' : 'default'}
        isConfirming={changeAccount.isPending}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </ContentCard>
  );
}
