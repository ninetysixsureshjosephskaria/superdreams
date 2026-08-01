# Super Dreams Platform
# DNA 06 — API Architecture & Standards

---

# Purpose

This document defines the API architecture, conventions, standards, and best practices for the Super Dreams Platform.

It is the single source of truth for all HTTP APIs.

Every backend module, frontend application, integration, and AI assistant must follow this document.

---

# API Philosophy

The API is a long-term contract.

Clients should evolve without breaking existing integrations.

Business logic belongs in services, not controllers.

Controllers translate HTTP requests into application commands and responses.

---

# Technology Stack

Framework

- Fastify

Documentation

- OpenAPI 3.1
- Swagger UI

Validation

- Zod

Serialization

- Native JSON

Authentication

- JWT

Authorization

- RBAC

---

# API Principles

Every API should be:

- Consistent
- Predictable
- Versionable
- Documented
- Secure
- Testable
- Stateless
- Idempotent where appropriate

---

# Base URL

```text
/api/v1
```

Future versions:

```text
/api/v2
```

Never expose unversioned APIs in production.

---

# Resource Naming

Use plural nouns.

Examples:

```text
/users
/members
/wallets
/rewards
/campaigns
/notifications
/reports
/settings
```

Avoid verbs in resource names.

Correct:

```text
POST /members
```

Incorrect:

```text
POST /createMember
```

---

# HTTP Methods

GET

Retrieve resources.

POST

Create resources.

PUT

Replace an entire resource.

PATCH

Partially update a resource.

DELETE

Soft delete where applicable.

---

# Response Format

Every response follows one canonical envelope. This is the single source of
truth for the platform response contract; every service and client depends on it.

Successful responses:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

- `data` is always present on success.
- `message` (optional) — human-readable summary.
- `meta` (optional) — pagination or other contextual metadata for collections.

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address."
      }
    ]
  },
  "traceId": "..."
}
```

- `error.code` — stable, machine-readable error code.
- `error.message` — human-readable summary.
- `error.details` (optional) — field-level errors (e.g. validation).
- `traceId` — request correlation id, for cross-referencing logs.

---

# HTTP Status Codes

Use standard status codes.

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Unprocessable Entity

429 Too Many Requests

500 Internal Server Error

Avoid custom status codes.

---

# Pagination

Support pagination on collection endpoints.

Parameters:

```text
page
limit
sort
order
```

Response metadata:

```json
{
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

Cursor pagination may be used for large datasets.

---

# Filtering

Filtering should use query parameters.

Example:

```text
GET /members?status=ACTIVE&country=IN
```

Support multiple filters where appropriate.

---

# Sorting

Use:

```text
sort=created_at
order=desc
```

Support only approved sortable fields.

---

# Searching

Provide explicit search parameters.

Example:

```text
GET /members?search=John
```

Avoid overloading filter parameters.

---

# Validation

All request data must be validated using Zod.

Validate:

- Path parameters
- Query parameters
- Request body
- Headers (where applicable)

Never trust client input.

---

# Authentication

Protected endpoints require JWT authentication.

Public endpoints must be explicitly identified.

Authentication is handled by middleware, not controllers.

---

# Authorization

Authorization is enforced through the RBAC layer.

Controllers should not contain permission logic.

Use guards and policies.

---

# Error Handling

Use centralized error handling.

Do not expose stack traces.

Log internal errors with correlation IDs.

Return user-friendly error messages.

---

# Idempotency

Operations such as retries or external integrations should support idempotency where appropriate.

Support idempotency keys for critical financial operations.

---

# File Uploads

Support multipart uploads.

Validate:

- File size
- File type
- Allowed extensions

Store metadata separately from file content if external storage is used.

---

# Rate Limiting

Apply rate limiting based on endpoint sensitivity.

Examples:

- Login
- Password reset
- Public APIs

Return HTTP 429 when limits are exceeded.

---

# API Documentation

Every endpoint must include:

- Summary
- Description
- Parameters
- Request schema
- Response schema
- Error responses
- Authentication requirements

Maintain OpenAPI documentation with every change.

---

# Logging

Log:

- Request ID
- Correlation ID
- User ID (if authenticated)
- Route
- Method
- Status Code
- Duration

Do not log sensitive information.

---

# Security

Never expose:

- Passwords
- Secrets
- Tokens
- Internal identifiers
- Stack traces

Sanitize all outputs.

---

# Versioning

Breaking changes require a new API version.

Avoid breaking existing clients.

Deprecate old versions with a documented lifecycle.

---

# Testing

Every endpoint should include:

- Validation tests
- Authentication tests
- Authorization tests
- Success tests
- Error tests

---

# API Review Checklist

Every new endpoint must:

- Use REST conventions
- Use correct HTTP methods
- Validate all inputs
- Return standard response format
- Be documented in OpenAPI
- Enforce authentication where required
- Enforce RBAC where required
- Be tested
- Return correct status codes
- Log requests appropriately

---

# Definition of Done

An API feature is complete only when:

- Route implemented
- Validation complete
- Service integrated
- RBAC enforced
- OpenAPI updated
- Tests passing
- Documentation updated
- Performance reviewed
- Security reviewed

---

# Final Principle

The API is the public contract of the Super Dreams Platform.

It must remain stable, predictable, secure, and backward-compatible wherever possible.