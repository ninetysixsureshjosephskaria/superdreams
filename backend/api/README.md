# @superdreams/api

The Super Dreams API service — the backend **foundation** that all business
modules build upon. Built with Fastify and TypeScript following Clean
Architecture and Domain-Driven Design.

> This is the backend bootstrap. It contains **no** business features
> (authentication, members, wallet, rewards, etc.). It provides configuration,
> logging, error handling, database and cache connectivity, security plugins,
> API documentation, health checks, and the response contract that future
> modules extend.

---

## Architecture

Requests flow through clearly separated layers, with dependencies always
pointing inward toward the domain:

```
Route → (Controller) → Service → (Repository) → Database
```

Controllers, repositories, and domain models are introduced per business module
in later phases. This foundation provides the surrounding infrastructure:

- **config** — environment loading and validation (Zod); typed configuration.
- **logger** — structured, environment-aware logging (Pino).
- **errors** — typed application errors and a centralized error handler.
- **database** — PostgreSQL connection and Drizzle ORM client (+ health probe).
- **cache** — Redis client (+ health probe).
- **plugins** — Helmet, CORS, rate limiting, Sensible, Swagger.
- **middleware** — request context (correlation id); auth/RBAC/audit come later.
- **health** — liveness, readiness, and full health endpoints.
- **routes** — foundation routes only (`/`, `/health`, `/ready`, `/live`).

---

## Folder Structure

```text
backend/api/
├── src/
│   ├── app/          # Application assembly (buildApp)
│   ├── cache/        # Redis client & plugin
│   ├── config/       # Env validation & typed config
│   ├── database/     # Drizzle client, plugin & (empty) schema barrel
│   ├── errors/       # Error classes, codes & centralized handler
│   ├── health/       # Health service & routes
│   ├── logger/       # Pino logger options
│   ├── middleware/   # Request context (+ planned auth/RBAC/audit)
│   ├── plugins/      # Fastify core plugins
│   ├── routes/       # Foundation route registration
│   ├── services/     # Cross-cutting application services (placeholder)
│   ├── types/        # Shared types & Fastify type augmentation
│   ├── utils/        # Response helpers & utilities
│   └── server.ts     # Composition root (build + listen + graceful shutdown)
├── tests/            # Vitest tests
├── drizzle/          # Migrations (empty until the database phase)
├── tsup.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

---

## Requirements

- Node.js `>= 24` (LTS)
- PNPM `>= 9`
- PostgreSQL and Redis (for full health; the service still boots without them)

---

## Running Locally

From the repository root (recommended, so shared tooling resolves):

```bash
pnpm install
cp backend/api/.env.example backend/api/.env
pnpm --filter @superdreams/api dev
```

The service listens on `http://localhost:3000` by default.

- API metadata: `GET /`
- Health: `GET /health`, `GET /ready`, `GET /live`
- API docs (Swagger UI): `GET /docs`

---

## Health & Readiness

The service exposes three probes with distinct, orchestrator-aligned semantics:

- **`GET /live` (liveness)** — returns `200` whenever the process is running; it
  performs no dependency checks. Orchestrators restart the container only if this
  fails. A dependency outage must **not** fail liveness (that would cause
  pointless restart loops).
- **`GET /ready` (readiness)** — returns `200` **only when all probed
  dependencies (database and Redis) are healthy**; otherwise `503`. Load
  balancers and orchestrators stop routing traffic to the instance while it is
  not ready — without restarting it — so it rejoins automatically once
  dependencies recover.
- **`GET /health` (diagnostics)** — always returns `200` with a structured
  report: overall status (`ok` | `degraded` | `down`) plus per-dependency status
  and latency. Intended for dashboards and debugging, not for gating traffic.

> Both database and Redis are currently treated as required for readiness. If a
> dependency is later reclassified as non-critical (e.g. a pure cache), adjust
> its weight in the readiness decision here and in `health.service.ts`.

---

## Environment

All variables are validated on startup with Zod; invalid values abort boot.
See [`.env.example`](.env.example) for the full list. Key variables:

| Variable          | Default                                                   | Description                                                                      |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `NODE_ENV`        | `development`                                             | Runtime environment.                                                             |
| `HOST` / `PORT`   | `0.0.0.0` / `3000`                                        | Bind address.                                                                    |
| `LOG_LEVEL`       | `info`                                                    | Pino log level.                                                                  |
| `DATABASE_URL`    | `postgres://postgres:postgres@localhost:5432/superdreams` | PostgreSQL connection.                                                           |
| `REDIS_URL`       | `redis://localhost:6379`                                  | Redis connection.                                                                |
| `JWT_SECRET`      | `change-me-in-production`                                 | Required to be strong in prod.                                                   |
| `SWAGGER_ENABLED` | _(unset)_                                                 | Toggles `/docs`. When unset: enabled outside production, disabled in production. |

---

## Commands

| Command                                    | Description                |
| ------------------------------------------ | -------------------------- |
| `pnpm --filter @superdreams/api dev`       | Start in watch mode (tsx). |
| `pnpm --filter @superdreams/api build`     | Build to `dist/` (tsup).   |
| `pnpm --filter @superdreams/api start`     | Run the built server.      |
| `pnpm --filter @superdreams/api typecheck` | Type-check (tsc, no emit). |
| `pnpm --filter @superdreams/api lint`      | Lint (ESLint).             |
| `pnpm --filter @superdreams/api test`      | Run tests (Vitest).        |

These also run via Turborepo from the root (`pnpm build`, `pnpm test`, etc.).

---

## Development Workflow

1. Add or change code under `src/`.
2. Keep routes and controllers thin; put logic in services (per module, later).
3. Validate all external input with Zod.
4. Ensure `typecheck`, `lint`, and `test` pass before opening a PR.
5. Update documentation when architecture, APIs, or configuration change.

---

## Path Aliases

Internal imports use the `@/*` alias mapped to `src/*` (see `tsconfig.json`).
It is resolved by tsup (build), tsx (dev), Vitest (tests), and the editor.
