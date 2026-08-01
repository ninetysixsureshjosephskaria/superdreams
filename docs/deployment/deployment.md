# Deployment

Production deployment of the Super Dreams platform with Docker. The same images
and Compose topology used locally run in production; only configuration differs.

## 1. Configuration & secrets

```bash
cp .env.production.example .env.production   # then set STRONG, unique values
```

- **Never commit `.env.production`** (git-ignored). Prefer a real secrets manager
  (Docker/Swarm secrets, Vault, cloud secret store) over plain env files.
- Required strong secrets: `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`
  (≥ 32 random chars). The API refuses to start in production with a weak/default
  `JWT_SECRET`.
- `CORS_ORIGINS` must list the exact frontend origins (no `*`).
- `SWAGGER_ENABLED=false` in production (default).
- `VITE_API_BASE_URL` is **baked into the frontend build** — set it to the public
  API origin before building the `bcc`/`member` images.

## 2. Build & start

```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

The deploy sequence honored by the stack: build artifacts → start Postgres/Redis
→ wait for health → start API → start frontends → start edge proxy.

> **Database migrations** are introduced in the database-foundation phase and run
> as a deploy step (Drizzle) before the API serves traffic. There is no schema in
> this phase.

## 3. Reverse proxy & TLS

The `nginx` edge service routes `/ → BCC`, `/member/ → Member`, `/api/ → API`
with gzip and security headers. For public TLS, terminate HTTPS at the edge
(mount certificates and add a `443` server block) or place the stack behind a
managed load balancer / cloud ingress.

## 4. Health checks

- API: `/live` (liveness — restart only), `/ready` (readiness — gates traffic,
  503 unless all deps healthy), `/health` (diagnostics).
- Frontends: `/healthz`. Edge: `/healthz`.

Wire these to your orchestrator's liveness/readiness probes and the load
balancer health checks.

## 5. Backups & restore

```bash
ENV_FILE=.env.production bash infrastructure/scripts/backup.sh    # gzipped dump, keep last 10
ENV_FILE=.env.production bash infrastructure/scripts/restore.sh infrastructure/backups/<file>.sql.gz
```

Schedule `backup.sh` (cron/systemd timer) and store dumps off-host. Test restores
periodically.

## 6. Rollback

Images are immutable and tagged. To roll back, redeploy the previous image tag.
Consider database migration compatibility before rolling back across a schema
change (see the database phase).

## 7. Monitoring

Health endpoints are available now. Metrics/observability (Prometheus, Grafana,
Loki) are scaffolded under `infrastructure/monitoring/` and enabled in a later
step (no dashboards configured yet).

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR: Prettier, Lint (no warnings),
Typecheck, Test, Build (+ artifacts), a dependency audit, and validation builds
of all three Docker images. The pipeline fails on any error.
