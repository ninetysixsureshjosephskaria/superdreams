# Super Dreams Platform
## Phase 09 — Role-Based Access Control (RBAC)

---

# ROLE

You are the Principal Security Architect for the Super Dreams Platform.

Your responsibility is to implement enterprise-grade Role-Based Access Control (RBAC) using the existing Identity and Authentication modules.

Do NOT recreate authentication.

Do NOT recreate identity models.

Do NOT implement business modules.

Only implement authorization.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/dna/01-platform.md
- docs/dna/03-backend.md
- docs/dna/10-claude-rules.md
- docs/product/PRODUCT_OVERVIEW.md

Also review:

- Identity module
- Authentication module
- Shared permissions package

---

# OBJECTIVE

Implement a complete RBAC framework that can be reused across every future module.

Reuse existing:

- users
- roles
- permissions
- role_permissions
- user_roles

Do not duplicate database models.

---

# MODULE STRUCTURE

Create:

backend/api/src/modules/rbac/

```text
rbac/
├── controllers/
├── services/
├── repositories/
├── dto/
├── validators/
├── middleware/
├── decorators/
├── guards/
├── policies/
├── events/
├── routes/
├── tests/
└── README.md
```

---

# FEATURES

Implement:

- Role assignment
- Role removal
- Permission assignment
- Permission removal
- Effective permission resolution
- Multiple roles per user
- Permission inheritance (if supported by project architecture)
- Permission caching hooks
- Authorization audit hooks

---

# AUTHORIZATION

Create reusable authorization middleware.

Support:

- Require Authentication
- Require Role
- Require Permission
- Require Any Permission
- Require All Permissions

Guards must integrate with the existing authentication middleware.

---

# DECORATORS / HELPERS

Create reusable helpers for route protection.

Examples:

- RequireRole(...)
- RequirePermission(...)
- CurrentUser()
- CurrentPermissions()

Keep framework usage consistent with the backend architecture.

---

# POLICY FRAMEWORK

Create a policy layer that future business modules can use.

Support:

- Resource policies
- Ownership checks
- Custom authorization logic

Do not implement module-specific policies yet.

---

# API ENDPOINTS

Create endpoints for:

POST /roles/:id/users

DELETE /roles/:id/users/:userId

POST /roles/:id/permissions

DELETE /roles/:id/permissions/:permissionId

GET /users/:id/permissions

GET /roles

GET /permissions

Update OpenAPI documentation.

---

# EVENTS

Create events:

- RoleAssigned
- RoleRemoved
- PermissionAssigned
- PermissionRemoved
- AuthorizationDenied

---

# VALIDATION

Validate:

- Role IDs
- Permission IDs
- User IDs
- Assignment requests

Reuse shared validation where possible.

---

# CACHING

Prepare permission caching.

Requirements:

- Cache effective permissions
- Cache invalidation on role/permission updates
- Configurable TTL

Implementation should integrate cleanly with Redis if available.

---

# TESTING

Create:

- Guard tests
- Middleware tests
- Service tests
- Policy tests
- Permission resolution tests

---

# DOCUMENTATION

Create README.md including:

- RBAC architecture
- Permission resolution flow
- Guard usage
- Policy framework
- Integration examples

---

# QUALITY CHECKLIST

Verify:

- Authorization works
- Guards protect routes
- Permission checks succeed/fail correctly
- Cache invalidates correctly
- OpenAPI updated
- Tests pass
- Typecheck passes
- Lint passes
- No duplicated authentication logic

---

# OUTPUT FORMAT

Implement in logical phases.

For each phase:

1. Explain the objective.
2. Generate files.
3. Explain architectural decisions.
4. Verify.
5. Continue.

Do not generate everything in one response.

---

# STOP CONDITION

When RBAC is complete:

Summarize:

- Folder structure
- Authorization flow
- Guard architecture
- Policy framework
- Permission resolution
- Caching strategy

Wait for approval.

Do NOT continue to the Design System.