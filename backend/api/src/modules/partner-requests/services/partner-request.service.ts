import type { Database } from '@/database/client';
import { buildPaginatedResult } from '@/database/helpers';
import { withTransaction } from '@/database/helpers/transaction';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';

import type { PaginatedPartnerRequests, PartnerRequestActor, PartnerRequestData } from '../dto';
import type { PartnerRequestEventBus } from '../events';
import type {
  PartnerRequestAuditRepository,
  PartnerRequestRepository,
  PartnerRequestRow,
  PartnerMemberLookupRepository,
} from '../repositories';
import {
  listPartnerRequestsQuerySchema,
  rejectPartnerRequestSchema,
  submitPartnerRequestSchema,
} from '../validators';
import type { PartnerRoleAssignerPort, PartnerRoleCheckerPort } from './ports';

const ONE_PENDING_INDEX = 'partner_requests_one_pending_uq';
const ACTIVE_STATUS = 'ACTIVE';

function toDto(row: PartnerRequestRow): PartnerRequestData {
  const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
  return {
    id: row.id,
    memberId: row.memberId,
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
 * Member→Partner request/approval workflow (P1.3). Purely additive: it never
 * touches referral attribution, earnings, points, balances, or the auth session.
 * The `partner` RBAC role remains the single source of Partner truth — approval
 * grants it through the existing idempotent role-assignment mechanism.
 *
 * Concurrency & integrity guarantees:
 *  - Submit is idempotent: an existing PENDING request is returned rather than
 *    duplicated; a concurrent insert that trips the partial unique index resolves
 *    to the winning PENDING row.
 *  - Approval is a SINGLE transaction: it locks the request row, re-checks
 *    eligibility, grants the partner role (tx-aware RBAC seam), flips the request
 *    to APPROVED and writes the audit — all atomically. Any failure rolls back
 *    everything, and the row lock makes a concurrent reject serialize so a
 *    rejected request can never coexist with a granted role. Cache invalidation
 *    and events fire only after commit.
 *  - Reject is a locked PENDING→REJECTED transition that records actor/time/reason
 *    and touches nothing else.
 */
export class PartnerRequestService {
  public constructor(
    private readonly db: Database,
    private readonly requests: PartnerRequestRepository,
    private readonly members: PartnerMemberLookupRepository,
    private readonly audit: PartnerRequestAuditRepository,
    private readonly events: PartnerRequestEventBus,
    private readonly roles: PartnerRoleAssignerPort,
    private readonly roleChecker: PartnerRoleCheckerPort,
  ) {}

  /**
   * Submits an upgrade request for the authenticated member. The member is
   * resolved exclusively from the token — never client-supplied. Eligibility:
   * ACTIVE member, not already a Partner, and no existing PENDING request.
   */
  public async submit(
    userId: string,
    input: unknown,
    actor: PartnerRequestActor,
  ): Promise<PartnerRequestData> {
    const data = submitPartnerRequestSchema.parse(input);
    const member = await this.members.findByUserId(userId);
    if (!member) {
      throw new BusinessRuleError('Your account has no member profile.');
    }
    if (member.status !== ACTIVE_STATUS) {
      throw new BusinessRuleError('Only an active member can request Partner status.');
    }
    if (await this.roleChecker.isPartner(userId)) {
      throw new BusinessRuleError('You are already a Partner.');
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
            status: 'PENDING',
            note: data.note ?? null,
            createdBy: userId,
            updatedBy: userId,
          },
          tx,
        );
        await this.audit.write(
          {
            entityType: 'partner_request',
            entityId: row.id,
            action: 'CREATE',
            newValue: { status: 'PENDING' },
            ...this.ctx(actor),
          },
          tx,
        );
        return row;
      });

      await this.events.publish({
        type: 'PartnerRequestSubmitted',
        requestId: created.id,
        memberId: member.id,
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
  public async getMine(userId: string): Promise<PartnerRequestData | null> {
    const member = await this.members.findByUserId(userId);
    if (!member) {
      throw new BusinessRuleError('Your account has no member profile.');
    }
    const row = await this.requests.findLatestByMemberId(member.id);
    return row ? toDto(row) : null;
  }

  /** Admin list (partner.request.read), optionally filtered by status. */
  public async list(query: unknown): Promise<PaginatedPartnerRequests> {
    const parsed = listPartnerRequestsQuerySchema.parse(query);
    const { rows, total } = await this.requests.search(parsed);
    return buildPaginatedResult(rows.map(toDto), total, parsed.page, parsed.pageSize);
  }

  /** Admin single read (partner.request.read). */
  public async getById(id: string): Promise<PartnerRequestData> {
    const row = await this.requests.findById(id);
    if (!row) {
      throw new NotFoundError('Partner request not found.');
    }
    return toDto(row);
  }

  /**
   * Approves a request (partner.request.approve). The whole operation is ONE
   * transaction so the Partner-role grant and the request decision are atomic:
   *  a. Lock the request row FOR UPDATE (before any decision).
   *  b. Verify status — PENDING continues; APPROVED is an idempotent no-op;
   *     REJECTED is a conflict.
   *  c. Re-check member eligibility (ACTIVE + has a login) reading through the tx.
   *  d. Assign the partner role via the tx-aware RBAC seam, in THIS transaction.
   *  e. Mark APPROVED + decidedBy/decidedAt; write the audit — all in the tx.
   *  f. Commit.
   *  g. ONLY after commit: invalidate the RBAC cache, publish RoleAssigned, and
   *     publish PartnerRequestApproved.
   *
   * Because the role INSERT, the status flip and the audit share one transaction,
   * any failure rolls back ALL of them — a request can never be APPROVED (nor the
   * role granted) unless every step succeeded. Because the row lock is taken
   * first, a concurrent reject fully serializes: whichever commits second sees a
   * terminal status and aborts its entire transaction, so REJECTED-with-role is
   * impossible.
   */
  public async approve(id: string, actor: PartnerRequestActor): Promise<PartnerRequestData> {
    // Resolve the partner role up front. If it is not seeded we must NOT approve
    // (approval may never succeed without granting the role).
    const roleId = await this.roles.resolvePartnerRoleId();
    if (!roleId) {
      throw new BusinessRuleError('The Partner role is not configured; cannot approve.');
    }

    let didApprove = false;
    let grantedUserId: string | null = null;

    const updated = await withTransaction(this.db, async (tx) => {
      const locked = await this.requests.lockById(id, tx);
      if (!locked) {
        throw new NotFoundError('Partner request not found.');
      }
      if (locked.status === 'APPROVED') {
        return locked; // Idempotent — already approved (role already granted).
      }
      if (locked.status === 'REJECTED') {
        throw new ConflictError('A rejected request cannot be approved.');
      }

      // Re-check eligibility while holding the lock, reading through the tx.
      const member = await this.members.findById(locked.memberId, tx);
      if (!member || member.status !== ACTIVE_STATUS) {
        throw new BusinessRuleError('The member is no longer eligible for Partner status.');
      }
      if (!member.userId) {
        throw new BusinessRuleError('The member has no login account to receive the Partner role.');
      }

      // Grant the role in THIS transaction (idempotent). A later failure rolls it back.
      await this.roles.assignWithin(tx, roleId, member.userId, actor.userId);

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
        throw new Error('Partner request update did not return a row.');
      }
      await this.audit.write(
        {
          entityType: 'partner_request',
          entityId: id,
          action: 'UPDATE',
          oldValue: { status: 'PENDING' },
          newValue: { status: 'APPROVED' },
          ...this.ctx(actor),
        },
        tx,
      );
      didApprove = true;
      grantedUserId = member.userId;
      return row;
    });

    // Post-commit side effects only (never inside the transaction).
    if (didApprove && grantedUserId) {
      await this.roles.finalize(grantedUserId, roleId, actor.userId);
      await this.events.publish({
        type: 'PartnerRequestApproved',
        requestId: id,
        memberId: updated.memberId,
        approvedByUserId: actor.userId,
        at: new Date(),
      });
    }
    return toDto(updated);
  }

  /**
   * Rejects a request (partner.request.reject). A locked PENDING→REJECTED
   * transition recording actor/time/reason. Never touches role, referral,
   * earnings, points or balances.
   */
  public async reject(
    id: string,
    input: unknown,
    actor: PartnerRequestActor,
  ): Promise<PartnerRequestData> {
    const data = rejectPartnerRequestSchema.parse(input);

    let didReject = false;
    const updated = await withTransaction(this.db, async (tx) => {
      const locked = await this.requests.lockById(id, tx);
      if (!locked) {
        throw new NotFoundError('Partner request not found.');
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
        throw new Error('Partner request update did not return a row.');
      }
      await this.audit.write(
        {
          entityType: 'partner_request',
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
        type: 'PartnerRequestRejected',
        requestId: id,
        memberId: updated.memberId,
        rejectedByUserId: actor.userId,
        at: new Date(),
      });
    }
    return toDto(updated);
  }

  private ctx(
    actor: PartnerRequestActor,
  ): Pick<
    Parameters<PartnerRequestAuditRepository['write']>[0],
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
