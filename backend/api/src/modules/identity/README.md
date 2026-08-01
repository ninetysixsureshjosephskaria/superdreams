# Identity Module

The Core Identity domain — the foundation every future module (authentication,
RBAC, user management) depends on. This phase builds **identity only**:
organizations and users, their lifecycle, hashing, validation, and events.

> **Not implemented here (later phases):** login, JWT, sessions, refresh tokens,
> devices, RBAC roles/permissions, and HTTP endpoints. This module deliberately
> ships **no controllers/routes** yet — services are consumed programmatically
> and are reused by the Authentication phase.

## Folder structure

```text
modules/identity/
├── domain/         # User, Organization aggregates (lifecycle business rules)
├── dto/            # Input/response contracts (Zod-inferred + safe responses)
├── validators/     # Zod validators (email, password, username, org name/slug)
├── repositories/   # UserRepository, OrganizationRepository (on BaseRepository)
├── services/       # UserService, OrganizationService, password hashing
├── events/         # Typed identity events + in-memory event bus (no broker)
├── mappers/        # Row ↔ domain props ↔ response DTO
├── types/          # Public type re-exports
├── tests/          # Unit (hashing/validators) + PGlite integration
├── index.ts        # createIdentityModule() composition root
└── README.md
```

## Tables

Defined in the central schema (`src/database/schema/identity.ts`):

- **organizations** — tenants (`name`, `slug` unique, `status`, `is_active`).
- **users** — `organization_id` (FK), `email` (unique), `username` (unique),
  `password_hash`, name fields, `status`, `email_verified_at`.

Both carry the standard base columns and follow the Phase 06 conventions.

## Entity relationships

```text
Organization (1) ──< (N) User        users.organization_id → organizations.id
```

## Service responsibilities

- **UserService** — create (hashes password, unique email/username), profile
  update, lifecycle status changes (delegates rules to the `User` aggregate),
  read/list. Never handles auth/JWT/sessions.
- **OrganizationService** — create (unique slug), read/list, deactivate.

## Password hashing

**Argon2id** via `@node-rs/argon2` (DNA-07 preferred). `hashPassword` /
`verifyPassword` are pure utilities reused by the Authentication phase.

## Validation

Centralized Zod validators. Email and password reuse `@superdreams/validation`;
identity-specific validators (username, organization name/slug) live here.

## User lifecycle

`PENDING → ACTIVE → { INACTIVE ↔ ACTIVE, SUSPENDED → ACTIVE }`, any state →
`DEACTIVATED` (terminal). Invalid transitions throw
`InvalidUserStatusTransitionError`.

## Future authentication integration

The Authentication phase will add `sessions`, `refresh_tokens`, `devices`,
password history, and login endpoints, reusing `UserService.findByEmail` and
`verifyPassword` from this module. RBAC (roles/permissions) arrives in its own
phase. No changes to this module are required to enable them.

## Usage

```ts
const identity = createIdentityModule(db);
const org = await identity.organizations.createOrganization({ name: 'Acme', slug: 'acme' });
const user = await identity.users.createUser({ email: 'a@acme.test', password: '…' });
```
