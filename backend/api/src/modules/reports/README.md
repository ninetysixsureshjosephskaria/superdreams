# Reports & Analytics Module

A **read-only** reporting and analytics layer over the platform's business
modules (Members, Wallet, Rewards, Campaigns, Notifications, Audit). It
consolidates data into operational, financial and engagement reports,
dashboards, exports and scheduled runs — without ever writing to, or duplicating
the business logic of, any other module.

## Core principle: read-only, no duplicated logic

- The **only** place this module reads operational data is
  [`ReportSourceRepository`](repositories/source.repository.ts), and it never
  writes there.
- For values another module _derives_ and maintains (wallet available/held
  balances, reward point balances) the source repository reads that module's
  **projection tables** (`wallet_balances`, `member_rewards`) rather than
  re-folding ledgers — so no calculation owned by another module is duplicated.
- Everything else is plain aggregate counting/summing that no single module owns
  (members by status, notifications by channel, audit events by module/action).
- This module's own tables store **metadata only**: definitions, saved reports,
  exports, schedules, execution history, dashboards, filters and favorites.

## Reporting architecture

Reports are a **generator registry** ([`generators/`](generators/index.ts)). A
generator is keyed by a report code, takes normalized filters, and returns
tabular output (`columns`, `rows`, `summary`). Adding a report is:

1. Register a generator in `REPORT_GENERATORS`.
2. Seed a matching `report_definitions` row (migration `0009`).

The framework (service, routes, exports, scheduling) does **not** change — this
satisfies "add new reports without modifying the reporting framework".

Built-in reports: `MEMBERS_SUMMARY`, `WALLET_SUMMARY`, `REWARDS_SUMMARY`,
`CAMPAIGNS_SUMMARY`, `NOTIFICATIONS_SUMMARY`, `AUDIT_ACTIVITY`, `USER_ACTIVITY`.

## Dashboard architecture

`GET /dashboards` returns live KPI cards (computed by the source repository),
the seeded widget catalog (`dashboard_widgets`), the caller's saved layout
(`dashboard_layouts`, defaulting to widget order) and a recent-activity feed
(from the audit log). Layout is configurable per user via `PUT /dashboards/layout`.
Chart widgets are **data providers only** — the module never renders charts.

## Export process

`report_exports` are jobs with the platform job-status lifecycle. `POST
/reports/exports` creates a job and generates it (small runs inline); the
scheduler drains any `PENDING` jobs for large/scheduled runs. Content is stored
inline and served by `GET /reports/exports/:id/download`.

Exporters ([`exporters/`](exporters/index.ts)) are a pluggable registry. **CSV**
is fully rendered natively (RFC 4180). **XLSX/PDF** are seams: a real binary
renderer can be registered without touching callers; the default renders
spreadsheet-openable / plain-text content so a job always completes. No heavy
export dependency is introduced this phase.

## Scheduling

`report_schedules` support `DAILY`/`WEEKLY`/`MONTHLY` (next-run computed
natively) and `CUSTOM` cron (validated on write; advancing delegated to the
platform scheduler — see [`domain/cadence.ts`](domain/cadence.ts)). The
[scheduler](schedulers/report.scheduler.ts) runs due schedules (producing an
export each) and drains pending export jobs — idempotent per run window.

## Security & ownership

- Every admin endpoint is guarded by an existing RBAC permission —
  `report.read`, `report.export`, `report.schedule` (catalog-defined, no
  hardcoded role checks).
- Member-portal endpoints (`/reports/me/*`) are auth-only and resolve the
  caller's **own** member profile; a caller with no linked member is rejected.
- Saved reports, filters, favorites and dashboard layouts are scoped to the
  authenticated user.

## Audit

Report execution, export generation, dashboard updates and schedule changes are
written to the shared `audit_logs` table (`module = 'reports'`).

## Extension guide

- **New report**: add a generator + seed a definition row (+ optional category).
- **New export format**: implement `ReportExporter` and register it.
- **New KPI/widget**: add a source aggregate + seed a `dashboard_widgets` row.
- **New source**: add a read-only method to `ReportSourceRepository` (reading
  projections, never recomputing another module's business logic).
