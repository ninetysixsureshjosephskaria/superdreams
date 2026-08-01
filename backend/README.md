# backend/

Backend services for the Super Dreams platform.

All server-side **business logic lives here**, organized by domain following
Domain-Driven Design and Clean Architecture. Each domain owns its own routes,
controllers, services, repositories, domain models, validators, events, and
permissions.

## Services

| Service   | Path                 | Purpose                                        |
| --------- | -------------------- | ---------------------------------------------- |
| API       | `backend/api`        | HTTP API (Fastify) — the platform's public contract. |
| Worker    | `backend/worker`     | Background job processing (email, notifications, reports). |
| Scheduler | `backend/scheduler`  | Scheduled, idempotent recurring jobs.          |

## Rules

- Dependencies flow downward: Route → Controller → Service → Repository → Database.
- Business rules belong in services or domain objects — never in routes,
  controllers, repositories, or validators.
- Every endpoint considers authentication, authorization, validation, audit
  logging, and rate limiting.

Each service is scaffolded and implemented in a later phase.
See `docs/dna/03-backend.md` for backend engineering standards.
