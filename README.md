# Super Dreams Platform

Super Dreams is an enterprise-grade engagement, loyalty, rewards, and business
management platform. It enables organizations to acquire members, engage
customers, reward activity, manage campaigns, analyze performance, and automate
operations through a single, unified platform.

This repository is the enterprise monorepo that houses every application,
backend service, shared library, infrastructure definition, and documentation
set for the platform.

---

## Architecture

Super Dreams follows a **modular, domain-driven architecture** built on
**Clean Architecture** principles. Business logic is independent of frameworks,
and dependencies always point toward the domain.

- **Monorepo** — a single, versioned workspace managed with PNPM + Turborepo.
- **Domain-Driven Design** — each business domain owns its own rules and data.
- **Clean Architecture** — Route → Controller → Service → Repository → Database.
- **Security by Default** — authentication, authorization, validation, and
  auditing are mandatory concerns for every feature.

All engineering standards are defined in [`docs/dna`](docs/dna) and are treated
as the single source of truth. If any implementation conflicts with the
documentation, the documentation takes precedence.

---

## Repository Structure

```text
SuperDreams/
├── apps/               # Runnable frontend applications (no reusable business logic)
│   ├── bcc/            # Business Control Center (admin & staff)
│   └── member/         # Member Portal
├── backend/            # Backend services (business logic lives here)
│   ├── api/            # HTTP API service
│   ├── worker/         # Background job processing
│   └── scheduler/      # Scheduled / recurring jobs
├── packages/           # Reusable, single-responsibility libraries
│   ├── ui/             # Shared UI component library
│   ├── theme/          # Design tokens & theming
│   ├── auth/           # Client-side authentication utilities
│   ├── api-client/     # Typed API client
│   ├── validation/     # Shared Zod validation schemas
│   ├── permissions/    # RBAC permission definitions & helpers
│   ├── constants/      # Shared constants
│   ├── config/         # Shared configuration
│   ├── types/          # Shared TypeScript types
│   └── utils/          # Pure utility functions
├── infrastructure/     # Docker, Compose, Nginx, deployment & ops resources
├── docs/               # Platform documentation (single source of truth)
├── .github/            # GitHub configuration & CI/CD workflows
└── .vscode/            # Recommended editor configuration
```

Dependency direction is strictly enforced: **Applications → Packages →
Infrastructure**. Applications never depend on other applications; they
communicate through APIs only.

---

## Requirements

- **Node.js** `>= 24` (LTS) — see [`.nvmrc`](.nvmrc)
- **PNPM** `>= 9` (via Corepack)
- **Git**

Enable the pinned package manager with Corepack:

```bash
corepack enable
```

---

## Installation

```bash
# Use the pinned Node.js version
nvm use

# Install all workspace dependencies
pnpm install
```

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

---

## Development

Common workflows are exposed as workspace scripts and orchestrated by Turborepo:

```bash
pnpm dev          # Run applications and services in development mode
pnpm build        # Build all workspaces
pnpm lint         # Lint all workspaces
pnpm typecheck    # Type-check all workspaces
pnpm test         # Run all tests
pnpm format       # Format the repository with Prettier
```

> During this bootstrap phase the applications, services, and packages are
> scaffolded but not yet implemented. Turborepo tasks will begin producing
> output as those workspaces are populated in later phases.

---

## Scripts

| Script             | Description                                        |
| ------------------ | -------------------------------------------------- |
| `pnpm dev`         | Start all workspaces in development mode.           |
| `pnpm build`       | Build all workspaces (Turborepo, cached).           |
| `pnpm lint`        | Run ESLint across all workspaces.                   |
| `pnpm typecheck`   | Run TypeScript type-checking across all workspaces. |
| `pnpm test`        | Run the full test suite.                            |
| `pnpm format`      | Format the repository with Prettier.                |
| `pnpm format:check`| Verify formatting without writing changes.          |
| `pnpm clean`       | Remove build artifacts and caches.                  |

---

## Workspace Overview

- **`apps/`** — user-facing applications. Presentation only; no reusable
  business logic.
- **`backend/`** — API, worker, and scheduler services. All business logic
  lives here, organized by domain.
- **`packages/`** — small, reusable, single-responsibility libraries shared
  across applications and services.
- **`infrastructure/`** — containerization, reverse proxy, and operational
  resources. No business logic.
- **`docs/`** — architecture, standards (DNA), product, and implementation
  documentation.

---

## Engineering Standards

Every contributor — human or AI — must follow the platform DNA:

- [`docs/dna/01-platform.md`](docs/dna/01-platform.md) — platform principles
- [`docs/dna/02-repository.md`](docs/dna/02-repository.md) — repository standards
- [`docs/dna/03-backend.md`](docs/dna/03-backend.md) — backend engineering
- [`docs/dna/04-frontend.md`](docs/dna/04-frontend.md) — frontend engineering
- [`docs/dna/07-security.md`](docs/dna/07-security.md) — security standards
- [`docs/dna/10-claude-rules.md`](docs/dna/10-claude-rules.md) — AI engineering rules

Code style is enforced by **ESLint** and **Prettier**. Commit messages follow
the **Conventional Commits** specification, validated by **Commitlint**. Git
hooks are managed by **Husky**, running **lint-staged** on commit and
type-checking plus tests on push.

---

## Contributing

- Protected branches: `main` and `develop`. Direct pushes are prohibited.
- All changes are delivered through Pull Requests.
- Branch names: `feature/*`, `fix/*`, `hotfix/*`, `release/*`.
- Commits follow Conventional Commits, e.g. `feat(wallet): add manual adjustment`.
- Documentation is part of the feature — update the relevant docs with every
  change to architecture, APIs, database structures, or business rules.

---

## Authentication

Both frontends use real JWT authentication against the API (`/api/v1/auth/*`).

**Login URLs**

- Member Portal: `/login`
- Business Control Center: `/login`

**Default administrator** (created by the `production-admin` seed in every
environment):

| Field    | Value                     |
| -------- | ------------------------- |
| Email    | `admin@superdreams.com`   |
| Password | `ChangeMe123!`            |

The admin account is flagged `mustChangePassword`, so the first sign-in is
redirected to **Change password**; the seeded credential must be rotated before
the console can be used. Sign in to the BCC with this account.

**Flow**

1. `POST /api/v1/auth/login` returns a short-lived JWT **access token** (sent as
   `Authorization: Bearer`) and a rotating **refresh token** (returned in the
   body and also set as an httpOnly cookie).
2. The access token is held in memory; the refresh token is persisted to
   `localStorage` (when "Remember me" is checked) or `sessionStorage` otherwise.
3. On a `401`, the API client transparently calls `POST /api/v1/auth/refresh`
   (with refresh-token **rotation** and reuse/theft detection), retries the
   request, and on failure clears the session and redirects to `/login`.
4. On load, a persisted refresh token restores the session (`refresh` → `me`).
5. `POST /api/v1/auth/logout` revokes the server session and clears local tokens.

Passwords are hashed with Argon2id. The BCC additionally loads the caller's
effective RBAC permissions (`GET /api/v1/users/:id/permissions`) to gate routes.

**Environment variables**

Backend (API service):

| Variable                     | Purpose                                             | Default                      |
| ---------------------------- | --------------------------------------------------- | ---------------------------- |
| `DATABASE_URL`               | PostgreSQL connection string                        | local dev default            |
| `REDIS_URL`                  | Redis connection string                             | `redis://localhost:6379`     |
| `JWT_SECRET`                 | **Required in production** — signs access tokens     | dev placeholder              |
| `JWT_ACCESS_EXPIRES_IN`      | Access-token TTL                                     | `15m`                        |
| `JWT_REFRESH_EXPIRES_IN`     | Refresh-token TTL                                    | `7d`                         |
| `AUTH_COOKIE_NAME`           | Refresh-cookie name                                 | `sd_refresh`                 |
| `AUTH_COOKIE_SECURE`         | `Secure` flag on the refresh cookie                 | on in production             |
| `AUTH_COOKIE_SAMESITE`       | `SameSite` policy for the refresh cookie            | `lax`                        |
| `CORS_ORIGINS`               | Allowed origins (set to the two frontend URLs)      | `*`                          |

Frontends (Member + BCC), build-time:

| Variable             | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `VITE_API_BASE_URL`  | Public URL of the deployed API service   |

> The former `VITE_DEV_ACCESS_TOKEN` static-token shim has been removed — the
> apps now authenticate through the login flow.

**Railway deployment notes**

- Apply migrations and seeds on the API service after deploy:
  `pnpm --filter @superdreams/api db:migrate && pnpm --filter @superdreams/api db:seed`.
  The `production-admin` seed is idempotent and safe to run repeatedly.
- Set `JWT_SECRET` (strong, ≥16 chars) and `CORS_ORIGINS` to the exact Member and
  BCC URLs on the API service.
- Set `VITE_API_BASE_URL` (no trailing slash) on each frontend service **before**
  its build, then redeploy.
- Rotate the seeded admin password on first login.

## Documentation

The complete documentation set lives in [`docs/`](docs). Start with
[`docs/README.md`](docs/README.md) for an overview of how the documentation is
organized.

---

## License

Released under the [MIT License](LICENSE).
