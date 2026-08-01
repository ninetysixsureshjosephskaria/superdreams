# Performance Baseline — Super Dreams Platform

This document records the performance characteristics and design decisions that
govern platform performance for v1.0.0. It is a baseline for future tuning, not
a load-test report.

## Design-level performance controls

### Database

- **Indexes** on every foreign key and on the columns used by list/search/filter
  and range queries (status, created_at, category, owner, etc.). See each
  module's schema in `backend/api/src/database/schema/`.
- **Balance projections** (`wallet_balances`, `member_rewards`) are read directly
  for balances instead of folding append-only ledgers on every read.
- **Row-level locking** (`FOR UPDATE`) guards balance mutations against races
  while keeping transactions short.
- **Offset pagination** with bounded page sizes (max 100) on all list endpoints.
- **Aggregations** for reports are pushed into SQL (grouped counts/sums), not
  computed in application code.

### Caching

- **RBAC** permission resolution is cached in Redis and invalidated on changes.
- **Settings** are cached in-process and invalidated on every write.

### API

- Per-window **rate limiting** protects against bursts.
- Responses are lean DTOs (secret fields redacted; no over-fetching).
- Background-style work (notification delivery, report exports/schedules) is
  **idempotent** and drained by schedulers rather than blocking requests.

### Frontend

- **Route-level code splitting** — every page is lazy-loaded (`React.lazy`).
- **TanStack Query** caches server state, dedupes requests, and uses
  `keepPreviousData` for smooth pagination.
- Shared UI comes from `@superdreams/ui` (no duplicated component code).
- Production builds are minified and tree-shaken by Vite.

## Suggested SLO targets (to validate under load)

| Metric | Target |
| ------ | ------ |
| API read (p95) | < 150 ms |
| API write (p95) | < 300 ms |
| `/ready` probe | < 50 ms |
| SPA first contentful paint | < 2 s on broadband |

## How to establish real baselines

1. Seed a representative dataset (scale the demo seed).
2. Load-test key endpoints (`k6`/`autocannon`): login, member list, wallet
   credit/debit, report run, settings read.
3. Capture p50/p95/p99 latency and throughput; record DB CPU and connection
   pool usage.
4. Measure SPA bundle sizes (`vite build` output) and Lighthouse scores.
5. Record results here per release to track regressions.

## Tuning levers

- PostgreSQL connection pool size and instance sizing.
- Redis-backed rate limiting for multi-instance fairness.
- Read replicas for report-heavy workloads.
- CDN + long-cache headers for the static SPA assets.
