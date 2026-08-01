# packages/

Reusable, single-responsibility libraries shared across applications and
backend services.

Each package owns **exactly one responsibility**. Packages must be reusable and
must **not depend on applications** — applications depend on packages, never the
reverse.

## Packages

| Package       | Responsibility                           |
| ------------- | ---------------------------------------- |
| `ui`          | Shared UI component library.             |
| `theme`       | Design tokens and theming.               |
| `auth`        | Client-side authentication utilities.    |
| `api-client`  | Typed client for the backend API.        |
| `validation`  | Shared Zod validation schemas.           |
| `permissions` | RBAC permission definitions and helpers. |
| `constants`   | Shared constants.                        |
| `config`      | Shared configuration.                    |
| `types`       | Shared TypeScript types.                 |
| `utils`       | Pure utility functions.                  |

## Rules

- One responsibility per package.
- No business logic, authentication, or database access inside `ui`.
- No circular dependencies between packages.

Each package is scaffolded and implemented in a later phase.
See `docs/dna/02-repository.md`.
