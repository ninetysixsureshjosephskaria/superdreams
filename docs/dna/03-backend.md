# Backend Engineering DNA

**Document ID:** DNA-03  
**Version:** 1.0.0  
**Status:** Approved  
**Owner:** Super Dreams Engineering Team

---

# Purpose

This document defines the backend engineering standards for the Super Dreams platform.

Every backend module, service, API, worker, scheduler, and integration must follow these rules.

The objective is to build a backend that is modular, maintainable, scalable, secure, and easy to understand.

---

# Technology Stack

The backend stack is standardized across the platform.

- Runtime: Node.js (LTS)
- Language: TypeScript
- Framework: Fastify
- Database: PostgreSQL
- Cache: Redis
- ORM: Drizzle ORM
- Validation: Zod
- Authentication: JWT
- Package Manager: PNPM

No alternative frameworks may be introduced without an approved ADR.

---

# Backend Architecture

The backend follows a modular architecture inspired by Domain Driven Design (DDD).

Each business domain owns its own:

- Routes
- Controllers
- Services
- Domain Models
- Repositories
- Validators
- Events
- Permissions

Business logic must never be shared across unrelated domains.

---

# Module Structure

Every backend module should follow this structure:

```
module-name/
├── routes/
├── controllers/
├── services/
├── repositories/
├── domain/
├── validators/
├── events/
├── permissions/
├── dto/
├── types/
└── index.ts
```

Each folder has one responsibility.

---

# Layer Responsibilities

## Routes

Responsible for:

- Defining endpoints
- Applying middleware
- Forwarding requests

Routes must not contain business logic.

---

## Controllers

Responsible for:

- Receiving validated requests
- Calling services
- Returning HTTP responses

Controllers should remain thin.

---

## Services

Contain business logic.

Services are responsible for:

- Business rules
- Workflows
- Calculations
- Transactions
- Coordination

Services must not know HTTP details.

---

## Repositories

Repositories communicate with the database.

Responsibilities:

- Queries
- Inserts
- Updates
- Deletes

Repositories must never contain business rules.

---

## Domain

Contains:

- Entities
- Value Objects
- Domain Policies
- Business Invariants

The domain layer should remain framework-independent.

---

## Validators

Validate request payloads using Zod.

All external input must be validated before reaching the service layer.

---

## Events

Business events are emitted when meaningful actions occur.

Examples:

- MemberRegistered
- WalletCredited
- RewardRedeemed
- CampaignPublished

Events should describe completed business actions.

---

# Dependency Rules

Allowed:

```
Route
↓
Controller
↓
Service
↓
Repository
↓
Database
```

Not Allowed:

```
Route
↓
Repository
```

```
Controller
↓
Database
```

```
Repository
↓
Service
```

Dependencies always flow downward.

---

# Business Logic Rules

Business rules belong only inside services or domain objects.

Never place business logic inside:

- Routes
- Controllers
- Repositories
- Validators

---

# Transactions

Use database transactions for operations that modify multiple related records.

Transactions should be short-lived and atomic.

Never leave partial updates.

---

# Error Handling

Use typed application errors.

Examples:

- ValidationError
- AuthenticationError
- AuthorizationError
- BusinessRuleError
- NotFoundError
- ConflictError

Never expose internal stack traces to API consumers.

---

# Logging

Every significant backend action should be logged.

Include:

- Timestamp
- User ID (when available)
- Module
- Action
- Correlation ID
- Severity

Sensitive information must never be logged.

---

# Background Jobs

Long-running tasks should execute in workers.

Examples:

- Email sending
- SMS delivery
- Notifications
- Report generation
- File processing

API requests should return quickly.

---

# Scheduler

Scheduled jobs belong in the scheduler service.

Examples:

- Expire rewards
- Daily summaries
- Cleanup tasks
- Reminder notifications

Scheduled logic must be idempotent.

---

# Configuration

Configuration must come from environment variables.

Never hardcode:

- Secrets
- Tokens
- Database credentials
- API keys

Provide defaults only where safe.

---

# Security

Every endpoint must consider:

- Authentication
- Authorization
- Validation
- Audit Logging
- Rate Limiting

Security is mandatory, not optional.

---

# API Responses

Use consistent response structures.

Successful responses:

```json
{
  "success": true,
  "data": {}
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed."
  }
}
```

---

# Performance

Prefer:

- Indexed queries
- Pagination
- Batch operations
- Streaming large datasets
- Async processing

Avoid:

- N+1 queries
- Full table scans
- Blocking operations

---

# Testing

Every service should be testable.

Focus testing on:

- Business rules
- Validation
- Permission checks
- Edge cases
- Error handling

---

# Documentation

Every backend module should include:

- README.md
- API documentation
- Event documentation
- Permission documentation

Documentation is part of the implementation.

---

# Definition of Done

A backend feature is complete only when it includes:

- Business logic
- Validation
- Authorization
- Error handling
- Logging
- Tests
- Documentation

---

# Related Documents

- docs/dna/01-platform.md
- docs/dna/02-repository.md
- docs/dna/05-database.md
- docs/dna/06-api.md
- docs/dna/07-security.md
- docs/dna/10-claude-rules.md

---

# End of Document