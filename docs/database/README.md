# Database Documentation

The Super Dreams database uses **PostgreSQL** with **Drizzle ORM** and a
roll-forward migration strategy.

- **Standards (single source of truth):** [`docs/dna/05-database.md`](../dna/05-database.md).
- **Implementation & module guide:** [`backend/api/src/database/README.md`](../../backend/api/src/database/README.md)
  — folder structure, migration workflow, repository/transaction usage, health.

## At a glance

- UUID primary keys; `snake_case`, plural tables; UTC `TIMESTAMPTZ`.
- Standard audit/lifecycle columns (`created_at`, `updated_at`, `deleted_at`,
  `created_by`, `updated_by`, `deleted_by`, `version`) via reusable helpers.
- Soft delete by default; optimistic locking via `version`.
- Platform base tables only (config, feature flags, audit log, jobs/tasks,
  reference data). No authentication or business tables in this foundation.
- Database access is isolated behind the repository layer.

## Migration commands

```bash
pnpm --filter @superdreams/api db:generate   # generate migration from schema
pnpm --filter @superdreams/api db:migrate    # apply migrations
pnpm --filter @superdreams/api db:seed       # run environment seeds
```
