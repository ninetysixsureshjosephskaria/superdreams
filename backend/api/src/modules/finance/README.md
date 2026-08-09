# Finance module (Phase 2B)

Real-money deposits & withdrawals for the **FINANCIAL** wallet economy. Members
submit requests; admins action a queue; money moves only on approval — atomically
through the wallet ledger.

## Money model

- Amounts are stored as integer **USD minor units (cents)** in `bigint`, matching
  the wallet ledger. Never floating point.
- The **unit economy** is `1 unit = $30` (`UNIT_VALUE_USD_CENTS = 3000`, reference-
  defined; see [`../wallet/units.ts`](../wallet/units.ts)). Requests are denominated
  in whole units; `amount_cents = units * 3000` is the canonical value and `units`
  is mirrored for convenience.

## Tables (migration `0014_finance_requests_tranches`)

| Table                | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------ |
| `financial_requests` | Deposit/withdrawal intent + admin action-queue row.                |
| `deposit_tranches`   | Locked capital created when a deposit is approved (30-day lock).    |

Enums: `financial_request_type` (DEPOSIT/WITHDRAW), `financial_request_status`
(PENDING/HOLD/APPROVED/REJECTED — the last two terminal), `deposit_tranche_status`
(LOCKED/MATURED/UNLOCKED/LIQUIDATED).

## Money movement (rules 3 & 14)

Approval runs in a single DB transaction via the wallet module's `*Within(tx, …)`
compose seam — **no duplicate wallet system is created** (rule 3):

- **Deposit approved** → ensure the member's ACTIVE FINANCIAL wallet exists →
  `wallet.creditWithin(tx, …)` + create a `deposit_tranches` row (30-day lock) →
  mark request APPROVED → audit — all atomic.
- **Withdrawal approved** → `wallet.debitWithin(tx, …)` (balance sufficiency
  enforced by the ledger) → mark APPROVED → audit — all atomic.
- **Reject / hold** → status change + audit only; no money moves.

A decided request is terminal ("locked once submitted"); re-deciding throws
`ConflictError`. Concurrent approvals are serialised by a `SELECT … FOR UPDATE`
lock on the request row.

## Authorization (rules 4 & 13)

Reuses RBAC. Permissions (in `modules/rbac/catalog.ts`):

- `finance.read` — view the queue, requests and tranches.
- `deposits.approve` — approve/hold/reject **deposit** requests.
- `withdrawals.approve` — approve/hold/reject **withdrawal** requests.

The approve/reject/hold routes require *at least one* approval permission; the
service then refines to the **type-specific** permission via the
`FinanceAuthorizationPort` (an adapter over `AuthorizationService.hasPermission`).
Member self-service routes are authenticated only — the member id is resolved from
the caller's account. Granted to the `admin` role; `super-admin` has all.

## Routes (`/api/v1/finance`)

Member: `POST /deposits`, `POST /withdrawals`, `GET /me/requests`, `GET /me/tranches`.
Admin: `GET /requests` (queue, filter by type/status/member), `GET /requests/:id`,
`POST /requests/:id/{approve,reject,hold}`.

## Events & audit

In-process `FinanceEventBus` publishes `FinancialRequestSubmitted`,
`DepositApproved`, `WithdrawalApproved`, `FinancialRequestRejected`,
`FinancialRequestHeld` (notification wiring lands in a later 2 subsection). Every
state change writes to the shared `audit_logs` table inside the same transaction.

## Unresolved / deferred to later Phase 2 subsections

- **Deposit / activation bonus** — `deposit_tranches.bonus_bps/bonus_cents` exist
  but default to 0; the bonus rule is computed in **2E**.
- **Daily profit & maturity/early-unlock lifecycle** (5% early-unlock fee is
  reference-defined) — tranche lifecycle transitions land in later subsections.
- **Action-queue assignment** — the reference does not define per-admin routing, so
  there is **no auto-assignment**: any admin with the relevant permission can action
  a request (flagged unresolved).
