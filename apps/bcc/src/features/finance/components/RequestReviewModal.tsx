import { useRef, useState, type ReactNode } from 'react';

import { usePermissions } from '@/hooks/use-permissions';
import { useNotificationStore } from '@/store';
import type { FinancialRequestData } from '@superdreams/api-client';
import { Alert, Badge, Button, FormField, Modal, Spinner, Textarea } from '@superdreams/ui';
import { cn } from '@superdreams/utils';

import { StatusBadge, TypeBadge } from '../badges';
import { decidePermission, isActionable, usd } from '../format';
import { useApproveRequest, useFinanceRequest, useHoldRequest, useRejectRequest } from '../hooks';

interface RequestReviewModalProps {
  /** The request id to review; null closes the modal. */
  requestId: string | null;
  onClose: () => void;
}

type DecisionAction = 'approve' | 'reject' | 'hold';

function DetailRow({
  label,
  value,
  numeric,
}: {
  label: string;
  value: ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-right font-medium', numeric && 'tabular-nums')}>{value}</span>
    </div>
  );
}

/** Plain-language money-moving consequence for each decision (copy only). */
function consequence(
  action: DecisionAction,
  request: FinancialRequestData,
): { variant: 'warning' | 'destructive'; title: string; body: string } {
  const amount = usd(request.amountCents);
  const units = request.units.toLocaleString();
  const kind = request.type.toLowerCase();
  if (action === 'approve') {
    return {
      variant: 'warning',
      title: 'Funds move immediately',
      body: `Approving this ${kind} moves ${amount} (${units} units) now and locks the request. This cannot be undone.`,
    };
  }
  if (action === 'reject') {
    return {
      variant: 'destructive',
      title: 'This locks the request',
      body: 'The request is rejected and locked, and the member is notified. No funds move.',
    };
  }
  return {
    variant: 'warning',
    title: 'Paused without a decision',
    body: 'The request is placed on hold. No funds move — you can release it later.',
  };
}

const SUCCESS_TITLE: Record<DecisionAction, string> = {
  approve: 'Request approved',
  reject: 'Request rejected',
  hold: 'Request placed on hold',
};

/**
 * Review a finance request and, when actionable and permitted, decide it. The
 * decision endpoints perform all wallet movement / tranche / audit work
 * transactionally on the backend — this component only invokes them and never
 * mutates status locally.
 */
export function RequestReviewModal({ requestId, onClose }: RequestReviewModalProps) {
  const { can } = usePermissions();
  const notify = useNotificationStore((state) => state.notify);
  const query = useFinanceRequest(requestId ?? '');
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const hold = useHoldRequest();

  const [action, setAction] = useState<DecisionAction | null>(null);
  const [reason, setReason] = useState('');
  // Synchronous re-entry guard: the `disabled`/`pending` flags only take effect
  // after a re-render, so two rapid clicks could both fire before then.
  const submittingRef = useRef(false);

  const request = query.data;
  const pending = approve.isPending || reject.isPending || hold.isPending;
  const mutationError = approve.error ?? reject.error ?? hold.error;

  function reset() {
    setAction(null);
    setReason('');
    submittingRef.current = false;
    approve.reset();
    reject.reset();
    hold.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function startAction(next: DecisionAction) {
    approve.reset();
    reject.reset();
    hold.reset();
    setReason('');
    setAction(next);
  }

  function submitDecision() {
    if (!request || submittingRef.current) {
      return;
    }
    const trimmed = reason.trim();
    const currentAction = action;
    if (currentAction === null) {
      return;
    }
    if (currentAction === 'reject' && trimmed === '') {
      return; // reason required — also guarded by the disabled button
    }
    // Clear on settle so a failed decision can be retried; success closes + resets.
    const options = {
      onSuccess: () => {
        notify({ variant: 'success', title: SUCCESS_TITLE[currentAction] });
        handleClose();
      },
      onSettled: () => {
        submittingRef.current = false;
      },
    };
    submittingRef.current = true;
    if (action === 'reject') {
      reject.mutate({ id: request.id, reason: trimmed }, options);
    } else if (action === 'approve') {
      approve.mutate({ id: request.id, reason: trimmed || undefined }, options);
    } else if (action === 'hold') {
      hold.mutate({ id: request.id, reason: trimmed || undefined }, options);
    } else {
      submittingRef.current = false;
    }
  }

  let body: ReactNode = null;
  if (requestId) {
    if (query.isPending) {
      body = <Spinner label="Loading request" />;
    } else if (query.isError || !request) {
      body = (
        <Alert variant="destructive" title="Could not load the request">
          <div className="space-y-3">
            <p>{query.error?.message ?? 'The request is not available.'}</p>
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
      );
    } else {
      const canDecide = can(decidePermission(request.type));
      const actionable = isActionable(request.status);
      const rejectReasonMissing = action === 'reject' && reason.trim() === '';

      body = (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TypeBadge type={request.type} />
            <StatusBadge status={request.status} />
            {request.early ? <Badge variant="warning">Early</Badge> : null}
          </div>

          <div className="divide-y rounded-card border bg-muted/30 px-3">
            <DetailRow label="Request" value={request.requestNumber} numeric />
            <DetailRow label="Member" value={request.memberId} numeric />
            <DetailRow label="Units" value={request.units.toLocaleString()} numeric />
            <DetailRow
              label="Amount"
              value={<span className="text-base">{usd(request.amountCents)}</span>}
              numeric
            />
            <DetailRow
              label="Submitted"
              value={new Date(request.createdAt).toLocaleString()}
              numeric
            />
            {request.reason ? <DetailRow label="Reason" value={request.reason} /> : null}
            {request.decidedAt ? (
              <DetailRow
                label="Decided"
                value={new Date(request.decidedAt).toLocaleString()}
                numeric
              />
            ) : null}
            {request.decidedBy ? (
              <DetailRow label="Decided by" value={request.decidedBy} numeric />
            ) : null}
          </div>

          {mutationError ? (
            <Alert variant="destructive" title="Decision failed">
              {mutationError.message}
            </Alert>
          ) : null}

          {!actionable ? (
            <p className="text-sm text-muted-foreground">This request has already been decided.</p>
          ) : !canDecide ? (
            <Alert variant="info" title="Not permitted">
              You don’t have permission to action {request.type.toLowerCase()} requests.
            </Alert>
          ) : action ? (
            <div className="space-y-3 rounded-card border p-3">
              {(() => {
                const c = consequence(action, request);
                return (
                  <Alert variant={c.variant} title={c.title}>
                    {c.body}
                  </Alert>
                );
              })()}
              <FormField
                label="Reason"
                required={action === 'reject'}
                hint={action === 'reject' ? 'Required to reject' : 'Optional'}
                error={rejectReasonMissing ? 'A reason is required to reject.' : undefined}
              >
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  invalid={rejectReasonMissing}
                  placeholder="Add a note for the audit trail"
                />
              </FormField>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={reset} disabled={pending}>
                  Back
                </Button>
                <Button
                  type="button"
                  variant={action === 'reject' ? 'destructive' : 'primary'}
                  isLoading={pending}
                  disabled={pending || rejectReasonMissing}
                  onClick={submitDecision}
                >
                  Confirm {action}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => startAction('approve')}>
                Approve
              </Button>
              <Button type="button" variant="secondary" onClick={() => startAction('hold')}>
                Hold
              </Button>
              <Button type="button" variant="destructive" onClick={() => startAction('reject')}>
                Reject
              </Button>
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <Modal
      isOpen={requestId !== null}
      onClose={handleClose}
      title="Review request"
      description={request?.requestNumber}
      mobileSheet
    >
      {body}
    </Modal>
  );
}
