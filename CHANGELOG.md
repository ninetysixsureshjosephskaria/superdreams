# Changelog

All notable changes to the Super Dreams Platform are documented here. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-08-01

First production release. The platform was built in 20 governed phases; each
phase's scope is summarized below.

### Platform foundation (Phases 01–12)

- **Added** pnpm + Turborepo monorepo: `backend/api`, `apps/bcc`,
  `apps/member`, and shared packages (`api-client`, `theme`, `types`,
  `constants`, `utils`, `validation`, `ui`, `config`, `permissions`).
- **Added** Fastify 5 API foundation: config validation, structured logging
  (Pino) with correlation IDs, typed error handling, response envelope,
  security plugins (Helmet, CORS, cookies, rate limiting), Swagger/OpenAPI.
- **Added** Drizzle ORM + PostgreSQL with reusable base columns
  (id/timestamps/soft-delete/audit actors/version), `BaseRepository`,
  transaction and pagination helpers, and an embedded-Postgres (PGlite) test
  harness.
- **Added** Identity, Authentication (JWT access + refresh rotation, Argon2id
  hashing, account lockout — see ADR-017) and RBAC (catalog-driven permissions,
  cached resolution) modules.
- **Added** the design system (`@superdreams/ui`), theme tokens, and both
  application shells (Business Control Center and Member Portal).

### Business modules (Phases 13–19)

- **Added** Member Management (Phase 13).
- **Added** Wallet Management — ledger + balance projection, holds,
  adjustments, statements (Phase 14).
- **Added** Rewards Management — programs, points ledger, redemptions, expiry
  (Phase 15).
- **Added** Campaign Management — lifecycle, audience, rewards, execution
  (Phase 16).
- **Added** Notification Center — templates, idempotent queue with
  retry/dead-letter, delivery log, inbox, preferences (Phase 17).
- **Added** Reports & Analytics — read-only aggregation, dashboards, exports,
  schedules, history (Phase 18).
- **Added** Settings & Administration — database-backed configuration, feature
  toggles, maintenance mode, versioned + audited changes (Phase 19).

### Production hardening (Phase 20)

- **Added** release documentation: deployment guide, operations runbook,
  backup/recovery, security checklist, performance baseline, known limitations,
  contributing guide, and code of conduct.
- **Changed** workspace package versions to `1.0.0`.
- **Verified** security posture, RBAC + audit coverage, database integrity
  (11 migrations, indexes, foreign keys), CI, Docker, and the full quality gate
  (typecheck, lint, tests, build, Prettier, Turbo).

### Security

- Argon2id password hashing; JWT access tokens with rotating, hashed refresh
  tokens stored as HTTP-only cookies; account lockout; parameterized queries
  via Drizzle (no string-built SQL); Helmet security headers; configurable CORS
  allow-list; per-window rate limiting; secrets sourced from the environment.

[1.0.0]: https://example.com/super-dreams/releases/tag/v1.0.0
