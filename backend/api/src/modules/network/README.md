# Network module (Phase 2D)

The MLM-style network: referral relationships, downline visibility, and the
secure join-invite lifecycle. Reuses the existing Member model, RBAC, audit and
notification-event infrastructure — no parallel systems.

## Relationship model (reference `network.html`)

Two **self-referential** columns on `members` (migration `0016`):

- `referred_by` → the member who directly referred this member (the immediate
  upline; the edge the downline tree is built on).
- `partner_id` → the Partner this member belongs to.

Both are nullable; existing members are top-level (both NULL). Set on invite
acceptance. The downline is the transitive closure over `referred_by`, walked
breadth-first in application code (cycle-safe; no raw recursive SQL).

## Invites (reference `invite.html`)

`invites` table: `code` (unguessable capability token — reuses auth
`generateOpaqueToken`, 32 random bytes), `role` (PARTNER/MEMBER), `status`
(PENDING → USED / EXPIRED / REVOKED, all terminal), `assigned_admin_id` /
`assigned_partner_id` (optional assignment), `invited_by_user_id`, `used_by_*`,
`expires_at`, revocation metadata.

Lifecycle:

- **Create** (admin, `invite.send`) → PENDING; optional `expiresInDays`.
- **Accept** (authenticated invitee) → atomic: link the member's `referred_by` /
  `partner_id` (MEMBER invites), mark USED, then provision the invite's role
  (idempotent). A non-PENDING or past-`expires_at` invite is rejected → **single
  use guaranteed** (row locked `FOR UPDATE`).
- **Revoke** (admin) → PENDING → REVOKED. **Delete** (admin) → soft-delete.
- **Preview** (authenticated) → non-sensitive `{ role, status, valid }` for the join page.

## Authorization (rules 4 & 13)

- Member self-service (`/network/me/*`) — authentication only; the member id is
  resolved from the auth token, so a caller only ever sees **their own subtree**.
- Network-wide reads (`/network/partners`, `/network/members/:id`) — `network.read`.
- Invite issuance/list/get/revoke/delete — `invite.send`. Issuance is admin-only
  (reference §2.1). Granted to `admin`; `super-admin` has all.

## API

Network: `GET /api/v1/network/me`, `/me/referrals`, `/me/downline`, `/partners`,
`/members/:id`. Invites: `POST /api/v1/invites`, `GET /api/v1/invites`,
`GET /api/v1/invites/:code`, `/:code/preview`, `POST /:code/accept`,
`/:code/revoke`, `DELETE /:code`. Shared client contract:
`packages/api-client/src/network.ts`.

## Audit & notifications

Every state change (invite create / revoke / delete / accept, member relationship
link) writes to the shared `audit_logs` table inside the operation's transaction.
Typed lifecycle events (`InviteCreated`, `InviteAccepted`, `InviteRevoked`,
`InviteDeleted`, `ReferralLinked`) are published on `NetworkEventBus` for the
Notifications module to subscribe to — no second notification system.

## Unresolved / flagged (rule 17)

- **Invite default TTL** — the reference shows an `expiresAt` and an "Expired"
  status but defines no default TTL value; invites without `expiresInDays` never
  expire. Needs a product decision.
- **Partner identity** — until make-partner role assignment lands (Phase 2E),
  the admin network tree derives partners from the relationship graph (members
  referenced as some member's `partner_id`). A partner with zero members does not
  yet appear in the tree.
- **Member/partner self-issued invites** — the reference defines issuance as
  admin-only; there is no member/partner self-issue surface. Members/partners get
  read access to their own referrals/downline only.
- Carried over from earlier subsections (not blocking 2D): action-queue admin
  assignment, and the early-withdrawal fee conflict (10% vs 5%).
