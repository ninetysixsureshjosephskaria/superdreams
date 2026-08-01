# infrastructure/

Operational resources for the Super Dreams platform — containerization,
orchestration, reverse proxy, service configuration, monitoring scaffolding,
scripts, and backups. **No business logic belongs here.**

## Layout

```text
infrastructure/
├── docker/
│   ├── api/Dockerfile           # Fastify API — multi-stage, non-root, healthcheck
│   ├── bcc/{Dockerfile,nginx.conf}    # BCC static build → unprivileged Nginx
│   └── member/{Dockerfile,nginx.conf} # Member static build → unprivileged Nginx
├── nginx/conf.d/default.conf    # Edge reverse proxy (/, /member, /api)
├── postgres/{README.md,initdb/} # Postgres notes + first-run init dir (no schema)
├── redis/redis.conf             # Redis persistence config (password via runtime)
├── monitoring/                  # Prometheus/Grafana/Loki scaffolding (no dashboards)
├── scripts/                     # start/stop/reset/backup/restore/clean/seed/doctor/verify
└── backups/                     # local DB dumps (git-ignored)
```

Compose files live at the repository root: `docker-compose.yml` (full stack) and
`docker-compose.dev.yml` (dev infrastructure only).

## Images (multi-stage, production-ready)

- **api** — `node:24-alpine` base; installs from manifests (cached), builds with
  tsup, prunes to production deps via `pnpm deploy`, runs as the non-root `node`
  user, exposes `:3000`, healthcheck hits `/live`.
- **bcc / member** — build the Vite bundle, then serve static files with
  `nginxinc/nginx-unprivileged` on `:8080` (SPA fallback, gzip, cache headers,
  security headers), healthcheck hits `/healthz`.

Build context is the repository root so the pnpm workspace (source-consumed
shared packages) resolves during the build. `.dockerignore` keeps the context lean.

## Compose services

`postgres` · `redis` · `api` · `bcc` · `member` · `nginx` (edge). Named volumes
(`pgdata`, `redisdata`), a private bridge network, health checks, restart
policies, and env-driven configuration. Dependent services wait on Postgres/Redis
health.

## Scripts

| Script       | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `start.sh`   | Build + start the full stack.                      |
| `stop.sh`    | Stop containers (volumes preserved).               |
| `reset.sh`   | Stop + remove volumes (destroys local data).       |
| `backup.sh`  | Dump Postgres to `backups/` (gzip, keep last 10).  |
| `restore.sh` | Restore Postgres from a dump.                      |
| `clean.sh`   | Remove build artifacts/caches (`pnpm run clean`).  |
| `seed.sh`    | Placeholder (no schema/seeds yet).                 |
| `doctor.sh`  | Report toolchain + daemon status.                  |
| `verify.sh`  | Run the full quality gate (mirrors CI).            |

Default env file is `.env.development`; override with `ENV_FILE=… script.sh`.

See [`docs/deployment/`](../docs/deployment/README.md) for local-setup and
deployment guides. Security/DevOps standards: `docs/dna/09-devops.md`.
