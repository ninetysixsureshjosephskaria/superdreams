import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { inviteRole, inviteStatus } from './enums';
import { users } from './identity';
import { members } from './members';

/**
 * Phase 2D — network join invites (the `invite.html` screen). An invite is a
 * shareable, unguessable capability code that, when accepted, provisions the
 * accepting account with the invite's role and links it into the network:
 *
 * - **PARTNER** invites are assigned to an Admin (`assignedAdminId`); the new
 *   partner is top-level (no upline partner).
 * - **MEMBER** invites are assigned to a Partner (`assignedPartnerId`); the new
 *   member's `referred_by` and `partner_id` are set to that partner on acceptance.
 *
 * Issuance is admin-only (reference §2.1). Lifecycle: PENDING → USED / EXPIRED /
 * REVOKED (all terminal). The code is stored directly because the reference shows
 * it in the "Active invites" list and it is shared manually as a join link — it is
 * a high-entropy random capability token, never a predictable id.
 */
export const invites = pgTable(
  'invites',
  {
    ...baseColumns(),
    /** Unguessable, URL-safe capability code (shared as the join link). */
    code: text('code').notNull(),
    role: inviteRole('role').notNull(),
    status: inviteStatus('status').notNull().default('PENDING'),
    /** PARTNER invites: the managing admin (users.id). */
    assignedAdminId: uuid('assigned_admin_id').references(() => users.id),
    /** MEMBER invites: the partner the new member is attached to (members.id). */
    assignedPartnerId: uuid('assigned_partner_id').references(() => members.id),
    /** The account (admin) that issued the invite. */
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id),
    /** Optional expiry; NULL = never expires (no default TTL is defined by the reference). */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Acceptance linkage. */
    usedByUserId: uuid('used_by_user_id').references(() => users.id),
    usedByMemberId: uuid('used_by_member_id').references(() => members.id),
    usedAt: timestamp('used_at', { withTimezone: true }),
    /** Revocation metadata. */
    revokedBy: uuid('revoked_by').references(() => users.id),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('invites_code_uq').on(table.code),
    index('invites_status_idx').on(table.status),
    index('invites_role_idx').on(table.role),
    index('invites_assigned_partner_id_idx').on(table.assignedPartnerId),
    index('invites_assigned_admin_id_idx').on(table.assignedAdminId),
  ],
);
