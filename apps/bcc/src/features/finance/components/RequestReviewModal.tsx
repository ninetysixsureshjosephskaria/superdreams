import { useRef, useState, type ReactNode } from 'react';

import { usePermissions } from '@/hooks/use-permissions';
import { Alert, Badge, Button, FormField, Modal, Spinner, Textarea } from '@superdreams/ui';

import { StatusBadge, TypeBadge } from '../badges';
import { decidePermission, isActionable, usd } from '../format';
import { useApproveRequest, useFinanceRequest, useHoldRequest, useRejectRequest } from '../hooks';

interface RequestReviewModalProps {
  /** The request id to review; null closes the modal. */
  requestId: string | null;
  onClose: () => void;
}

type DecisionAction = 'approve' | 'reject' | 'hold';

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/**
 * Review a finance request and, when actionable and permitted, decide it. The
 * decision endpoints perform all wallet movement / tranche / audit work
 * transactionally on the backend — this component only invokes them and never
 * mutates status locally.
 */
export function RequestReviewModal({ requestId, onClose }: RequestReviewModalProps) {
  const { can } = usePermissions();
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
    if (action === 'reject' && trimmed === '') {
      return; // reason required — also guarded by the disabled button
    }
    // Clear on settle so a failed decision can be retried; success closes + resets.
    const options = {
      onSuccess: handleClose,
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
          {query.error?.message ?? 'The request is not available.'}
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

          <div className="divide-y rounded-md border px-3">
            <DetailRow label="Request" value={request.requestNumber} />
            <DetailRow label="Member" value={request.memberId} />
            <DetailRow label="Units" value={request.units.toLocaleString()} />
            <DetailRow label="Amount" value={usd(request.amountCents)} />
            <DetailRow label="Submitted" value={new Date(request.createdAt).toLocaleString()} />
            {request.reason ? <DetailRow label="Reason" value={request.reason} /> : null}
            {request.decidedAt ? (
              <DetailRow label="Decided" value={new Date(request.decidedAt).toLocaleString()} />
            ) : null}
            {request.decidedBy ? <DetailRow label="Decided by" value={request.decidedBy} /> : null}
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
            <div className="space-y-3 rounded-md border p-3">
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
    >
      {body}
    </Modal>
  );
}
