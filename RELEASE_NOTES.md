# Release Notes — Super Dreams Platform v1.0.0

**Release date:** 2026-08-01
**Status:** Production-ready

## Overview

Super Dreams is an enterprise loyalty, wallet and rewards platform delivered as
a pnpm + Turborepo monorepo. v1.0.0 is the first production release and includes
a complete backend API, two frontend applications, and a shared package layer.

## What's included

### Applications

- **Business Control Center (BCC)** — the admin application: members, wallets,
  rewards, campaigns, notifications, reports & analytics, and platform settings.
- **Member Portal** — the member-facing application: profile, wallet, rewards,
  campaigns, notifications, and statements.

### Backend modules (10)

Identity, Authentication, RBAC, Members, Wallet, Rewards, Campaigns,
Notifications, Reports, Settings.

### Shared packages

`@superdreams/api-client`, `theme`, `types`, `constants`, `utils`,
`validation`, `ui`, `config`, `permissions`.

## Highlights

- **Financial correctness** — money is stored as integer minor units; wallets
  and rewards use append-only ledgers with row-locked balance projections.
- **Security** — Argon2id hashing, JWT access + rotating refresh tokens,
  catalog-driven RBAC on every admin endpoint, and a full audit trail.
- **Operability** — liveness/readiness/health probes, correlation IDs,
  structured logging, feature toggles and maintenance mode.
- **Quality gate** — strict TypeScript (no `any`), ESLint (zero warnings),
  Prettier, and a passing test suite across all workspaces.

## Upgrade / installation

This is the initial release; see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for
first-time setup. Apply database migrations with `pnpm --filter @superdreams/api
db:migrate` before starting the API.

## Known limitations

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md). None are release-blocking;
notable items include mocked email/SMS/push providers, in-memory rate limiting,
and CSV-backed XLSX/PDF export rendering (pluggable seams).

## Credits

Built in 20 governed phases against the platform DNA documents (`docs/dna`) and
architecture decision records (`docs/adr`).
