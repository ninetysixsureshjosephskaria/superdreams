# Known Limitations — Super Dreams Platform v1.0.0

These are deliberate, documented boundaries of the v1.0.0 release. **None are
release-blocking.** Each is a clean extension seam, not technical debt.

## Integrations (mocked providers)

- **Email / SMS / Push delivery** use mock providers. The notification pipeline
  (templates, queue, retry, dead-letter, delivery log, preferences) is fully
  real; only the outbound transport is a pluggable mock. Register a real
  provider to go live.
- **Report exports** render **CSV natively (RFC 4180)**. XLSX and PDF are
  accepted formats whose exporters currently emit CSV/plain-text content
  (documented pluggable seam) — a binary renderer can be registered without
  changing callers. No heavy export dependency is bundled.

## Scheduling

- `DAILY` / `WEEKLY` / `MONTHLY` schedules compute their next run natively.
  `CUSTOM` cron expressions are **validated** on write but advanced by a safe
  default; full cron evaluation is delegated to the platform scheduler (seam in
  `modules/reports/domain/cadence.ts`).

## Caching & scaling

- **Rate limiting** uses an in-memory store — correct for a single instance. For
  multi-instance fairness, switch to a Redis-backed store (the Redis client is
  already available).
- The **settings cache** is in-process and invalidates on write within an
  instance. Strict cross-instance consistency would need a shared cache.

## Security scope

- **CSRF** protection relies on HTTP-only, same-site cookie handling plus the
  bearer-token API pattern; there is no separate CSRF token flow. Add one if you
  expose cookie-authenticated state-changing endpoints to browsers cross-site.
- **MFA** is represented as a configurable flag; enrollment/verification flows
  are not implemented.

## Configuration read seam

- The Settings service exposes `getValue()` / `isFeatureEnabled()` as the read
  seam for other modules. Existing modules were **not** retrofitted to read their
  configuration through it in this release (avoided architectural change); they
  continue to use their established config sources. Wiring them through Settings
  is a future, non-breaking enhancement.

## Intentionally out of scope

Per the platform DNA and phase governance, the following are **not** part of
v1.0.0 and were never started: AI/ML features, billing, multi-tenancy, plugin
marketplace, external configuration services, data warehouse / external BI
connectors, and any future business modules.

## Internationalization

- Localization **settings** exist (default language, supported languages,
  timezone, currency, formats) to prepare for i18n, but UI string translation is
  not yet wired. English is the shipped locale.

## Member preferences

- The Member Portal does not expose a standalone settings store; theme is
  client-side and notification preferences live in the Notification Center. This
  matches the DNA (no member-facing admin settings were invented).
