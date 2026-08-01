# Rewards Management Module

Manages reward programs and member reward **points**: an append-only ledger,
earning (accrual), redemption, manual adjustments, reversals, and configurable
expiry. Every points-changing operation is atomic, concurrency-safe and audited.

> Phase 15. Reuses the platform foundations (BaseRepository, pagination helpers,
> `audit_logs`, RBAC, Authentication) and the Wallet module's public API. Never
> modifies platform architecture.

## Data model

| Table                 | Purpose                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `reward_programs`     | Configurable reward program (code, type, status, dates).          |
| `reward_rules`        | Accrual rules attached to a program (FIXED / PERCENTAGE / …).     |
| `reward_types`        | Seeded lookup of reward/rule types.                               |
| `reward_categories`   | Seeded lookup grouping programs.                                  |
| `member_rewards`      | 1:1 **points projection** per member (balance + lifetimes).       |
| `reward_transactions` | **Append-only ledger** — the source of truth.                     |
| `reward_redemptions`  | Redemptions, linked to their ledger entry (+ optional wallet tx). |
| `reward_adjustments`  | Manual admin adjustments, linked to their ledger entry.           |
| `reward_expiry_rules` | Program-scoped expiry policy (FIXED_DATE / ROLLING / NEVER).      |
| `reward_history`      | Append-only member reward activity feed.                          |

Rewards use **integer points** (no currency).

## Reward lifecycle

```
Program:  DRAFT ──activate──▶ ACTIVE ──deactivate──▶ INACTIVE
             │                  │                        │
             └──────── archive ─┴────────────────────────┴──▶ ARCHIVED (terminal)

Points:   EARN ─▶ (balance) ─▶ REDEEM / EXPIRE / ADJUST(DEBIT)
          any EARN/REDEEM/ADJUSTMENT entry can be REVERSED (compensating entry)
```

## Reward engine

Rules are stored as data (`reward_rules`) and evaluated by pure domain logic
(`domain/points.ts` → `computeRulePoints`):

- **FIXED / MANUAL / EVENT / TIER / PROMOTIONAL** — award a flat `points` value.
- **PERCENTAGE** — `floor(baseValue × rateBasisPoints / 10000)`.

`allocate` awards points either explicitly (`points`) or by referencing a
`ruleId` (+ optional `baseValue`). The engine is extensible for future campaigns
without schema changes (add rule types + a branch in `computeRulePoints`).

## Reward ledger strategy

Append-only: entries are never deleted and their point-affecting fields
(type, direction, points) are never rewritten. Each entry snapshots the balance
after it was applied. Reversals append a compensating `REVERSAL` entry
(`reversal_of_id` → original) and flag the original's `status` as `REVERSED` for
traceability — its point fields stay immutable.

## Reward balance strategy

Balances are **derived from the ledger**: each transaction type maps to a signed
points delta (`pointsDelta`), so the balance is always the fold of the ledger.
`member_rewards` is a **projection** of that fold, updated inside the _same_
database transaction as each ledger append, with the row locked `FOR UPDATE`
(concurrency-safe; no lost updates). `validateBalance(memberId)` recomputes from
the ledger and asserts it equals the projection (ledger-integrity check). Points
may never go negative.

## Redemption flow

`POST /rewards/members/:memberId/redeem` validates available balance, appends a
`REDEEM` entry, updates the projection, and records a `reward_redemptions` row —
all atomically. Partial and full redemptions are supported (any `points ≤
balance`). Reversing the redeem transaction marks the redemption `REVERSED`.

### Wallet integration

If `walletCreditMinor` is supplied and a wallet bridge is configured, the
redemption also credits the member's **wallet** (via the Wallet module's public
API) and links the resulting wallet transaction id onto the redemption. The
conversion amount is **caller-specified** — the platform defines no points→money
rate, so none is invented. The reward ledger is the source of truth; the wallet
credit runs after it commits.

## Expiry processing

Each `EARN` lot may carry an `expires_at` (from the program's expiry rule or an
`expiresInDays` override). `processExpirations(asOf)` — exposed as
`POST /rewards/expire` and via `createRewardExpiryScheduler` for the job
infrastructure — finds expired, unprocessed lots per member, posts a single
`EXPIRE` entry capped at the current balance (never negative), and marks the lots
processed (idempotent).

## API

Base path `/api/v1/rewards`. All routes require JWT auth; admin routes also
require an RBAC permission. `/me*` routes are ownership-scoped.

| Method | Path                                        | Permission              |
| ------ | ------------------------------------------- | ----------------------- |
| GET    | `/programs`                                 | `reward.read`           |
| POST   | `/programs`                                 | `reward.program.create` |
| GET    | `/programs/:id`                             | `reward.read`           |
| PUT    | `/programs/:id`                             | `reward.program.update` |
| PATCH  | `/programs/:id/status`                      | `reward.program.status` |
| GET    | `/members/:memberId`                        | `reward.read`           |
| GET    | `/members/:memberId/history`                | `reward.read`           |
| POST   | `/members/:memberId/allocate`               | `reward.allocate`       |
| POST   | `/members/:memberId/redeem`                 | `reward.redeem`         |
| POST   | `/members/:memberId/adjust`                 | `reward.adjust`         |
| POST   | `/members/:memberId/reverse/:transactionId` | `reward.adjust`         |
| GET    | `/transactions`                             | `reward.read`           |
| POST   | `/expire`                                   | `reward.expire`         |
| GET    | `/me`, `/me/history`                        | auth only (owner)       |

## Events

`RewardProgramCreated`, `RewardProgramStatusChanged`, `RewardProgramActivated`,
`RewardProgramDeactivated`, `RewardAllocated`, `RewardAdjusted`, `RewardRedeemed`,
`RewardExpired`, `RewardReversed` — in-process, typed (`events/index.ts`).

## Audit integration

Every points-changing operation and program change writes to the shared
append-only `audit_logs` table within the same transaction (entity types
`reward_program`, `reward_transaction`).

## Extension points

- **Campaigns** (Phase 16) trigger `allocate` on the service — the rule engine
  and ledger stay unchanged.
- **New rule types** — extend `reward_rule_type` + `computeRulePoints`.
- **Scheduled expiry** — wire `createRewardExpiryScheduler().run()` into the job
  scheduler.
- **Per-program balances** — the ledger already carries `program_id`; a
  program-scoped projection can be added without rewriting history.
