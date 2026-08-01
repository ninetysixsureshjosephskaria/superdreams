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

## Documentation

The complete documentation set lives in [`docs/`](docs). Start with
[`docs/README.md`](docs/README.md) for an overview of how the documentation is
organized.

---

## License

Released under the [MIT License](LICENSE).
