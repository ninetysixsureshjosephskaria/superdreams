# Members Module (Member Management)

The first business module. Manages the member lifecycle (CRUD, status, notes,
documents, activity) on top of the platform foundation — it **reuses** Identity
(optional user link), Authentication (route `authenticate`), RBAC (permission
guards), the shared `BaseRepository`, pagination helpers, shared validation, and
the `audit_logs` table. No platform architecture is changed.

## Data model

| Table | Purpose |
| --- | --- |
| `members` | Aggregate root: number, name, email, phone, `record_status`, joinedAt, optional `user_id` link. |
| `member_profiles` | 1:1 extended profile (DOB, gender, avatar, bio). |
| `member_addresses` | Postal addresses (returned with details). |
| `member_contacts` | Contact channels (returned with details). |
| `member_notes` | Administrative notes. |
| `member_documents` | Document metadata (no binary storage). |
| `member_status_history` | Append-only status transitions. |
| `member_activity_logs` | Append-only activity feed. |

Statuses reuse the shared `record_status` enum (`ACTIVE`, `INACTIVE`, `PENDING`,
`SUSPENDED`, `ARCHIVED`). No member authentication data is duplicated.

## API reference (`/api/v1/members`)

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/` | `member.read` (search, filter, sort, paginate) |
| POST | `/` | `member.create` |
| GET | `/:id` | `member.read` |
| PUT | `/:id` | `member.update` |
| PATCH | `/:id/status` | `member.status` |
| DELETE | `/:id` | `member.delete` (archive + soft-delete) |
| GET | `/:id/activity` | `member.read` |
| GET | `/:id/status-history` | `member.read` |
| GET | `/:id/notes` | `member.read` |
| POST | `/:id/notes` | `member.note.create` |
| GET | `/:id/documents` | `member.read` |
| POST | `/:id/documents` | `member.document.create` |
| GET | `/me` | authenticated (self) |
| PUT | `/me` | authenticated (self, ownership-enforced) |

Every route runs **authentication first, then the RBAC permission guard** (admin
routes) or ownership (self-service). Documented in OpenAPI under the `Members` tag.

## Search / pagination strategy

`MemberRepository.search` builds a single `WHERE` from validated params: status
filter, `joinedAt` range, and a case-insensitive `ILIKE` across first/last name,
email, phone and member number. Sorting is a whitelist (`createdAt`, `updatedAt`,
`joinedAt`, `lastName`, `status`); pagination is offset/limit bounded to ≤ 100 via
the shared helpers, returning the standard `{ items, page, pageSize, total, totalPages }`.

## Validation strategy

Zod schemas (`validators/`) are the single validation boundary — the service
parses `unknown` input and the central error handler maps `ZodError` → 400. Email
and phone reuse `@superdreams/validation`. Status transitions are enforced by an
allow-list in the service.

## Events & audit

`MemberEventBus` publishes `MemberCreated/Updated/StatusChanged/Suspended/
Reactivated/Archived/NoteAdded/DocumentAdded`. Every mutation also records member
activity and writes an `audit_logs` entry (`module: 'members'`, entity id,
old/new snapshot, actor, ip/ua, correlation id).

## Admin workflow (BCC)

List → filter/search/sort → open a member → view profile/contact/status → edit,
change status, add notes/documents, review activity + status history.

## Member workflow (Portal)

`GET /me` returns the member linked to the authenticated user; `PUT /me` updates
permitted self-service fields (name, phone, profile) — never email/status.
Ownership is enforced (members access only their own record).

## Extension points

- Add a permission in `modules/rbac/catalog.ts` and gate a route with `requirePermission`.
- Add a sub-resource repository + service method; publish an event and audit it.
- Address/contact write endpoints can layer on the existing tables in a later phase.
