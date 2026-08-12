import { sql } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { redemptionRequestStatus } from './enums';
import { members } from './members';

/**
 * Member points-redemption requests (P2). A member submits a manual request to
 * redeem a number of points (with an optional note); an authorized admin approves
 * (which debits the points via the existing rewards ledger seam + records a
 * completed redemption) or rejects it. This is a request/approval state machine —
 * it does NOT hold, reserve, or debit points while PENDING, and it never touches
 * money (points-only, no wallet bridge).
 *
 * Lifecycle: PENDING → APPROVED | REJECTED (terminal). A rejected member may
 * submit a new request; the partial unique index `redemption_requests_one_pending_uq`
 * enforces at most one PENDING row per member while allowing later re-requests.
 */
export const redemptionRequests = pgTable(
  'redemption_requests',
  {
    ...baseColumns(),
    /** The requesting member (resolved from the authenticated user, never client-supplied). */
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    /** Points the member asked to redeem (>= 1; enforced at the validation layer). */
    pointsRequested: integer('points_requested').notNull(),
    status: redemptionRequestStatus('status').notNull().default('PENDING'),
    /** Optional member-supplied note/reason submitted with the request. */
    note: text('note'),
    /** The admin user who approved/rejected (matches partner_requests.decided_by — no FK). */
    decidedBy: uuid('decided_by'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    /** Optional admin reason recorded on the decision (esp. rejection). */
    decisionReason: text('decision_reason'),
  },
  (table) => [
    index('redemption_requests_member_id_idx').on(table.memberId),
    index('redemption_requests_status_idx').on(table.status),
    // At most ONE pending request per member (partial unique). Terminal rows
    // (APPROVED/REJECTED) are excluded, so a rejected member can re-request.
    uniqueIndex('redemption_requests_one_pending_uq')
      .on(table.memberId)
      .where(sql`${table.status} = 'PENDING'`),
  ],
);
