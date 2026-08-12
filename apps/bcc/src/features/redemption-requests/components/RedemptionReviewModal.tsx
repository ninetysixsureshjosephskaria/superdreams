import { useRef, useState, type ReactNode } from 'react';

import { usePermissions } from '@/hooks/use-permissions';
import { useNotificationStore } from '@/store';
import { Alert, Button, FormField, Modal, Spinner, Textarea } from '@superdreams/ui';
import { cn } from '@superdreams/utils';

import { StatusBadge } from '../badges';
import { useApproveRedemption, useRedemptionRequest, useRejectRedemption } from '../hooks';

interface RedemptionReviewModalProps {
  /** The request id to review; null closes the modal. */
  requestId: string | null;
  onClose: () => void;
}

type DecisionAction = 'approve' | 'reject';

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

/**
 * Review a member points-redemption request and, when PENDING and permitted,
 * approve or reject it. The decision endpoints perform all points-ledger movement
 * and audit work transactionally on the backend — this component only invokes
 * them and never mutates status locally. Approval debits points; reject moves
 * nothing.
 */
export function RedemptionReviewModal({ requestId, onClose }: RedemptionReviewModalProps) {
  const { can } = usePermissions();
  const notify = useNotificationStore((state) => state.notify);
  const query = useRedemptionRequest(requestId ?? '');
  const approve = useApproveRedemption();
  const reject = useRejectRedemption();

  const [action, setAction] = useState<DecisionAction | null>(null);
  const [reason, setReason] = useState('');
  const submittingRef = useRef(false);

  const request = query.data;
  const pending = approve.isPending || reject.isPending;
  const mutationError = approve.error ?? reject.error;

  function reset() {
    setAction(null);
    setReason('');
    submittingRef.current = false;
    approve.reset();
    reject.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function startAction(next: DecisionAction) {
    approve.reset();
    reject.reset();
    setReason('');
    setAction(next);
  }

  function submitDecision() {
    if (!request || submittingRef.current || action === null) {
      return;
    }
    const trimmed = reason.trim();
    const options = {
      onSuccess: () => {
        notify({
          variant: 'success',
          title: action === 'approve' ? 'Request approved' : 'Request rejected',
        });
        handleClose();
      },
      onSettled: () => {
        submittingRef.current = false;
      },
    };
    submittingRef.current = true;
    if (action === 'approve') {
      approve.mutate({ id: request.id }, options);
    } else {
      reject.mutate({ id: request.id, reason: trimmed || undefined }, options);
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
      const canApprove = can('redemption.request.approve');
      const canReject = can('redemption.request.reject');
      const actionable = request.status === 'PENDING';

      body = (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
          </div>

          <div className="divide-y rounded-card border bg-muted/30 px-3">
            <DetailRow label="Member" value={request.memberId} numeric />
            <DetailRow
              label="Points requested"
              value={request.pointsRequested.toLocaleString()}
              numeric
            />
            <DetailRow
              label="Submitted"
              value={new Date(request.createdAt).toLocaleString()}
              numeric
            />
            {request.note ? <DetailRow label="Member note" value={request.note} /> : null}
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
            {request.decisionReason ? (
              <DetailRow label="Reason" value={request.decisionReason} />
            ) : null}
          </div>

          {mutationError ? (
            <Alert variant="destructive" title="Decision failed">
              {mutationError.message}
            </Alert>
          ) : null}

          {!actionable ? (
            <p className="text-sm text-muted-foreground">This request has already been decided.</p>
          ) : action === 'approve' ? (
            <div className="space-y-3 rounded-card border p-3">
              <Alert variant="warning" title="Points are debited immediately">
                Approving debits {request.pointsRequested.toLocaleString()} points from the member
                and locks the request. If the member no longer has enough points, approval is
                blocked and the request stays pending.
              </Alert>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={reset} disabled={pending}>
                  Back
                </Button>
                <Button
                  type="button"
                  isLoading={pending}
                  disabled={pending}
                  onClick={submitDecision}
                >
                  Confirm approve
                </Button>
              </div>
            </div>
          ) : action === 'reject' ? (
            <div className="space-y-3 rounded-card border p-3">
              <Alert variant="destructive" title="This locks the request">
                The request is rejected and locked. No points move.
              </Alert>
              <FormField label="Reason" hint="Optional">
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Add a note for the audit trail (optional)"
                />
              </FormField>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={reset} disabled={pending}>
                  Back
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  isLoading={pending}
                  disabled={pending}
                  onClick={submitDecision}
                >
                  Confirm reject
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {canApprove ? (
                <Button type="button" onClick={() => startAction('approve')}>
                  Approve
                </Button>
              ) : null}
              {canReject ? (
                <Button type="button" variant="destructive" onClick={() => startAction('reject')}>
                  Reject
                </Button>
              ) : null}
              {!canApprove && !canReject ? (
                <Alert variant="info" title="Not permitted">
                  You don’t have permission to decide redemption requests.
                </Alert>
              ) : null}
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
      title="Review redemption request"
      mobileSheet
    >
      {body}
    </Modal>
  );
}
