# Deployment Guide — Super Dreams Platform

This guide covers deploying Super Dreams v1.0.0. It assumes an operator familiar
with Docker, PostgreSQL and reverse proxies.

## 1. Prerequisites

- **Node.js 24** and **pnpm** (for building / running migrations).
- **PostgreSQL 16+** and **Redis 7+** (managed services or the bundled
  containers).
- **Docker + Docker Compose** (for the container workflow).

## 2. Architecture

| Service        | Description                                  | Default port |
| -------------- | -------------------------------------------- | ------------ |
| `api`          | Fastify backend API                          | 3000         |
| `bcc`          | Business Control Center (static, via nginx)  | 8080         |
| `member`       | Member Portal (static, via nginx)            | 8081         |
| `postgres`     | PostgreSQL database                          | 5432         |
| `redis`        | Redis cache                                  | 6379         |

## 3. Configuration

Copy `.env.production.example` to `.env.production` and set **every** secret.
Required in staging/production:

- `NODE_ENV=production`
- `DATABASE_URL` (or `POSTGRES_*`) — PostgreSQL connection.
- `REDIS_URL` (or `REDIS_PASSWORD`) — Redis connection.
- `JWT_SECRET` — strong, unique, **≥ 16 characters** (the API refuses to start
  in production with the placeholder value).
- `CORS_ORIGINS` — explicit comma-separated allow-list (never `*` in production).
- `SWAGGER_ENABLED=false` in production (keeps Helmet's strict CSP).

Frontend builds bake `VITE_`-prefixed variables at build time
(`VITE_API_BASE_URL`, app names). Rebuild images when these change.

## 4. Database migrations

Migrations are **roll-forward only** and must run before the API starts:

```bash
pnpm --filter @superdreams/api db:migrate
```

Optionally seed the RBAC catalog + demo data (development only):

```bash
pnpm --filter @superdreams/api db:seed
```

> The RBAC catalog is synced by the seed. After deploying a release that adds
> permissions, run the seed (or the catalog sync) so roles gain the new grants,
> then clear the RBAC permission cache (Redis).

## 5. Container deployment (recommended)

```bash
# Build and start the full stack
docker compose --env-file .env.production up -d --build

# Run migrations inside the api container
docker compose exec api pnpm --filter @superdreams/api db:migrate

# Check health
curl -f http://localhost:3000/ready
```

The CI pipeline (`.github/workflows/ci.yml`) builds the `api`, `bcc` and
`member` images on every push to `main`; use those images for promotion.

## 6. Manual / PaaS deployment

```bash
pnpm install --frozen-lockfile
pnpm exec turbo run build
pnpm --filter @superdreams/api db:migrate
node backend/api/dist/server.js          # start the API
# Serve apps/bcc/dist and apps/member/dist behind a static host / CDN.
```

## 7. Reverse proxy & TLS

Terminate TLS at your edge (nginx/ALB/Cloud load balancer). Route `/api/*` to
the API service and serve the two SPAs as static assets with SPA fallback
(`try_files ... /index.html`). Forward `X-Forwarded-*` headers so client IPs are
recorded correctly in the audit log.

## 8. Health & readiness

- `GET /live` — liveness (process up).
- `GET /ready` — readiness (200 only when DB + Redis are healthy, else 503).
- `GET /health` — full dependency report.

Wire `/live` to the liveness probe and `/ready` to the readiness probe.

## 9. Post-deploy verification

1. `GET /ready` returns 200.
2. Log in to the BCC with an administrator account.
3. Confirm settings, members and wallet pages load real data.
4. Confirm audit entries are being written for a test change.

See [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) for day-2 operations and
[BACKUP_RECOVERY.md](BACKUP_RECOVERY.md) for backups.
