# apps/

Runnable frontend applications for the Super Dreams platform.

Applications in this directory are **presentation surfaces only**. They compose
features and shared packages into a user-facing experience and communicate with
the backend exclusively through APIs.

Applications **must not** contain reusable business logic — that belongs in
`backend/` (server-side) or `packages/` (shared client-side libraries).

## Applications

| Application | Path          | Purpose                                       |
| ----------- | ------------- | --------------------------------------------- |
| BCC         | `apps/bcc`    | Business Control Center for admins and staff. |
| Member      | `apps/member` | Member Portal for registered customers.       |

## Rules

- Applications never depend on other applications.
- Applications depend on `packages/*`, never the reverse.
- Cross-application communication happens through backend APIs only.

Each application is scaffolded and implemented in a later phase.
See `docs/dna/04-frontend.md` for frontend engineering standards.
