import type { Database } from '@/database/client';
import { buildPaginatedResult } from '@/database/helpers';
import { withTransaction } from '@/database/helpers/transaction';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';

import type {
  PaginatedRedemptionRequests,
  RedemptionRequestActor,
  RedemptionRequestData,
} from '../dto';
import type { RedemptionRequestEventBus } from '../events';
import type {
  RedemptionMemberLookupRepository,
  RedemptionRequestAuditRepository,
  RedemptionRequestRepository,
  RedemptionRequestRow,
} from '../repositories';
import {
  listRedemptionRequestsQuerySchema,
  rejectRedemptionRequestSchema,
  submitRedemptionRequestSchema,
} from '../validators';
import type { RewardRedeemPort } from './ports';

const ONE_PENDING_INDEX = 'redemption_requests_one_pending_uq';

function toDto(row: RedemptionRequestRow): RedemptionRequestData {
  const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
  return {
    id: row.id,
    memberId: row.memberId,
    pointsRequested: row.pointsRequested,
    status: row.status,
    note: row.note,
    decidedBy: row.decidedBy,
    decidedAt: iso(row.decidedAt),
    decisionReason: row.decisionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Walks an error + its cause chain, collecting message/code/constraint text. */
function collectErrorText(error: unknown, depth = 0): string {
  if (error === null || error === undefined || depth > 4) {
    return '';
  }
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
  }
  const anyErr = error as { code?: unknown; constraint?: unknown; cause?: unknown };
  if (typeof anyErr.code === 'string') {
    parts.push(anyErr.code);
  }
  if (typeof anyErr.constraint === 'string') {
    parts.push(anyErr.constraint);
  }
  if (anyErr.cause !== undefined && anyErr.cause !== null) {
    parts.push(collectErrorText(anyErr.cause, depth + 1));
  }
  return parts.join(' ');
}

/** True when the error is the partial-unique violation on the one-pending index. */
function isOnePendingUniqueViolation(error: unknown): boolean {
  const text = collectErrorText(error).toLowerCase();
  return (text.includes('23505') || text.includes('unique')) && text.includes(ONE_PENDING_INDEX);
}

/**
 * Member points-redemption request/approval workflow (P2). Purely additive: it
 * never modifies the rewards ledger primitives, the wallet, earnings, referral,
 * finance, or auth. Points are debited ONLY on approval (no hold while PENDING),
 * reusing the rewards `redeemWithin(tx,…)` seam.
 *
 * Concurrency & integrity guarantees:
 *  - Submit is idempotent: an existing PENDING request is returned rather than
 *    duplicated; a concurrent insert that trips the partial unique index resolves
 *    to the winning PENDING row. Creating a request debits/holds nothing.
 *  - Approval is a SINGLE transaction: lock the request row, re-check PENDING,
 *    debit + record the redemption via the rewards seam (which locks
 *    `member_rewards` FOR UPDATE and verifies sufficient balance), flip the
 *    request to APPROVED and write the audit — all atomically. Insufficient
 *    balance throws and rolls everything back, leaving the request PENDING (never
 *    a partial debit, never an auto-reject). A concurrent reject serializes on the
 *    row lock so a rejected request can never coexist with a debit.
 *  - Reject is a locked PENDING→REJECTED transition recording actor/time/reason;
 *    it never touches the points ledger.
 */
export class RedemptionRequestService {
  public constructor(
    private readonly db: Database,
    private readonly requests: RedemptionRequestRepository,
    private readonly members: RedemptionMemberLookupRepository,
    private readonly audit: RedemptionRequestAuditRepository,
    private readonly events: RedemptionRequestEventBus,
    private readonly rewards: RewardRedeemPort,
  ) {}

  /**
   * Submits a redemption request for the authenticated member. The member is
   * resolved exclusively from the token — never client-supplied. No balance check
   * and no points hold at submit time; eligibility is only a valid member profile
   * plus no existing PENDING request.
   */
  public async submit(
    userId: string,
    input: unknown,
    actor: RedemptionRequestActor,
  ): Promise<RedemptionRequestData> {
    const data = submitRedemptionRequestSchema.parse(input);
    const member = await this.members.findByUserId(userId);
    if (!member) {
      throw new BusinessRuleError('Your account has no member profile.');
    }

    // Idempotent: return the existing pending request rather than creating a duplicate.
    const existing = await this.requests.findPendingByMemberId(member.id);
    if (existing) {
      return toDto(existing);
    }

    try {
      const created = await withTransaction(this.db, async (tx) => {
        const row = await this.requests.create(
          {
            memberId: member.id,
            pointsRequested: data.pointsRequested,
            status: 'PENDING',
            note: data.note ?? null,
            createdBy: userId,
            updatedBy: userId,
          },
          tx,
        );
        await this.audit.write(
          {
            entityType: 'redemption_request',
            entityId: row.id,
            action: 'CREATE',
            newValue: { status: 'PENDING', pointsRequested: data.pointsRequested },
            ...this.ctx(actor),
          },
          tx,
        );
        return row;
      });

      await this.events.publish({
        type: 'RedemptionRequestSubmitted',
        requestId: created.id,
        memberId: member.id,
        pointsRequested: created.pointsRequested,
        at: new Date(),
      });
      return toDto(created);
    } catch (error) {
      // A concurrent submit won the race on the partial unique index — return it.
      if (isOnePendingUniqueViolation(error)) {
        const winner = await this.requests.findPendingByMemberId(member.id);
        if (winner) {
          return toDto(winner);
        }
      }
      throw error;
    }
  }

  /** The authenticated member's most recent request (any status), or null. */
  public async getMine(userId: string): Promise<RedemptionRequestData | null> {
    const member = await this.members.findByUserId(userId);
    if (!member) {
      throw new BusinessRuleError('Your account has no member profile.');
    }
    const row = await this.requests.findLatestByMemberId(member.id);
    return row ? toDto(row) : null;
  }

  /** Admin list (redemption.request.read), optionally filtered by status. */
  public async list(query: unknown): Promise<PaginatedRedemptionRequests> {
    const parsed = listRedemptionRequestsQuerySchema.parse(query);
    const { rows, total } = await this.requests.search(parsed);
    return buildPaginatedResult(rows.map(toDto), total, parsed.page, parsed.pageSize);
  }

  /** Admin single read (redemption.request.read). */
  public async getById(id: string): Promise<RedemptionRequestData> {
    const row = await this.requests.findById(id);
    if (!row) {
      throw new NotFoundError('Redemption request not found.');
    }
    return toDto(row);
  }

  /**
   * Approves a request (redemption.request.approve). The whole operation is ONE
   * transaction so the points debit, the completed redemption record, the request
   * decision and the audit are atomic:
   *  a. Lock the request row FOR UPDATE.
   *  b. Verify status — PENDING continues; APPROVED is an idempotent no-op;
   *     REJECTED is a conflict.
   *  c. `redeemWithin(tx,…)` — locks `member_rewards` FOR UPDATE, verifies
   *     sufficient balance, debits, and records the completed `reward_redemptions`
   *     row (via the rewards seam).
   *  d. Mark APPROVED + decidedBy/decidedAt; write the audit — all in the tx.
   *  e. Commit.
   *
   * If the balance is insufficient at approval, `redeemWithin` throws a
   * business-rule error and the whole transaction rolls back: NO debit, NO
   * redemption record, NO status change, NO audit — the request stays PENDING and
   * is NOT auto-rejected. The row lock serializes a concurrent reject, so a
   * rejected request can never coexist with a debit.
   */
  public async approve(id: string, actor: RedemptionRequestActor): Promise<RedemptionRequestData> {
    let didApprove = false;
    let decidedTransactionId: string | null = null;
    let decidedRedemptionId: string | null = null;

    const updated = await withTransaction(this.db, async (tx) => {
      const locked = await this.requests.lockById(id, tx);
      if (!locked) {
        throw new NotFoundError('Redemption request not found.');
      }
      if (locked.status === 'APPROVED') {
        return locked; // Idempotent — already approved (points already debited).
      }
      if (locked.status === 'REJECTED') {
        throw new ConflictError('A rejected request cannot be approved.');
      }

      // Debit points + record the completed redemption in THIS transaction. Throws
      // BusinessRuleError on insufficient balance → the whole tx rolls back (D8).
      const result = await this.rewards.redeemWithin(tx, locked.memberId, locked.pointsRequested, {
        reference: `RDM-REQ-${locked.id}`,
        note: locked.note,
        actor,
      });

      const row = await this.requests.update(
        id,
        {
          status: 'APPROVED',
          decidedBy: actor.userId,
          decidedAt: new Date(),
          updatedBy: actor.userId,
        },
        tx,
      );
      if (!row) {
        throw new Error('Redemption request update did not return a row.');
      }
      await this.audit.write(
        {
          entityType: 'redemption_request',
          entityId: id,
          action: 'UPDATE',
          oldValue: { status: 'PENDING' },
          newValue: {
            status: 'APPROVED',
            transactionId: result.transactionId,
            redemptionId: result.redemptionId,
          },
          ...this.ctx(actor),
        },
        tx,
      );
      didApprove = true;
      decidedTransactionId = result.transactionId;
      decidedRedemptionId = result.redemptionId;
      return row;
    });

    if (didApprove && decidedTransactionId && decidedRedemptionId) {
      await this.events.publish({
        type: 'RedemptionRequestApproved',
        requestId: id,
        memberId: updated.memberId,
        pointsRequested: updated.pointsRequested,
        transactionId: decidedTransactionId,
        redemptionId: decidedRedemptionId,
        approvedByUserId: actor.userId,
        at: new Date(),
      });
    }
    return toDto(updated);
  }

  /**
   * Rejects a request (redemption.request.reject). A locked PENDING→REJECTED
   * transition recording actor/time/reason. Never touches the points ledger.
   */
  public async reject(
    id: string,
    input: unknown,
    actor: RedemptionRequestActor,
  ): Promise<RedemptionRequestData> {
    const data = rejectRedemptionRequestSchema.parse(input);

    let didReject = false;
    const updated = await withTransaction(this.db, async (tx) => {
      const locked = await this.requests.lockById(id, tx);
      if (!locked) {
        throw new NotFoundError('Redemption request not found.');
      }
      if (locked.status === 'REJECTED') {
        return locked; // Idempotent — already rejected.
      }
      if (locked.status === 'APPROVED') {
        throw new ConflictError('An approved request cannot be rejected.');
      }
      const row = await this.requests.update(
        id,
        {
          status: 'REJECTED',
          decidedBy: actor.userId,
          decidedAt: new Date(),
          decisionReason: data.reason ?? null,
          updatedBy: actor.userId,
        },
        tx,
      );
      if (!row) {
        throw new Error('Redemption request update did not return a row.');
      }
      await this.audit.write(
        {
          entityType: 'redemption_request',
          entityId: id,
          action: 'UPDATE',
          oldValue: { status: 'PENDING' },
          newValue: { status: 'REJECTED' },
          ...this.ctx(actor),
        },
        tx,
      );
      didReject = true;
      return row;
    });

    if (didReject) {
      await this.events.publish({
        type: 'RedemptionRequestRejected',
        requestId: id,
        memberId: updated.memberId,
        rejectedByUserId: actor.userId,
        at: new Date(),
      });
    }
    return toDto(updated);
  }

  private ctx(
    actor: RedemptionRequestActor,
  ): Pick<
    Parameters<RedemptionRequestAuditRepository['write']>[0],
    'userId' | 'ipAddress' | 'userAgent' | 'correlationId'
  > {
    return {
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      correlationId: actor.correlationId,
    };
  }
}
