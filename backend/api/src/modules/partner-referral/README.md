# Partner Referral (P3)

The **partner points-referral earning engine**. When a member earns qualifying
reward points (**Games** and **Campaigns** only), their **direct active Partner**
earns a configurable share of those points — credited into the existing rewards
ledger, **inside the same transaction** that finalizes the member's earning, at
most once per source transaction, and fully reversible.

Points-only. This module **never** touches money / wallet / commission, and it is
**single-level** — it credits the immediate `partnerId` only, never any upline
beyond it.

## Locked rules (P3)

| Rule                                                                        | Where enforced                                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Qualifying sources = Games + Campaigns only; admin `allocate` excluded      | the caller wires `creditWithin` into those two paths (Milestone 4); this module never hooks `allocate()` |
| Default rate 500 bps (5%), globally configurable                            | `ReferralRateProviderPort` (Settings-backed) + `DEFAULT_PARTNER_REFERRAL_RATE_BPS`                       |
| `floor(sourcePoints × rateBps / 10000)`                                     | `computePartnerPoints`                                                                                   |
| Zero result ⇒ no reward, no row                                             | `creditWithin` returns `null` when points ≤ 0                                                            |
| Direct active Partner only                                                  | `resolveEarner` (partnerId + ACTIVE + not deleted + holds `partner` role)                                |
| Partner credited in the points ledger                                       | `RewardCreditPort.awardPointsWithin` (rewards seam)                                                      |
| One referral per source transaction                                         | `partner_referral_earnings.UNIQUE(source_transaction_id)`                                                |
| Same-transaction atomicity                                                  | `creditWithin(tx, …)` runs in the caller's earning transaction                                           |
| Exact reversal                                                              | `onSourceReversed(tx, …)` claws back the partner's EARN via `RewardReversePort.reverseWithin`            |
| B3 — no negative/debt: insufficient partner points fails the whole reversal | `reverseWithin` throws `BusinessRuleError` → the enclosing (source-reversal) transaction rolls back      |

## Surface

- `resolveEarner(earnerMemberId)` → `ResolvedPartner | null` — **pre-transaction**
  read (partner identity + rate). All reads happen here so the earning transaction
  performs writes only (avoids the single-connection deadlock).
- `creditWithin(tx, { resolved, sourceTransactionId, earnerMemberId, sourcePoints, actor })`
  → records the partner's referral EARN + linkage + audit, in `tx`.
- `onSourceReversed(tx, sourceTransactionId, actor)` — implements the Rewards
  `PartnerReferralReversalPort`; claws back the referral in the source-reversal `tx`.

## Ports (satisfied by application wiring)

`RewardCreditPort` (rewards `awardPointsWithin`), `RewardReversePort` (rewards
`reverseWithin`), `PartnerRoleCheckerPort` (RBAC `partner` role), and
`ReferralRateProviderPort` (Settings key `rewards.partner_referral_rate_bps`,
default 500).

Events (`PartnerReferralEarned` / `PartnerReferralReversed`) are informational and
have no required subscribers; emission, if any, is a post-commit responsibility of
the wiring layer.

> Not yet wired into Games/Campaigns/Rewards — that is Milestone 4.
