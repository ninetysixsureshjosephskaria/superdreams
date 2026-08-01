# Operations Runbook — Super Dreams Platform

Day-2 operations for the Super Dreams platform. Pair with
[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) and
[BACKUP_RECOVERY.md](BACKUP_RECOVERY.md).

## Service map

- **api** — Fastify backend (stateless; scale horizontally behind a load
  balancer).
- **bcc / member** — static SPA bundles served by nginx.
- **postgres** — system of record.
- **redis** — cache (RBAC permission resolution, settings cache is in-process).

Helper scripts live in `infrastructure/scripts/` (`start.sh`, `stop.sh`,
`verify.sh`, `doctor.sh`, `reset.sh`, `clean.sh`, `seed.sh`, `backup.sh`,
`restore.sh`).

## Health monitoring

| Probe    | Endpoint  | Meaning                                             |
| -------- | --------- | -------------------------------------------------- |
| Liveness | `/live`   | Process is running.                                |
| Readiness| `/ready`  | 200 when DB **and** Redis are healthy, else 503.   |
| Health   | `/health` | Full per-dependency report with latencies.         |

Alert when `/ready` is non-200 for more than one probe interval.

## Logging & tracing

- Structured JSON logs (Pino). Set verbosity with `LOG_LEVEL`
  (`fatal|error|warn|info|debug|trace`).
- Every request carries a **correlation ID** (`requestId`), propagated into
  audit records (`correlation_id`) — use it to trace a request end to end.

## Common tasks

### Deploy a new release

1. Build/pull the new images.
2. Run `db:migrate` (roll-forward only).
3. If the release adds RBAC permissions, run the catalog sync (`db:seed`) and
   flush the Redis RBAC cache.
4. Roll the API, then the SPAs.
5. Verify `/ready` and a smoke path (login → load a module).

### Enable maintenance mode

Use the BCC **Settings → Maintenance** page, or
`POST /api/v1/settings/maintenance {"enabled":true,"title":...,"message":...}`.
Disable with `{"enabled":false}`. `allowAdminBypass` lets administrators through.

### Toggle a feature flag

BCC **Settings → Feature flags**, or
`PATCH /api/v1/settings/feature-toggles/:id {"enabled":true|false}`.

### Process the notification queue

Delivery is idempotent with retry + dead-letter. Trigger a run with
`POST /api/v1/notifications/process` (requires `notification.queue.manage`), or
wire the notification scheduler to your job runner. Inspect queue counts via
`GET /api/v1/notifications/queue`.

### Run scheduled reports / exports

`POST /api/v1/reports/schedule` creates schedules; the report scheduler drains
due schedules and pending export jobs idempotently.

## Incident playbooks

### API returns 503 on `/ready`

1. Check `/health` for which dependency is `down`.
2. **Database down** — verify PostgreSQL, connection string, and pool
   saturation; check `doctor.sh`.
3. **Redis down** — verify Redis and `REDIS_PASSWORD`. RBAC resolution degrades
   without Redis; restore it promptly.

### Elevated 429s (rate limited)

Rate limiting is per-window (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW`). Adjust the
limits, or move to a Redis-backed store for multi-instance fairness (see
[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)).

### Suspected unauthorized access

1. Query `audit_logs` filtered by `user_id` / `correlation_id`.
2. Revoke sessions (refresh tokens are rotated and hashed; deleting the session
   invalidates the chain).
3. Review `login_history` for the lockout signal.

## Scaling notes

- The API is stateless — scale replicas horizontally.
- Postgres is the bottleneck for write-heavy ledger operations; scale vertically
  and use read replicas for reporting if needed.
- The in-process settings cache is per-instance; it invalidates on write within
  an instance. For strict cross-instance consistency, front settings reads with
  a shared cache (future enhancement).
