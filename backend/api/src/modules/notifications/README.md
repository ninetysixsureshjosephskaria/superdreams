# Notification Center Module

A centralized notification system for the whole platform: reusable versioned
templates, a provider-based delivery pipeline, an idempotent queue with retry +
dead-letter, a delivery state machine, an immutable lifecycle log, a member
inbox, and per-user preferences. Notifications are **consumers** of the other
modules' domain events.

> Phase 17. Reuses the platform foundations (BaseRepository, pagination helpers,
> `audit_logs`, RBAC, Authentication). No external providers are integrated
> (out of scope) — email/sms/push use mock providers. No architectural changes.

## Data model

| Table                        | Purpose                                               |
| ---------------------------- | ----------------------------------------------------- |
| `notification_channels`      | Seeded lookup of channels (in-app/email/sms/push).    |
| `notification_groups`        | Seeded lookup grouping notifications into categories. |
| `notification_templates`     | Reusable, versioned templates with variables.         |
| `notification_preferences`   | Per-user, per-channel (optionally per-group) opt-in.  |
| `notifications`              | Notification records + the member inbox row (IN_APP). |
| `notification_queue`         | Idempotent delivery queue (retry + dead-letter).      |
| `notification_deliveries`    | Append-only per-attempt delivery results.             |
| `notification_logs`          | Append-only, **immutable** lifecycle history.         |
| `notification_events`        | Event-type → template mapping (consumer config).      |
| `notification_subscriptions` | Per-user group opt-in subscriptions.                  |

## Delivery state machine

`domain/state-machine.ts`:

```
DRAFT ─▶ QUEUED ─▶ SENDING ─▶ SENT ─▶ DELIVERED
           │          │         │
           │          └─▶ FAILED ◀┘ ─▶ QUEUED (retry) / CANCELLED
           └─▶ CANCELLED
```

`read`/`archive` are orthogonal inbox flags (`readAt`/`archivedAt`), not part of
this machine. Illegal transitions are rejected.

## Queue architecture

Sending/scheduling creates a notification (`QUEUED`) plus one `notification_queue`
row (`PENDING`, `scheduled_at`). `processQueue(asOf, limit)` — exposed as
`POST /notifications/process` and via `createNotificationScheduler().run()` for
the job infrastructure — selects due `PENDING` items and, for each, performs an
**atomic claim** (`UPDATE … SET status='PROCESSING' WHERE status='PENDING'`) so
processing is idempotent and concurrency-safe (a lost claim is skipped). It then
invokes the channel provider:

- **success** → `SENT`/`DELIVERED`, queue `SENT`, a delivery row + log.
- **failure with attempts remaining** → requeue (`PENDING`, backoff `next_attempt_at`).
- **failure at max attempts** → **dead-letter** (queue `DEAD`, notification `FAILED`).

`POST /notifications/:id/retry` resets a `FAILED` notification to `QUEUED`;
`POST /notifications/:id/cancel` cancels a `DRAFT`/`QUEUED` one.

## Provider architecture

`providers/index.ts` defines `NotificationProvider { channel; name; send() }`.
A `ProviderRegistry` resolves a provider per channel. The default registry wires
the **real** `InAppProvider` (the notification row _is_ the inbox → delivered
immediately) and **mock** email/sms/push providers (accept + return SENT with a
synthetic id — no external calls). Swapping in a real provider requires only
registering a new implementation; the queue/service are untouched.

## Template rendering strategy

`templates/render.ts` performs **safe `{{variable}}` substitution only** — no
scripting language, no code execution. Declared variables are auto-extracted
from subject + body; `POST /notification-templates/:id/preview` renders with
supplied values and reports missing variables. Templates carry a `revision`
(bumped on content change), `locale` (localization-ready), and an
`ACTIVE`/`INACTIVE`/`DRAFT` status.

## User preference strategy

`notification_preferences` are per `(user, channel[, group])`. A group-specific
preference wins over the channel-level default; absence means enabled. On
send/schedule, a recipient who has disabled the channel/group has the
notification **suppressed** (`CANCELLED`, logged) rather than delivered.

## Event integration (consumers)

`notification_events` maps a domain event type (e.g. `RewardAllocated`) to a
template + channel. `NotificationService.handleEvent(eventType, recipient,
variables, actor)` looks up the mapping and creates+sends a notification — a
public seam other modules call without duplicating business logic. Module event
buses are not rewired (that would be an architectural change); this consumer API
is the integration point.

## API

Base path `/api/v1`. Admin routes require an RBAC permission; `/notifications/me*`
and preference/read/archive routes are auth-only (ownership enforced).

| Method   | Path                                                                 | Permission                                           |
| -------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| GET/POST | `/notification-templates`                                            | `notification.read` / `notification.template.create` |
| GET/PUT  | `/notification-templates/:id`                                        | `notification.read` / `notification.template.update` |
| POST     | `/notification-templates/:id/preview`                                | `notification.read`                                  |
| GET      | `/notifications`                                                     | `notification.read`                                  |
| POST     | `/notifications` · `/notifications/send` · `/notifications/schedule` | `notification.send`                                  |
| POST     | `/notifications/process` · `/:id/retry` · `/:id/cancel`              | `notification.queue.manage`                          |
| GET      | `/notifications/queue` · `/:id` · `/:id/deliveries` · `/:id/logs`    | `notification.read`                                  |
| GET      | `/notifications/me` · `/me/unread-count`                             | auth only                                            |
| PATCH    | `/notifications/:id/read` · `/unread` · `/archive`                   | auth only (owner)                                    |
| GET/PUT  | `/notifications/preferences`                                         | auth only                                            |

## Events

`NotificationCreated`, `NotificationQueued`, `NotificationSent`,
`NotificationDelivered`, `NotificationFailed`, `NotificationRead`,
`NotificationArchived`, `PreferenceUpdated` — in-process, typed.

## Audit integration

Template changes, manual sends, preference updates, queue actions (retry/cancel)
write to the shared append-only `audit_logs` table; every lifecycle step is also
recorded in the immutable `notification_logs`.

## Extension guide

- **New channel/provider** — implement `NotificationProvider`, register it.
- **New event trigger** — add a `notification_events` row (eventType → template).
- **Real delivery confirmation** — providers can later report `DELIVERED`
  asynchronously (webhook) transitioning `SENT → DELIVERED`.
- **Scheduled processing** — wire `createNotificationScheduler().run()` into the
  job scheduler.
