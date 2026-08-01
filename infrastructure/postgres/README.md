# PostgreSQL (infrastructure)

The PostgreSQL service is defined in `docker-compose.yml` (and
`docker-compose.dev.yml`), using the official `postgres:17-alpine` image.

- **Persistence:** named volume (`pgdata` / `pgdata_dev`).
- **Health:** `pg_isready` health check gates dependent services.
- **Credentials:** supplied via environment (`POSTGRES_USER`,
  `POSTGRES_PASSWORD`, `POSTGRES_DB`). Never committed.

## Initialization

Place idempotent `*.sql` / `*.sh` files in `infrastructure/postgres/initdb/` to
have them run **once** on first container start (they are mounted to
`/docker-entrypoint-initdb.d`). There is **no schema in this phase** — the
database schema is introduced by the database-foundation phase via Drizzle
migrations, not init scripts.
