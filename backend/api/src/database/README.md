# Database Foundation

The production-ready PostgreSQL + Drizzle ORM foundation for the Super Dreams
platform. Business modules add their own tables through **independent, roll-forward
migrations** without changing this architecture. Governed by
[`docs/dna/05-database.md`](../../../../docs/dna/05-database.md).

## Folder structure

```text
backend/api/
├── drizzle/                 # Generated migrations (roll-forward) + journal
├── drizzle.config.ts        # Drizzle Kit configuration
└── src/database/
    ├── client/              # postgres.js pool + typed Drizzle client
    ├── connection/          # Connection lifecycle: retry, ping, rich health, close
    ├── migrations/          # runMigrations() (programmatic apply)
    ├── schema/              # Table definitions, enums, reusable column groups
    ├── repositories/        # BaseRepository abstraction
    ├── helpers/             # transaction / pagination / soft-delete helpers
    ├── seed/                # Seed runner (no business data)
    ├── types/              # Executor/Transaction + pagination types
    ├── database.plugin.ts   # Fastify wiring (db, databasePing, databaseHealth)
    └── index.ts             # Public barrel
```

## Naming conventions (enforced)

- Tables: **plural, `snake_case`**; entities: singular. Columns: `snake_case`.
- Primary keys: **UUID** (`gen_random_uuid()`), never auto-increment.
- Standard columns on every business table (via `baseColumns()`): `id`,
  `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`,
  `deleted_by`, `version`.
- Timestamps are `TIMESTAMPTZ` (UTC). Booleans use positive names (`is_active`).
- Foreign keys: `<entity>_id`. Status uses enums (`record_status`, `job_status`).

## Base tables (platform-level only)

`system_config`, `application_settings`, `feature_flags`, `audit_logs`
(append-only), `jobs`, `background_tasks`, `countries`, `currencies`,
`languages`, `timezones`. **No authentication or business tables.**

## Migration workflow (roll-forward only)

```bash
pnpm --filter @superdreams/api db:generate   # diff schema → new SQL migration
pnpm --filter @superdreams/api db:migrate     # apply pending migrations
pnpm --filter @superdreams/api db:seed        # run env seeds (no-op today)
```

- One logical change per migration. **Never edit an applied migration** — add a
  new corrective migration instead.
- Migrations are applied as a deploy step (before the API serves traffic), never
  by manual schema edits and never via ORM "synchronize".

## Repository layer

Database access is isolated behind repositories. `BaseRepository<TTable>` provides
`findById`, `findMany` (paginated, excludes soft-deleted), `count`, `create`,
`update` (bumps `updated_at` + `version`), `softDelete`, `restore`. Every method
accepts an optional executor so it can run inside `withTransaction`. Repositories
own persistence only — **no business rules**.

```ts
class SystemConfigRepository extends BaseRepository<typeof schema.systemConfig> {
  constructor(db: Database) {
    super(db, schema.systemConfig);
  }
}
```

## Transactions

```ts
await withTransaction(db, async (tx) => {
  await repoA.create(a, tx);
  await repoB.update(id, b, tx); // commits together; rolls back on any throw
});
```

`withNestedTransaction(tx, fn)` creates a savepoint inside an existing transaction.

## Health

`databaseHealth()` reports connectivity, latency, server version, applied
migration count, and pool size. `databasePing()` backs the `/health` endpoint's
database dependency check.

## Development workflow & best practices

1. Add/modify tables in `schema/` using `baseColumns()` and the shared enums.
2. `db:generate`, review the SQL, commit the migration with the code.
3. Add indexes for foreign keys, status, dates, and search columns.
4. Prefer transactions for multi-table writes; never hard-delete business rows.
5. `db:migrate` in each environment as part of deploy.

## Testing

`tests/database.integration.test.ts` runs the generated migration and exercises
the base repository, soft delete/restore, and transaction rollback against an
embedded PostgreSQL (**PGlite**, a dev/test-only dependency) — no external
database required for CI.
