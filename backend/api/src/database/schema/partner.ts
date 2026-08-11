import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { partnerRequestStatus } from './enums';
import { members } from './members';

/**
 * Member→Partner upgrade requests (P1.3). A member submits a request to become a
 * Partner; an authorized admin approves (which assigns the existing `partner`
 * RBAC role) or rejects it. This table is the durable, auditable state machine —
 * it does NOT introduce a second "Partner" concept (the `partner` role remains
 * the source of truth) and never touches referral attribution.
 *
 * Lifecycle: PENDING → APPROVED | REJECTED (terminal). A rejected member may
 * submit a new request; the partial unique index `partner_requests_one_pending_uq`
 * enforces at most one PENDING row per member while allowing later re-requests.
 */
export const partnerRequests = pgTable(
  'partner_requests',
  {
    ...baseColumns(),
    /** The requesting member (resolved from the authenticated user, never client-supplied). */
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    status: partnerRequestStatus('status').notNull().default('PENDING'),
    /** Optional member-supplied note submitted with the request. */
    note: text('note'),
    /** The admin user who approved/rejected (matches financial_requests.decided_by — no FK). */
    decidedBy: uuid('decided_by'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    /** Optional admin reason recorded on the decision (esp. rejection). */
    decisionReason: text('decision_reason'),
  },
  (table) => [
    index('partner_requests_member_id_idx').on(table.memberId),
    index('partner_requests_status_idx').on(table.status),
    // At most ONE pending request per member (partial unique). Terminal rows
    // (APPROVED/REJECTED) are excluded, so a rejected member can re-request.
    uniqueIndex('partner_requests_one_pending_uq')
      .on(table.memberId)
      .where(sql`${table.status} = 'PENDING'`),
  ],
);
