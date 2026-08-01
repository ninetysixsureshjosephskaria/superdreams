# Contributing to Super Dreams

Thanks for contributing. This guide covers the workflow, standards and quality
gate for the monorepo.

## Prerequisites

- Node.js 24 and pnpm
- Docker + Docker Compose (for the local stack)

```bash
pnpm install
cp .env.example .env.development   # if not already present
./infrastructure/scripts/start.sh  # Postgres + Redis + supporting services
pnpm --filter @superdreams/api db:migrate
pnpm --filter @superdreams/api db:seed   # development demo data
```

## Repository layout

- `backend/api` — Fastify API (modules under `src/modules/*`).
- `apps/bcc`, `apps/member` — React applications.
- `packages/*` — shared libraries (`api-client`, `ui`, `types`, `utils`,
  `validation`, `theme`, `constants`, `config`, `permissions`).
- `docs/` — DNA (`docs/dna`), ADRs (`docs/adr`), product and phase prompts.
- `infrastructure/` — Docker, scripts, monitoring config.

The **DNA documents in `docs/dna` are the single source of truth.** If a change
conflicts with the DNA, raise it for discussion first.

## Development standards

- **TypeScript strict**, no `any`, no non-null assertions on untrusted data.
- **No dead code, TODO placeholders, or debug logging** in committed code.
- Validate all input with Zod at the service boundary; never trust the client.
- Reuse shared packages and `BaseRepository`/helpers; do not duplicate logic.
- Keep modules cohesive: routes → controller → service → repository. Business
  logic lives in services; persistence in repositories.
- Money is integer minor units; reward points are integers. Never use floats for
  money.
- Every admin endpoint must be permission-guarded (RBAC catalog); every
  mutation must be audited.

## Adding a backend module (pattern)

schema → enums → RBAC catalog permissions → migration (`db:generate`) →
dto/validators/events/mappers → repositories → service → controller → routes →
wire into `routes/index.ts` + Swagger tag → README → tests.

## Commits & branches

- Work on a feature branch off `main`.
- Conventional Commit messages (`feat:`, `fix:`, `docs:`, `chore:`, …);
  Commitlint runs on commit.
- Husky + lint-staged run Prettier/ESLint on staged files.

## Quality gate (must pass before merge)

```bash
pnpm exec turbo run typecheck lint test build
pnpm format:check
```

Zero TypeScript errors, zero ESLint warnings, all tests passing, clean Prettier.
CI (`.github/workflows/ci.yml`) enforces the same gate plus `pnpm audit` and
Docker image builds.

## Tests

- Backend: Vitest with PGlite (embedded Postgres) for integration tests; unit
  tests for validators/pure logic.
- Frontend: Vitest + Testing Library.
- Add tests with meaningful coverage for new behavior; keep the suite green.

## Pull requests

- Describe the change, link the relevant phase/DNA section, and note any DB
  migration.
- Confirm the quality gate passes locally.
- Do not introduce architectural changes or new dependencies without discussion.
