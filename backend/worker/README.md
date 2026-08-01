# backend/worker — Worker Service

Processes long-running and asynchronous tasks off the request path, such as
email and SMS delivery, notifications, report generation, and file processing.

- **Responsibilities:** Consume jobs from a queue and execute them reliably.
- **Principle:** API requests should return quickly; heavy work runs here.

> Placeholder. This service is scaffolded in a later phase.
> See `docs/dna/03-backend.md`.
