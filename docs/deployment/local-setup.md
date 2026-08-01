# Local Setup

## Prerequisites

- **Node.js ≥ 24** and **PNPM ≥ 9** (via `corepack enable`)
- **Docker** + **Docker Compose v2** (Docker Desktop or Engine)

Check your toolchain: `bash infrastructure/scripts/doctor.sh`.

## 1. Install & configure

```bash
pnpm install
cp .env.development .env        # safe local defaults (or start from .env.example)
```

Environment templates:

- `.env.example` — documented reference for every variable.
- `.env.development` — safe local defaults (committed).
- `.env.production.example` — production template (copy to `.env.production`, never commit).

## 2a. Recommended dev loop — infra in Docker, apps on host (fast HMR)

```bash
docker compose -f docker-compose.dev.yml --env-file .env.development up -d
pnpm dev            # runs api + bcc + member with hot reload
```

- API → http://localhost:3000 (docs at `/docs` when `SWAGGER_ENABLED=true`)
- BCC → http://localhost:5173 · Member → http://localhost:5174
- Adminer (DB UI) → http://localhost:8090

## 2b. Full containerized stack (production-like)

```bash
docker compose --env-file .env.development up -d --build
# or: ENV_FILE=.env.development bash infrastructure/scripts/start.sh
```

| Service   | URL                    |
| --------- | ---------------------- |
| Edge (Nginx) | http://localhost/    |
| API       | http://localhost:3000  |
| BCC       | http://localhost:8080  |
| Member    | http://localhost:8081  |
| Postgres  | localhost:5432         |
| Redis     | localhost:6379         |

## 3. Health & connectivity

```bash
curl http://localhost:3000/health   # app + DB + Redis status (JSON)
curl http://localhost:3000/live     # liveness (200)
curl http://localhost:3000/ready    # readiness (200 only when all deps healthy)
curl http://localhost:8080/healthz  # BCC container health
```

## 4. Quality gate

```bash
bash infrastructure/scripts/verify.sh   # prettier + lint + typecheck + test + build
```

## 5. Stop / reset

```bash
bash infrastructure/scripts/stop.sh     # stop (keep data)
bash infrastructure/scripts/reset.sh    # stop + delete volumes (destroys data)
```

## Troubleshooting

- **Port already in use** — change `*_PORT` in your `.env` and restart.
- **API unhealthy** — ensure `postgres`/`redis` are healthy
  (`docker compose ps`); the API reports dependencies at `/health`.
- **Frontend shows "Offline"** — the API isn't reachable; confirm it's running
  and that `VITE_API_BASE_URL` matches how the browser reaches it. (Frontend env
  is baked at build time; rebuild the image after changing it.)
- **Docker daemon not running** — start Docker Desktop / the Docker service.
