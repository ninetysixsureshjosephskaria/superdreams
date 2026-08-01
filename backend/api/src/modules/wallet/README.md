# Wallet Management Module

Manages member wallets: balances, an append-only transaction ledger, holds,
manual adjustments, statements and lifecycle. Every balance-changing operation
is atomic, concurrency-safe and audited.

> Phase 14. Reuses the platform foundations (BaseRepository, pagination helpers,
> `audit_logs`, RBAC, Authentication) and never modifies platform architecture.

## Data model

| Table                      | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `wallets`                  | Wallet aggregate root, linked 1:1 to a member.                      |
| `wallet_balances`          | 1:1 balance **projection** (available / held / total, minor units). |
| `wallet_transactions`      | **Append-only ledger** — the source of truth.                       |
| `wallet_transaction_types` | Seeded lookup describing each transaction type.                     |
| `wallet_adjustments`       | Manual admin adjustments, linked to their ledger entry.             |
| `wallet_holds`             | Funds holds (available → held), with release tracking.              |
| `wallet_statements`        | Generated period statements.                                        |
| `wallet_limits`            | Per-wallet balance floor and limits governing balance rules.        |

Money is stored as **integer minor units** (`bigint`, e.g. cents) — never
floating point (see `docs/dna/05-database.md`). Every money-bearing row records
`currency_code`.

## Balance model

- **Available** — spendable balance.
- **Held** — reserved by active holds (not spendable, still owned).
- **Total** — `available + held`.

A hold moves funds `available → held` (total unchanged); a release moves them
back. Credits/debits/adjustments move `available` only.

## Ledger strategy

The ledger is **append-only**: entries are never deleted and their financial
fields (type, direction, amount) are never rewritten. Each entry snapshots the
available/held balance immediately after it was applied.

Balances are **derived from the ledger**: every transaction type maps
deterministically to a signed delta (`domain/balance.ts`), so the balance can
always be recomputed by folding the ledger. The `wallet_balances` row is a
**projection** of that fold, updated inside the _same_ database transaction as
each ledger append. `GET /wallets/:id/balance/validate` recomputes from the
ledger and asserts it equals the projection (ledger-integrity / daily balance
validation).

Reversals append a compensating `REVERSAL` entry (`reversal_of_id` → original)
and flag the original's `status` as `REVERSED` for traceability — the original's
monetary fields stay immutable; the compensating entry carries the balance
effect.

## Concurrency & atomicity

Every balance change runs in a database transaction that locks the wallet and
its balance row `FOR UPDATE`, serialising concurrent operations on the same
wallet and preventing lost updates / negative-balance races. The `version`
column on `wallet_balances` provides optimistic-lock metadata. Ledger append +
projection update + audit write all commit together or roll back together.

## Balance rules

Enforced in the service against `wallet_limits`:

- Available balance may not fall below `min_balance_minor` (default `0` — no
  negative balances) unless `allow_negative` is set.
- Held balance may never be negative (cannot release more than is held).
- `single_transaction_limit_minor` and `max_balance_minor` are enforced when set.

## Wallet lifecycle

```
PENDING ──activate──▶ ACTIVE ──suspend──▶ SUSPENDED
   │                    │                     │
   └────────close───────┴─────────────────────┴──▶ CLOSED (terminal)
```

Credit / debit / hold require an **ACTIVE** wallet. Adjustments are allowed on
any non-closed wallet. A wallet cannot be closed while it holds funds.

## Transaction lifecycle

`CREDIT`, `DEBIT`, `ADJUSTMENT`, `HOLD`, `RELEASE`, `REVERSAL` — each appended as
a `POSTED` ledger entry with a unique `reference`. An entry becomes `REVERSED`
only when a compensating reversal is posted.

## API

Base path `/api/v1/wallets`. All routes require JWT auth; admin routes also
require an RBAC permission. `/me*` routes are ownership-scoped (a member may only
access their own wallet).

| Method | Path                                                                    | Permission         |
| ------ | ----------------------------------------------------------------------- | ------------------ |
| GET    | `/`                                                                     | `wallet.read`      |
| POST   | `/`                                                                     | `wallet.create`    |
| GET    | `/:id`                                                                  | `wallet.read`      |
| GET    | `/:id/balance`                                                          | `wallet.read`      |
| GET    | `/:id/balance/validate`                                                 | `wallet.read`      |
| GET    | `/:id/transactions`                                                     | `wallet.read`      |
| GET    | `/:id/holds`                                                            | `wallet.read`      |
| GET    | `/:id/statements`                                                       | `wallet.read`      |
| PATCH  | `/:id/status`                                                           | `wallet.status`    |
| POST   | `/:id/credits`                                                          | `wallet.credit`    |
| POST   | `/:id/debits`                                                           | `wallet.debit`     |
| POST   | `/:id/adjustments`                                                      | `wallet.adjust`    |
| POST   | `/:id/holds`                                                            | `wallet.hold`      |
| DELETE | `/:id/holds/:holdId`                                                    | `wallet.hold`      |
| POST   | `/:id/transactions/:transactionId/reversal`                             | `wallet.adjust`    |
| POST   | `/:id/statements`                                                       | `wallet.statement` |
| GET    | `/me`, `/me/balance`, `/me/transactions`, `/me/statements`, `/me/holds` | auth only (owner)  |

Amounts are sent and returned as `amountMinor` (integer minor units).

## Statement generation

`POST /:id/statements` folds the ledger over `[periodStart, periodEnd]`
(defaults to the last 30 days), computing opening/closing balances, total
credits/debits and a transaction count, and persists a `wallet_statements` row.

## Events

`WalletCreated`, `WalletActivated`, `WalletSuspended`, `WalletClosed`,
`WalletStatusChanged`, `WalletCredited`, `WalletDebited`, `WalletAdjusted`,
`WalletHoldPlaced`, `WalletHoldReleased`, `WalletTransactionReversed`,
`StatementGenerated` — in-process, typed (`events/index.ts`).

## Audit integration

Every balance-changing operation writes to the shared append-only `audit_logs`
table within the same transaction (entity types `wallet`, `wallet_transaction`,
`wallet_hold`, `wallet_statement`). No balance change can occur without an audit
record.

## Extension points

- **Multi-currency / FX** — wallets already carry `currency_code`; add rate
  handling in the service.
- **Async settlement** — the `POSTED`/`REVERSED` statuses and idempotent
  references support a future `PENDING`→`POSTED` flow.
- **Scheduled validation** — `validateBalance` is designed to be run by a daily
  scheduler across all wallets.
- Transaction sources (rewards, campaigns) call `credit`/`debit` on the service
  directly rather than duplicating ledger logic.
