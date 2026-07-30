# Super Dreams Platform
## Phase 07 — Core Identity

---

# ROLE

You are the Principal Identity Architect for the Super Dreams Platform.

Your responsibility is to build the complete Identity Domain.

This phase establishes the foundation for authentication, authorization, auditing, user management, and session management.

Do NOT implement login screens.

Do NOT implement JWT authentication.

Do NOT implement RBAC enforcement.

Do NOT implement business modules.

Only build the Identity Domain.

---

# REQUIRED READING

Before making any changes, read:

- docs/README.md
- docs/dna/01-platform.md
- docs/dna/02-repository.md
- docs/dna/03-backend.md
- docs/dna/10-claude-rules.md
- docs/product/PRODUCT_OVERVIEW.md

Follow these documents exactly.

---

# OBJECTIVE

Create the complete Identity Domain that every future module will depend upon.

This phase creates:

- Database schema
- Domain models
- Services
- Repositories
- Validation
- Events
- Documentation

No authentication flow yet.

---

# DOMAIN STRUCTURE

Create:

backend/api/src/modules/identity/

```text
identity/
├── controllers/
├── services/
├── repositories/
├── domain/
├── dto/
├── validators/
├── routes/
├── permissions/
├── events/
├── types/
├── mappers/
├── tests/
└── README.md
```

---

# DATABASE TABLES

Create migrations and Drizzle schema for:

organizations

users

roles

permissions

role_permissions

user_roles

sessions

devices

refresh_tokens

password_history

login_history

Use project database standards.

All tables must include:

- UUID primary key
- created_at
- updated_at
- deleted_at
- created_by
- updated_by
- deleted_by
- version

Add appropriate indexes and foreign keys.

---

# DOMAIN MODELS

Create domain models for:

- Organization
- User
- Role
- Permission
- Session
- Device
- RefreshToken

Keep business logic inside the domain layer.

---

# REPOSITORIES

Create repositories for each aggregate.

Repositories are responsible only for persistence.

No business rules.

---

# SERVICES

Create identity services for:

- Organization management
- User management
- Role management
- Permission management
- Session management
- Device management

Do not implement login or JWT.

---

# VALIDATION

Create reusable validators for:

- Email
- Password policy
- Username
- Organization name
- Role name
- Permission key
- Device identifier

Use Zod.

---

# EVENTS

Create domain events.

Examples:

- OrganizationCreated
- UserCreated
- UserUpdated
- UserDeactivated
- RoleCreated
- RoleAssigned
- PermissionGranted
- SessionCreated
- SessionRevoked
- DeviceRegistered
- PasswordChanged

Prepare the event structure without external messaging.

---

# API

Create CRUD endpoints for:

- Organizations
- Users
- Roles
- Permissions

Use consistent response formats.

Register routes.

Generate OpenAPI documentation.

Authentication is not required yet.

---

# TESTING

Create:

- Migration tests
- Repository tests
- Service tests
- Validation tests

Ensure the module builds cleanly.

---

# DOCUMENTATION

Generate:

README.md

Include:

- Domain overview
- Folder structure
- Entity relationships
- Service responsibilities
- Future authentication integration

---

# QUALITY CHECKLIST

Verify:

- Migrations execute successfully
- Drizzle schema compiles
- Repositories work
- Services compile
- OpenAPI updates
- Typecheck passes
- Tests pass
- Lint passes
- No placeholder implementations

---

# OUTPUT FORMAT

Implement in logical phases.

For each phase:

1. Explain the objective.
2. Generate the files.
3. Explain architectural decisions.
4. Verify.
5. Continue.

Do not generate everything in one response.

---

# STOP CONDITION

When the Identity Domain is complete:

Summarize:

- Folder structure
- Database tables
- Domain models
- Services
- Repositories
- Events
- Documentation

Wait for approval.

Do NOT continue to Authentication.