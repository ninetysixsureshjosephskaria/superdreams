# Settings & Administration Module

The central configuration hub for the platform. It lets administrators configure
platform behavior without code changes. It owns **configuration only** — never
business logic — and other modules read configuration through this module's
service (`getValue` / `isFeatureEnabled`).

## Configuration architecture

Per-domain settings (general, branding, localization, security, email, sms,
notifications, wallet, rewards, campaigns, reports, api, integrations, backup,
audit) are stored as **typed key-value entries** in `system_settings`, grouped
by `setting_categories`. This is a deliberate normalization: one
`BaseRepository`, one validation path, one cache — rather than a sparse table per
domain. Structured concerns get dedicated tables: `feature_toggles` and
`maintenance_windows`.

Every setting is:

- **Database-backed** — the authoritative value lives in `system_settings`.
- **Cached** — see the cache strategy below.
- **Versioned** — the row's `version` bumps on each change; the full trail is in
  `setting_history` (old value, new value, version, actor).
- **Audited** — every change writes to the shared `audit_logs` (`module = 'settings'`).
- **Validated** — by `valueType` plus registry constraints (SELECT options,
  numeric bounds). See [`registry.ts`](registry.ts) and
  [`validators/index.ts`](validators/index.ts).

No business configuration is hardcoded: defaults are seeded into
`system_settings` (migration `0010`), and the registry supplies validation
metadata only.

## Cache strategy

[`SettingsCache`](cache.ts) is an in-process key→value cache. The full (small)
setting set is loaded once and served from memory; **every write invalidates the
cache** so the next read reloads. This keeps reads fast while guaranteeing writes
take effect immediately. No external cache is introduced (no new Redis pattern);
a shared cache could replace the class in a multi-instance deployment without
changing callers.

## Versioning strategy

Each `system_settings` row carries a `version` counter (bumped by
`BaseRepository.update`). On every value change the service appends a
`setting_history` row capturing the previous and new value, the resulting
version and the actor. `GET /settings/history` returns the paginated trail.

## Validation strategy

Requests are validated at the boundary with Zod, then each value is validated by
`assertValidValue(key, valueType, value)`:

- STRING/COLOR (hex), NUMBER (with per-key bounds), BOOLEAN, SELECT (against
  registry options), ARRAY (of strings), JSON (object).

## Feature toggle strategy

`feature_toggles` hold a master `enabled` switch plus an optional `strategy`
JSON for future rollout/targeting hooks (environment overrides, user/role
targeting, percentage). Evaluation is a consumer concern; the module stores the
definition and exposes `isFeatureEnabled(key)`.

## Maintenance mode

`maintenance_windows` store the message and optional schedule. Enabling creates a
single active window (deactivating any prior one); disabling deactivates the
active window. `allowAdminBypass` lets privileged users through. Enforcement is a
consumer concern; this module stores configuration and status only, surfaced via
`GET /settings/maintenance` and the public banner.

## Branding system

Branding values (`branding.*`) are regular settings flagged `isPublic`.
`GET/PUT /settings/branding` are conveniences over the generic settings API. The
public read (`GET /settings/public`) exposes non-secret public settings (branding,
localization, maintenance banner) for clients to render.

## RBAC

- `settings.read` — view settings, categories, history, branding, toggles,
  maintenance status.
- `settings.update` — update settings and branding.
- `settings.feature.manage` — create/toggle feature flags.
- `settings.maintenance.manage` — enable/disable/schedule maintenance.
- `GET /settings/public` is auth-only (any authenticated user) and returns only
  non-secret, public-flagged values. Members never access administrative settings.

Secret values (`isSecret`) are redacted from all reads (`value: null`,
`hasValue` indicates presence); they are write-only.

## Extension guide

- **New setting**: seed a `system_settings` row (+ optional registry
  options/bounds). It appears automatically in its category.
- **New category**: seed a `setting_categories` row; the dashboard renders it.
- **New feature flag**: seed or `POST /settings/feature-toggles`.
- **Consuming config**: inject `SettingsService` and call `getValue(key)` /
  `isFeatureEnabled(key)` — never read the tables directly.
