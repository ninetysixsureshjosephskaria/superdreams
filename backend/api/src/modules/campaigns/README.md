# Campaign Management Module

Manages promotional, reward, referral, seasonal and engagement campaigns:
audience targeting, eligibility rules, reward mapping, scheduling, member
enrollment, and execution that issues rewards through the Rewards module. Every
mutation is audited and recorded in the campaign history.

> Phase 16. Reuses the platform foundations (BaseRepository, pagination helpers,
> `audit_logs`, RBAC, Authentication) and the **Rewards module's public service**
> for reward issuance — never touching reward tables directly. No platform
> architecture changes.

## Data model

| Table                    | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `campaigns`              | Campaign aggregate root (code, type, status, audience, dates). |
| `campaign_types`         | Seeded lookup of campaign types.                               |
| `campaign_rules`         | Eligibility rules (AND-combined).                              |
| `campaign_segments`      | Named audience segment definitions (extension point).          |
| `campaign_targets`       | Explicit member targets (MANUAL audience).                     |
| `campaign_rewards`       | Reward mapping issued on execution (→ a reward program).       |
| `campaign_schedules`     | Scheduling configuration (immediate/scheduled/recurring).      |
| `campaign_executions`    | Append-only log of execution runs.                             |
| `campaign_member_status` | Per-member participation (enrollment) status.                  |
| `campaign_history`       | Append-only campaign activity feed.                            |

## Campaign lifecycle

The DNA state machine (`domain/campaign.ts` → `CAMPAIGN_TRANSITIONS`):

```
DRAFT ──▶ SCHEDULED ──▶ ACTIVE ⇄ PAUSED
  │           │            │        │
  │           │            └──▶ COMPLETED ──▶ ARCHIVED
  └───────────┴──────────── ARCHIVED
```

`PATCH /:id/status` enforces the machine; illegal transitions are rejected.
Enrollment and execution require an **ACTIVE** campaign.

## Scheduling architecture

`POST /:id/schedule` upserts a `campaign_schedules` row (IMMEDIATE / SCHEDULED /
RECURRING). A future-dated schedule moves a DRAFT campaign to SCHEDULED. The
`campaign_schedules.next_run_at` + `createCampaignScheduler().runCampaign()`
hook integrate with the platform job/scheduler infrastructure; the same
execution path backs the on-demand `POST /:id/execute`.

## Targeting strategy

`audience_type` selects how members are reached:

- `ALL_MEMBERS` — open; members self-enroll from the portal (subject to rules).
- `MANUAL` — only admin-added `campaign_targets` (auto-enrolled); not
  self-joinable.
- `STATUS` / `JOIN_DATE` / `SEGMENT` — combined with eligibility rules.

## Eligibility strategy

`campaign_rules` are AND-combined and evaluated by pure domain logic
(`evaluateEligibility`) against member facts (status, join date):

- `MEMBER_STATUS` — the member's status must equal the value.
- `JOIN_DATE_AFTER` / `JOIN_DATE_BEFORE` — join-date bounds.
- `REWARD_ELIGIBILITY` / `SEGMENT` — reserved extension points (satisfied by
  default; no business rule invented).

Eligibility is checked on self-enrollment and surfaced to the portal.

## Reward integration

Execution issues the campaign's mapped reward to each **ENROLLED** member by
calling the **Rewards module's public `allocate` service** through a
`RewardBridge` adapter (wired in the module composition). The campaigns module
never reads or writes reward tables directly, and reward logic is not
duplicated. The resulting reward-ledger transaction id is stored on the member's
`campaign_member_status` row. Wallet adjustments are out of scope this phase
(the DNA marks them "where approved" and defines no rule).

Execution is idempotent per member (a REWARDED member is skipped) and records a
`campaign_executions` row with counts. It runs sequentially and is not designed
for concurrent invocation (documented; a future distributed lock would harden
it).

## API

Base path `/api/v1/campaigns`. All routes require JWT auth; admin routes also
require an RBAC permission. `/me*` routes are ownership-scoped.

| Method | Path                                                  | Permission          |
| ------ | ----------------------------------------------------- | ------------------- |
| GET    | `/`                                                   | `campaign.read`     |
| POST   | `/`                                                   | `campaign.create`   |
| GET    | `/:id`                                                | `campaign.read`     |
| PUT    | `/:id`                                                | `campaign.update`   |
| PATCH  | `/:id/status`                                         | `campaign.status`   |
| POST   | `/:id/schedule`                                       | `campaign.schedule` |
| POST   | `/:id/targets`                                        | `campaign.update`   |
| POST   | `/:id/execute`                                        | `campaign.execute`  |
| GET    | `/:id/history`, `/:id/executions`, `/:id/enrollments` | `campaign.read`     |
| GET    | `/member/:memberId`                                   | `campaign.read`     |
| POST   | `/:id/enroll`                                         | auth only (owner)   |
| GET    | `/me`, `/me/available`                                | auth only (owner)   |

## Events

`CampaignCreated`, `CampaignUpdated`, `CampaignStatusChanged`,
`CampaignActivated`, `CampaignPaused`, `CampaignCompleted`, `CampaignScheduled`,
`CampaignExecuted`, `CampaignRewardIssued`, `CampaignEnrolled` — in-process,
typed (`events/index.ts`).

## Audit integration

Every campaign mutation (create/update/status/schedule/targets/execute) writes
to the shared append-only `audit_logs` table (entity type `campaign`).

## Extension points

- **New campaign types** — extend `campaign_type` + the seeded lookup.
- **New eligibility rules** — extend `campaign_rule_type` + `evaluateEligibility`.
- **Segments** — `campaign_segments.definition` (jsonb) is reserved for a future
  segment engine.
- **Recurring schedules** — wire `runCampaign()` into the job scheduler using
  `next_run_at` + `recurrence_cron`.
- **Wallet payouts** — add a wallet bridge alongside the reward bridge when a
  business rule for money payouts is approved.
