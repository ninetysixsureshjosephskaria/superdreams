# Middleware

Cross-cutting request middleware for the API service.

## Implemented (foundation)

- **request-context** — attaches a per-request `requestContext` (correlation/request id) to every request. This is foundational infrastructure and is safe to build now.

## Planned (implemented in their respective phases)

The following middleware are intentionally **not** implemented in the backend
bootstrap phase. They depend on the identity, authentication, and RBAC modules
and are added when those phases are delivered:

| Middleware       | Purpose                                               | Phase           |
| ---------------- | ----------------------------------------------------- | --------------- |
| `authentication` | Verify the JWT and resolve the authenticated user.    | Authentication  |
| `authorization`  | Enforce role/permission requirements (RBAC).          | RBAC            |
| `permissions`    | Fine-grained permission guards/policies.              | RBAC            |
| `audit`          | Emit append-only audit records for sensitive actions. | Identity / RBAC |

No placeholder implementations are added here to avoid shipping inert
future-phase code. Each middleware will be introduced, fully implemented and
tested, in its own phase per the platform DNA.
