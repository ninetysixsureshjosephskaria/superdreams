# FEATURE_IMPLEMENTATION_SPEC.md

**Status:** Analysis only — no application code has been changed.
**Inputs:** `S D Files Updated.zip` → 18 HTML screens, `css/superdreams-base.css`, `SUPER_DREAMS_DNA.md`.
**Method:** every HTML file was read in full (inline CSS + inline JS), then compared against the current Super Dreams codebase (`apps/member`, `apps/bcc`, `backend/api`, `packages/*`).
**Evidence tags used throughout:** **[A]** = explicitly in the HTML/JS, **[B]** = strongly implied by the UI, **[C]** = unknown / requires a product decision.

---

## 0. Executive summary (read this first)

### 0.1 What these files actually are
The 18 HTML files are a **static, mock, mobile-first (max-width 444px) prototype of an ADMIN / super-admin operator console** for a product currently branded **"FXRTC"** (titles/meta still say `fxrtc`; `superdreams-base.css` is the rebrand layer). **[A]**

- **No file contains any real backend call** — no `fetch`, XHR, WebSocket, or `localStorage`. Every list is a hardcoded JS array; every "save/approve/send" only mutates in-memory state and shows a success tick. Several files carry comments like `"demo data (replaced by backend)"`. **[A]**
- **17 of 18 screens are Admin / Super-Admin facing.** Only `splash.html` is neutral. **There are no member-portal screens in this set** — the screens repeatedly say things like *"shows live on the Partner/member dashboard"*, implying member/partner-facing surfaces that were **not** included in the upload. **[A/B]**
- **3 files are empty-body stubs** (title + background only, no content): `announcements.html`, `audit.html`, `reports.html`. They name planned features but contain no design. **[A]**

### 0.2 The domain gap — the single most important finding
The prototype describes a **units-based deposit/earnings platform with an MLM / partner-downline structure**, not the current Super Dreams loyalty app.

| Concept in the HTML | What it means | In current Super Dreams? |
|---|---|---|
| **1 unit = 30 USD** (hardcoded in dashboard, users, profit, queue, limits, currencies) [A] | Units are real money at a fixed rate | **Absent** — SD wallet uses generic points/minor-units, no fixed USD peg |
| **Deposits & withdrawals** with an approval **Action Queue** [A] | Members/partners deposit real money; admins approve payouts | **Absent** — wallet has credit/debit/hold, but no deposit/withdraw *request/approval* concept |
| **Partners with a downline / network tree** [A] | Referral hierarchy; partners earn from members beneath them | **Absent** — only a campaign type enum `REFERRAL` exists |
| **Commission** on member deposits, tiered by network units [A] | Partner earnings | **Absent** |
| **Daily Profit distribution** (scheduled daily % credited to all wallets) [A] | Fixed-return-style daily payouts | **Absent** |
| **Activation Bonus** for recruiting 2 members in 1 day [A] | Recruitment reward | **Absent** |
| **Deposit tranches** with lock periods, bonus %, early-unlock 5% fee [A] | Locked capital | **Absent** |

> **⚠️ Product + compliance decision required (not an engineering choice).** As described, the model — real money at a fixed USD value, a multi-level partner downline that earns commission on recruits' deposits, a recruitment bonus, and a **scheduled fixed daily profit %** credited to all wallets — has the structural hallmarks of a combined **MLM + fixed-return investment program**. That carries significant legal/regulatory exposure (money transmission, KYC/AML, securities/investment-scheme and MLM regulation) that differs entirely from a loyalty/rewards app. **This is flagged, not judged** — but the decision of *whether* and *in what legal framing* to build this must be made by you (and likely legal/compliance) before implementation, and it shapes everything below. See Question Q1.

### 0.3 Naming collisions to resolve up front
- **`onboarding.html` is actually a "Create Admin" screen** (title `Create Admin · fxrtc`), **not** a member onboarding flow. Do not confuse it with the member signup/activation flow already built. **[A]**
- **"Users" (FXRTC)** = admin/partner/member account management ≠ current BCC **"Members"** (loyalty member CRUD). **[A]**
- **"Maintenance", "Settings", "Currencies", "Limits", "Reports", "Audit"** all have partial equivalents already in Super Dreams (see §3) — reuse/extend rather than rebuild.

---

## 1. Global conventions observed across the HTML (shared by all screens)

| Convention | Detail | Tag |
|---|---|---|
| Design system | Single shared `superdreams-base.css`: teal tokens (`--teal`, `--teal-bright`), Inter font, frosted cards, gradient CTA, status pills, bottom sheets, toggle, key/value rows, list rows. Mobile-first, max-width **444px**. | [A] |
| DNA rules | `SUPER_DREAMS_DNA.md`: "Never redesign, reuse before creating, HTML files are canonical, semantic tokens only." Canonical screens named: invite, onboarding, queue, profit. | [A] |
| ID scheme | `FXA…` = Admin, `FXP…` = Partner, `FXM…` = Member, `FXS…` = Super Admin. | [A] |
| Roles | **Super Admin, Admin (scoped), Partner, Member.** Partner = USD wallet; Member = currency-locked wallet. Dual-role supported (a Member can also become a Partner). | [A] |
| Unit economy | **1 unit = 30 USD** (fixed, non-forex). Per-currency "per-unit value" table (e.g. INR 3000, AED 110, PHP 1800). | [A] |
| Transaction taxonomy (ledger types) | **TXN-D** deposit, **TXN-W** withdraw, **TXN-E** early withdraw, **TXN-P** profit, **TXN-C** commission, **TXN-R** referral, **TXN-B** bonus campaign, **TXN-A** activation bonus, **TXN-ADJ** manual adjustment, **TXN-U** capital unlock, **TXN-F** fee, **LOG-** audit entries. | [A] |
| Timezone | Platform is **GST (Asia/Dubai, UTC+4)**; maintenance scheduling stores UTC. | [A] |
| Data reality | 100% mock/in-memory. No persistence, no API. | [A] |

---

## 2. Per-feature specifications

> Each feature below is documented against the 25 requested fields. To stay readable, fields that are genuinely absent are marked "none found". Portal audience, per-feature.

### 2.1 `invite.html` — Invite (issue referral/join links)
1. **Feature:** Invite. 2. **Purpose:** Generate join links/QRs for a new Partner or Member, optionally assign to a specific Admin/Partner; manage existing invites (view/revoke/delete/filter/search). [A]
3. **Portal:** **Admin** (Super-Admin issuer view; default assignee "Super Admin (you)"). [A]
4. **Navigation:** back→`index.html`; in-page "All invites" full-screen panel. [A]
5. **UI sections:** invite-type role cards, assignee selector, generate CTA, result+QR, "Active invites" list, "All invites" panel. [A]
6. **Actions:** `selRole`, `genLink` (8-char code from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, URL `https://app.fxrtc.io/join/<code>`, `PX`/`MX` prefixes), share/copy (`navigator.share`+clipboard), revoke, delete. [A]
7. **Forms:** assignee search, invite search. No name/email fields. [A]
8. **Lists:** invite rows {code, role, assignee, usedBy+UID, expiry, status}; 16 mock invites. [A]
9. **Filters:** role seg (All/Partner/Member), status seg (All/Pending/Used/Expired), text search; sort Newest/oldest (state exists). [A]
10. **Tabs:** segmented controls only. 11. **Modals:** share sheet, invite-detail sheet, confirm sheet, all-invites panel. [A]
12. **Statuses:** Pending, Used, Expired (+CSS for Active, Revoked, Deleted, Shared). [A]
13. **Empty:** "No active invites" / "No invites found". 14. **Loading:** none. [A]
15/16. **Errors/validation:** "Select Partner or Member first"; revoke/delete confirmations. [A]
17. **Interactions:** bundled QR generator (MIT), haptics; all mock. [A]
18. **Data:** invite {code, role, status, assignedAdmin/Partner, usedByUser, expiresAt, createdAt}. [A]
19/20/21. **Member/Admin/shared:** Admin-only issuance; assign partner-invite to an Admin, member-invite to a Partner. Partner invite="USD wallet only", Member invite="currency locked". [A]
22. **API (implied):** `POST /invites`, `GET /invites?role&status`, `POST /invites/{code}/revoke`, `DELETE /invites/{code}`. [B]
23. **DB (implied):** `invite(code, role, status, assigned_admin_id, assigned_partner_id, used_by_user_id, expires_at, created_at)`. [B]
24. **RBAC:** "Send invites" permission (admin). [A]
25. **Notifications:** invite shared manually (no auto-email on this screen). [A]

### 2.2 `network.html` — Network (downline tree)
1. **Network.** 2. **Purpose:** read-only view of every Partner's downline: direct members + full network beneath, per-member detail. [A]
3. **Portal:** **Admin** (network-wide visibility; sheet says "Network view is read-only… managed in Users"). [A]
4. **Nav:** back→`index.html`. 5. **Sections:** overview stats card, referral tree (partner cards → expandable member rows), member detail sheet. [A]
6. **Actions:** expand partner/member, tap member→detail, search-to-focus. [A] 7. **Forms:** one search ("Search Partner or Member · name or UID"). [A]
8. **Lists/tree:** partner card {name, FXP, Direct Members, Total Network}; member row {name, UID, ref last4/direct, units, child count}. 84 mock members, 3 partners. [A]
9. **Filters:** live search grouped Partners/Members. 10/11. **Tabs/modals:** member detail sheet only. [A]
12. **Statuses:** "Partner" pill (live-status CSS unused). 13. **Empty:** "No match". 14/15. **Loading/error:** none. [A]
17. **Interactions:** recursive `downline`, `depthOf`, `pTotal`; all mock. [A]
18. **Data:** member {uid, name, units, deposit, dailyProfit, currency, referredBy(uid), partner(fxp)}. [A]
22. **API (implied):** `GET /network` / `GET /members/{uid}`. [B]
23. **DB (implied):** self-referential `member.referred_by`, `member.partner_id`, locked `currency`, `units`, `deposit`, `daily_profit`. [B]
24. **RBAC:** "Network access" permission (admin/super-admin). [A] 25. **Notifications:** none. [A]

### 2.3 `onboarding.html` — **Create Admin** (⚠ filename ≠ content)
1. **Create Admin.** 2. **Purpose:** Super-admin creates an Admin account (name/email/mobile/nationality), issues a one-time temp password, shares credentials; manage pending admins. [A]
3. **Portal:** **Admin (Super-Admin only).** [A] 4. **Nav:** back→`index.html`; detail sheet links "Open in User management"→`users.html`. [A]
5. **Sections:** admin-details form, "email credentials" toggle, Create CTA, "Inactive Admins" list, 3 sheets. [A]
6/7. **Form fields:** Full name (req), Email (`type=email`, regex + duplicate check), Mobile (country dial-code, 20 countries w/ length rules), Nationality (searchable, 15 options), toggle "Email credentials to admin" (default ON). [A]
8. **List:** inactive/pending admins {name, email, status}. [A] 11. **Modals:** detail, created-credentials (shows temp password once), confirm. [A]
12. **Statuses:** Active, Pending. 13/14. **Empty/loading:** none. [A]
15/16. **Validation:** "This email already has an admin.", "Enter a valid mobile number." (per-country digit length), name/nationality required; focuses first invalid field. [A]
17. **Interactions:** generates `uid=FXA+9 digits`, temp password pattern (e.g. `Abcd-1234-XY9`); all mock. [A]
18. **Data:** admin {name, email UNIQUE, mobile, nationality, uid, role='Admin', permissions='approvals & members' (default), tempPassword one-time, mustResetPassword, status, addedDate}. [A]
19-21. **Behaviour:** Super-Admin only; new admins default to "approvals & members" scope; **first login = set own password + email OTP every login**. [A]
22. **API (implied):** `POST /admins`, `GET /admins?status`, email-uniqueness check, reshare credentials. [B]
23. **DB (implied):** admin account rows (reuse `identity.users` + role), `must_reset_password`, temp-password issuance, OTP. [B]
24. **RBAC:** only Super-Admin creates admins. [A] 25. **Notifications:** temp-password email + **email OTP on every login**. [A]

### 2.4 `splash.html` — Splash
1. **Splash.** 2. **Purpose:** branded loading screen, auto-redirects to `index.html` after 1.7s. [A] 3. **Portal:** neutral/both. [B]
4-25: full-teal branded loader ("System Initializing" + dot animation), one `setTimeout` redirect, no data/forms/API. [A] **Reuse existing `LoadingScreen`/branding — trivial.**

### 2.5 `commission.html` — Commission configuration
1. **Commission.** 2. **Purpose:** configure partner commission on member deposits (TXN-C): default monthly tier table, date-ranged "target" overrides, one-time member-referral rate (TXN-R). [A]
3. **Portal:** **Admin** ("what partners earn… shows live on the Partner dashboard"). [A]
5. **Sections:** "Live right now", commission targets + "New target", default monthly ("Fallback"), member referral ("Always on"). [A]
6. **Actions:** new/edit target, edit default tiers, add tier, save, delete target, toggle "no upper limit", update referral rate. [A]
7. **Forms:** start/end date; tier {from units, to units (or unlimited), commission %}; referral rate %. [A]
8. **Lists:** target rows {date range, N tiers, top %, ends in}; default tiers {range, %}; draft tiers. [A]
9. **Sort:** targets active→upcoming→ended; tiers by `from`. 11. **Modals:** editor sheet, referral sheet. [A]
12. **Statuses:** Active/Upcoming/Ended; Live; Fallback; Always on. 13. **Empty:** "No custom targets", "No tiers yet." [A]
15/16. **Validation (exact):** "Enter a commission between 0 and 100%.", "This range overlaps a tier you already added.", "These dates overlap another target." + more. [A]
17. **Logic:** default tiers 0–300=5%, 301–500=6%, 501+=7%; referral default 2%; overlap/clash checks; matched by "total network units". Mock. [A]
18. **Data:** Tier {icon, from, to|null, pct}; Target {id, start, end, tiers[]}; Referral {rate%}. [A]
22. **API (implied):** `GET/PUT /commission/default`, `CRUD /commission/targets`, `GET/PUT /commission/referral-rate`. [C]
23. **DB (implied):** `commission_default_tier`, `commission_target` + `commission_target_tier`, `commission_referral`. [C]
24. **RBAC:** "Commission rules" permission (admin). [A] 25. **Notifications:** none (propagates to partner dashboard). [B]

### 2.6 `profit.html` — Daily Profit (schedule + distribute)
1. **Daily Profit.** 2. **Purpose:** plan/publish a monthly schedule of daily profit % for Members & Partners, auto-spread to hit a monthly target, distribution time window, per-day tuning, manual "distribute today", history. [A]
3. **Portal:** **Admin/operator** (credits money to all wallets network-wide). [A]
4. **Nav:** back→`index.html`; hidden bottom tab bar (Home/Queue/Users/More); **"More" grid links every admin screen** (queue, users, profit, commission, bonus, actbonus, currencies, limits, maintenance, onboarding, network, announcements, reports, audit, settings); registers `sw.js`. [A]
5. **Sections:** Active Wallets counts, Monthly Schedule (calendar + auto-plan + window), Recent Distribution, full-screen history. [A]
6/7. **Forms:** distribution window (from/to time, default 23:00–23:59), auto-plan Members %/Partners % targets, per-day Members %/Partners % + time, history date-range filter. [A]
8. **Lists:** 7-col calendar (per-day %/off/lock), history rows {date, time, Auto/Manual, Members {%, $, wallets}, Partners {%, $, wallets}, Total {$, units}}. [A]
12. **Statuses:** "Distribution completed", "Published", "Draft · not published", "Not scheduled"; legend Scheduled/Saved/Completed/Off; Auto/Manual. [A]
13. **Empty:** "No distributions yet…". 15/16. **Validation:** feasibility errors (e.g. "This Members m% / Partners p% combo can't be split into wd valid days…", "Nothing to publish…"). [A]
17. **Formulas (exact):** `base = units × 30`; `mAmt = base × mpct/100`; `pAmt = base × ppct/100`; partner % coupled to member % via ratio `k`; `spreadUnits()` distributes an integer target across working days; random distribution time within window; TXN-P id per run. Mock; registers a service worker. [A]
18. **Data:** ScheduleDay {role, dateKey, off, pct, time}; DistributionRun {iso, txn, mPct, pPct, mWallets, pWallets, units, mAmt, pAmt, total, mode}; month publish state; unit pool + value. [A]
22. **API (implied):** `GET /profit/wallets-summary`, `GET/PUT /profit/schedule/{month}`, `POST /profit/schedule/{month}/publish`, `POST /profit/distribute`, `GET /profit/history`. [C]
23. **DB (implied):** `profit_schedule`, `profit_schedule_day`, `profit_distribution` (TXN-P). [C]
24. **RBAC:** "Daily profit entry", "Monthly schedule" permissions (admin). [A]
25. **Notifications:** none explicit; scheduled auto-distribution implies a **backend cron/job**. [B]

### 2.7 `bonus.html` — Bonus Campaigns (deposit bonuses)
1. **Bonus Campaigns.** 2. **Purpose:** create/manage deposit-bonus campaigns members claim (TXN-B): name, icon, type (first/all deposits), claim frequency (single/multi), rate %, lock days, min-unit eligibility, permanent-or-dated. [A]
3. **Portal:** **Admin** ("goes live on their dashboard once published"). [A]
6/7. **Forms:** campaign id (read-only `BC-{id}`), name (max 40), icon library, type seg, frequency seg, rate % (0–100), lock days, min units, permanent toggle → start/end dates. [A]
8. **Lists:** live cards + campaign list {rate%, type, lock}. 12. **Statuses:** Live/Scheduled/Ended. [A]
13. **Empty:** "No live campaigns", "No campaigns yet". 15/16. **Validation:** name/rate/lock/min/date rules (exact messages). [A]
17. **Data (mock, "replaced by backend"):** 3 demo campaigns. 18. **Entity:** Campaign {id, name, icon, type, freq, rate%, lock, min, permanent, start, end}. [A]
22. **API (implied):** `CRUD /bonus/campaigns`. [C] 23. **DB (implied):** `bonus_campaign`, likely `bonus_claim`. [C]
24. **RBAC:** "Bonus campaigns" permission. [A] 25. **Notifications:** in-app ("member dashboard"). [B]
> **Overlap note:** the current SD `campaigns` module is a **loyalty** campaign engine (segments, targets, enrollment, executions). This is a **deposit-bonus** engine — conceptually related but different semantics (deposit-triggered %, lock periods). Decision Q6.

### 2.8 `actbonus.html` — Activation Bonus
1. **Activation Bonus.** 2. **Purpose:** single network-wide auto reward (TXN-A) for a **fixed trigger** ("add 2 members within the next day"): on/off, reward type (% or fixed), value, lock days. [A]
3. **Portal:** **Admin** ("Set by you — applies network-wide"). [A]
5-7. **Sections/forms:** status hero, "How it works" (4 rows), settings sheet: enable toggle, reward type seg (Percentage/Fixed amount), value, lock days. [A]
12. **Statuses:** Enabled/Disabled. 15/16. **Validation:** "% between 0 and 100", "amount > 0", "lock ≥ 0 days". [A]
17. **Data (mock):** `cfg={enabled, rtype, value, lock}`. 18. **Entity:** single-row config + implicit fixed trigger; auto-credited grants. [A]
22. **API (implied):** `GET/PUT /activation-bonus`. [C] 23. **DB (implied):** singleton config + `activation_bonus_grant`. [C]
24. **RBAC:** "Activation bonus" permission. [A] 25. **Notifications:** auto in-app credit. [B]

### 2.9 `queue.html` — Action Queue (deposit/withdraw approvals)
1. **Action Queue.** 2. **Purpose:** approver works through pending **deposit AND withdrawal** requests: Approve / Reject / Hold, individually or in **bulk**; every action logged; locked once decided. [A]
3. **Portal:** **Admin** (exposes partner + assigned-admin fields; "Every action is logged"). [A]
5. **Sections:** requests list (card per request), tab strip, multi-select + bulk bar, details/confirm sheets, infinite scroll. [A]
6. **Actions:** approve/reject/hold (single), bulk approve/reject/hold, select all, long-press multi-select, review details, release (unwired), load-more. [A]
7. **Forms:** search only ("Search TXN / UID…"). 9. **Filters:** tabs All/Deposit/Withdraw/Hold (with live counts) + search over id/uid/partner/admin/name. [A]
8. **Lists:** card {type pill (deposit↓/withdraw↑/hold), TXN id, age, member name, UID·currency, partner UID, units, wallet value, ≈$}. ~60 mock records. [A]
12. **Statuses:** pending, hold, approved, rejected; type D/W. 13. **Empty:** "No held items" / "All clear". 14. **Loading:** "Load more". [A]
17. **Interactions:** mutate `status` in memory; success tick; per-currency value maps (`PER`, unit=$30). Mock. [A]
18. **Entity `Transaction`:** {id (TXN-D/W), type, member_name, member_uid, partner_uid, assigned_admin_id, currency, units, usd_value, status, created_at}. [A]
22. **API (implied):** `GET /queue?status&type&q`, `GET /transactions/{id}`, `POST /transactions/{id}/{approve|reject|hold|release}`, `POST /transactions/bulk`. [C]
23. **DB (implied):** `transaction` (deposit/withdraw request with status), links to member/partner/admin; audit log. [B]
24. **RBAC:** "Approve deposits", "Approve withdrawals" permissions; items routed to an assigned admin; no edit after decision. [A]
25. **Notifications:** **"The member is notified"** on reject; approve → "Funds credited immediately". [A]

### 2.10 `limits.html` — Limits & Withdraw settings
1. **Limits & Withdraw.** 2. **Purpose:** system-wide deposit/withdraw limits, early-withdraw policy (allow + processing fee), withdrawal processing-time range; read-only withdraw-workflow reference. [A]
3. **Portal:** **Admin** ("Changes apply system-wide and update instantly"). [A]
6/7. **Forms:** min deposit (units), max deposit (units), min withdraw (USD); early-withdraw toggle + fee %; processing time min/max days. [A]
12. **Statuses:** withdraw "Pending → Approved/Rejected"; Allowed/Disallowed; codes TXN-W, TXN-E. [A]
15/16. **Validation (exact):** "Maximum deposit must be greater than or equal to the minimum.", "Enter a processing fee between 0 and 100%.", etc. [A]
17. **State (mock defaults):** `{minDep:1, maxDep:10000, minWd:30, ewAllow:true, ewFee:10, procMin:3, procMax:4}`, `USD_PER_UNIT=30`; "backend supplies live values". [A]
18. **Entity `SystemLimits`:** min/max deposit units, min withdraw USD, early-withdraw allowed+fee%, proc min/max days. [A]
22. **API (implied):** `GET/PUT /settings/limits` (+ early-withdraw, processing-time). [C]
23. **DB (implied):** singleton system-settings row. [B] 24. **RBAC:** "Deposit/Withdraw limits", "Early withdraw settings" permissions. [A]
25. **Notifications:** status surfaced on member/partner withdraw history. [B]
> **Overlap:** current `wallet_limits` table exists but is **per-wallet** (min/max balance, daily debit, single-tx). This screen is **system-wide policy** + early-withdraw fee + processing SLA. Partial reuse. Decision Q7.

### 2.11 `currencies.html` — Currencies (fixed internal table)
1. **Currencies.** 2. **Purpose:** manage the fixed internal currency table — each currency's per-unit asset value; "1 USD =" auto-derived (unit ÷ 30). Add/edit/remove currencies members can lock to. No live forex. [A]
3. **Portal:** **Admin** CRUD; members only *consume* currencies. [A]
6/7. **Forms:** name (max 40), code (max 12, uppercase), flag picker (searchable), per-unit value; derived rate box. [A]
8. **List:** 13 seeded currencies (USD base=30, AED 110, INR 3000, PHP 1800, LKR 9500, …); base USD immutable/undeletable. [A]
15/16. **Validation:** "Enter a per-unit value greater than 0.", "That currency code already exists." [A]
17. **Structure note:** the ~1.2MB bulk is a **bundled 179-country inline-SVG flag library** (`FXFLAGS`) + `FXNAMES` picker data — only 13 currencies used by default; the flag library is reusable but heavy. [A]
18. **Entity `Currency`:** {code PK, name, flag_slug, per_unit_value, is_base}; global constant 1 unit=30 USD. [A]
22. **API (implied):** `CRUD /currencies` (base non-deletable). [C] 23. **DB:** `currencies` reference table already exists (currently unused). [A/B]
24. **RBAC:** "Currency management" permission. [A] 25. **Notifications:** none. [A]

### 2.12 `users.html` — Users (account & wallet management) — the largest screen
1. **Users.** 2. **Purpose:** full account management for Admins/Partners/Members: browse/search, per-user profile, wallet ops (deposit/withdraw/adjust/lock-liquidate), status changes, edit details, admin-permission management, partner/admin reassignment, transaction history + export. [A]
3. **Portal:** **Admin / Super-Admin.** [A]
5. **Sections:** search, role segmented filter (All/Admins/Partners/Members/Inactive w/ counts), user list, full-screen profile, full-screen transaction history, many sheets. [A]
6. **Per-user actions:** edit details, reset password, activate/freeze/suspend, make-partner (member→dual), enable-member-wallet (partner→dual), send message; per wallet deposit/withdraw/adjust/activate; deposit **tranche** cards with early-unlock (5% fee, bonus forfeited) / liquidate capital; permissions editor (admins); reassign partner/admin; export PDF/CSV. [A]
7. **Forms:** edit (name req, email regex, mobile dial-code, nationality); deposit (units → 30-day locked tranche); withdraw (amount + MAX, partner payout-currency w/ fixed conversion); adjust (add/deduct + **reason required**, logged TXN-ADJ); reassign (+reason); change status (+reason). [A]
8. **List rows:** {name, role/UID line(s) — dual-role shows FXP+FXM, holdings units, wallet value}. [A]
12. **Statuses (`acctState`):** Active, Frozen, Suspended, "Grace · Nd left", Inactive; deposit tranche Matured/locked; commission tier 5/6/7%. [A]
13. **Empty:** "No users found", "No transactions yet". 15/16. **Validation:** "Reason is required for a manual adjustment.", "Exceeds available", "Enter a valid email address.", etc. [A]
17. **Business logic (exact):** unit=$30; member "active" requires ≥1 unit else 7-day grace→inactive; partner own-balance = commission+profit−withdraw+adj (USD); early unlock forfeits bonus + 5% fee; make-partner sets partner currency→USD. Mock data (8 users, per-uid history). [A]
18. **Entities:** User/Account (role, per-wallet status, dual flag, currencies), DepositTranche (units, bonus%, lock/maturity), typed Transaction/Ledger, AdminPermission, AuditLog, sponsor/partner/admin relationships. [A]
19-21. **Behaviour:** all admin-side; "Admins cannot modify their own permissions — only Super Admin can." [A]
22. **API (implied):** `GET /users?role&q`, `GET/PATCH /users/{id}`, status/reset-password/wallet-ops/tranche/enable-partner/enable-member/reassign, `PATCH /admins/{id}/permissions`, `GET /users/{id}/transactions`, statement export. [C]
23. **DB (implied):** account + tranches + typed ledger + admin permissions + audit + relationships. [B]
24. **RBAC — the 23-permission admin catalog (explicit) [A]:** Approve deposits, Approve withdrawals, Partner approval, Member activation, Account status control, Dual role approval, Send invites, Daily profit entry, Monthly schedule, Commission rules, Bonus campaigns, Activation bonus, Deposit/Withdraw limits, Early withdraw settings, Currency management, **Wallet adjustment (SENSITIVE)**, Network access, Reports/Analytics, Download/Export, Audit log access, System maintenance, Announcements, Live chat access. (Defaults granted noted per-perm.)
25. **Notifications:** password-reset link emailed; "Send message/notification" to user; status/adjust/reassign audited. [A]

### 2.13 `dashboard.html` — Admin Dashboard
1. **Dashboard.** 2. **Purpose:** admin home: totals across all wallets, today's metrics, "needs attention", quick-action launcher to every admin screen, recent activity. [A]
3. **Portal:** **Admin** (greeting "Super Admin"; "across all wallets"). [A]
5. **Sections:** roller banner + GST clock, hero overview (total units + $ value + counts 3 Admins/28 Partners/412 Members), "Today at a glance" (deposits/withdrawals/profit paid/new members), needs-attention alerts, quick-actions grid + expandable More, recent activity. [A]
6. **Actions:** navigate to queue/profit/users/etc.; toggle system status pill Live↔Maintenance; count-up animation. [A]
12. **Statuses:** system Live/Maintenance; trend pills; action-queue badge (5). 18. **Data:** totals, unit value=$30, role counts, today metrics, activity feed. [A]
22. **API (implied):** `GET /dashboard/summary`, `GET /dashboard/activity`, `GET/PUT /system/status`. [C]
> **Overlap:** BCC already has a Dashboard; this is a **metrics rewrite** (units/partners/profit), not a new page. Decision Q9.

### 2.14 `settings.html` — Admin Settings
1. **Settings.** 2. **Purpose:** appearance (theme Light/Dark), read-only platform prefs (language EN-only, timezone GST, base unit value 30 USD fixed), change password, sign out. [A]
3. **Portal:** **Admin (Super-Admin "Master", `FXS000000001`).** [A]
6/7. **Forms:** change-password (current/new/confirm). 15/16. **Validation:** "New password must be at least 8 characters.", "…must be different…", "…don't match." [A]
17. **State:** theme in-memory (not persisted); sign-out→`splash.html`; app version "FXRTC v3.0". [A]
22. **API (implied):** `POST /auth/change-password`, `POST /auth/logout`, `GET /settings`. [C]
> **Overlap:** change-password + logout already exist in SD auth; settings module exists. Mostly REUSE.

### 2.15 `maintenance.html` — Maintenance modes
1. **Maintenance.** 2. **Purpose:** schedule/control platform availability for all members & partners, with templated member-facing notification, countdowns, audit trail. [A]
3. **Portal:** **Admin** (Super-Admin always; Admins only with "System maintenance mode" permission, off by default). [A]
5. **Sections:** current-status hero, scheduled/pending card, platform-mode picker, recent activity (audit), mode-impact reference, governance. [A]
**Modes [A]:** `live` (dep✓ wd✓ login✓), `deposit` (deposit only), `withdraw` (withdraw only), `full` (all off).
6/7. **Forms:** start/end date+time (GST), notification template dropdown, subject, message. [A]
12. **Statuses:** Operational/In maintenance; pending/active; countdowns "Starts in/Ends in"; impact chips Deposit/Withdraw/Login yes-no. [A]
15/16. **Validation:** "The end must be after the start.", "Enter a notification subject.", etc. [A]
17. **Templates:** Scheduled/Emergency/System Upgrade/Server Upgrade/Security Update/Temporary Interruption; auto-activate/auto-return via 1s tick; GST↔UTC; audit stamps "Super Admin". Mock. [A]
22. **API (implied):** `GET /maintenance`, `POST /maintenance/schedule`, activate/cancel/return-live, `GET /maintenance/audit`. [C]
> **Overlap:** SD settings has `/settings/maintenance` + `maintenance_windows` + BCC MaintenancePage + `settings.maintenance.manage` permission — but only a simple window, **not** the 4-mode model + member notification templates. Extend. Decision Q8.

### 2.16 Stubs (empty body — planned, not designed)
- **`announcements.html`** — title "Announcements", **no content**. Referenced by dashboard/queue/users nav. Current SD: only a BCC dashboard placeholder card; no module/table/route. → **NEW, but undesigned** (Q11).
- **`audit.html`** — title "Audit Log", **no content**. Current SD: `audit_logs` table exists + heavy audit usage, but no admin UI. → **NEW UI over existing audit data** (Q11).
- **`reports.html`** — title "Reports", **no content**. Current SD: full `reports` module + BCC reports pages already exist. → likely **REUSE existing** (Q11).

---

## 3. Comparison against the current Super Dreams codebase

Current SD is a **loyalty/engagement platform**: members, a points **wallet** (append-only ledger, holds, adjustments, statements, per-wallet limits), **rewards**, **dream store**, **games**, **campaigns** (loyalty), **notifications**, **reports**, **settings** (+ maintenance windows, feature toggles), full **auth** (register/login/refresh/OTP-less), **RBAC** (catalog of `resource.action` permissions, but only one seeded role: `super-admin='*'`), **audit_logs**, `countries/currencies/languages/timezones` reference tables, and `jobs/background_tasks` + separate `scheduler`/`worker` packages. Member Portal is mobile-first with 5 nav items.

### 3.1 Feature-by-feature verdict
| FXRTC screen | Portal | Closest current SD asset | Verdict |
|---|---|---|---|
| Invite | Admin | none (only `REFERRAL` campaign enum) | **NEW** module (invites) |
| Network / downline | Admin | none | **NEW** (partner/sponsor relationships + read API) |
| Create Admin (`onboarding`) | Admin | `identity.users` + `rbac` + auth | **NEW flow, high reuse** of identity/rbac; **+ email OTP (new)** |
| Commission | Admin | none | **NEW** module |
| Daily Profit | Admin | wallet credit seam (`wallet_transactions`, credits) | **NEW** module; reuses wallet credit + `jobs`/scheduler |
| Bonus Campaigns | Admin | `campaigns` (loyalty semantics differ) | **NEW** (deposit-bonus) — do **not** overload loyalty campaigns |
| Activation Bonus | Admin | none | **NEW** (small config + auto-grant job) |
| Action Queue (deposit/withdraw approvals) | Admin | wallet (credit/debit/hold, no request/approval) | **NEW** (deposit/withdraw request + approval workflow) |
| Limits & Withdraw | Admin | `wallet_limits` (per-wallet) + settings | **MODIFY/EXTEND** (system-wide policy + early-withdraw + SLA) |
| Currencies | Admin | `currencies` reference table (unused) + FX "future" note | **MODIFY/REUSE** table + add admin CRUD + per-unit value + base flag |
| Users (accounts + wallets) | Admin | BCC `members` + `identity.users` + wallet ops + rbac | **EXTEND heavily** (Admin/Partner/Member roles, dual-role, tranches, wallet deposit/withdraw/adjust from admin) |
| Dashboard | Admin | BCC Dashboard | **MODIFY** (units/partners/profit metrics) |
| Settings | Admin | auth change-password/logout + settings module | **REUSE** (mostly) |
| Maintenance | Admin | `settings.maintenance` + `maintenance_windows` + BCC page | **EXTEND** (4 modes + member notification templates) |
| Splash | Both | `LoadingScreen` | **REUSE** |
| Announcements (stub) | ? | placeholder only | **NEW** (undesigned) |
| Audit Log (stub) | Admin | `audit_logs` table (no UI) | **NEW UI over existing data** |
| Reports (stub) | Admin | full reports module + BCC pages | **REUSE existing** |

### 3.2 What already exists / can be reused directly
- **Design system** (`packages/ui`): Button, Card, Input, Select, MultiSelect, Switch, Tabs, Modal, Drawer, DataTable, EmptyState, LoadingScreen, StatCard, ConfirmationDialog, ToastProvider, form primitives, icons, theming — covers essentially all UI patterns in the HTML (role cards, sheets→Drawer/Modal, pills→Badge, toggles→Switch, key/value rows, calendars would be the one gap). **[A]** Reuse SD's React components; treat the HTML CSS as visual reference, **do not** port raw CSS/JS.
- **Wallet ledger** (`wallet_transactions` append-only, credits/debits/adjustments/holds/statements) — the substrate for profit/commission/bonus credits and deposit/withdraw. **[A]**
- **RBAC engine** (permissions/roles/role_permissions/user_roles + resolver + guards) — extend the catalog; add new roles. **[A]**
- **Auth** (register/login/refresh/sessions/change-password/reset/verify-email) — reuse for admin login; **email OTP-per-login is new**. **[A]**
- **Audit** (`audit_logs`) — back the Audit Log UI and all approval/adjust/maintenance actions. **[A]**
- **Settings + maintenance_windows + feature_toggles** — extend for limits/maintenance modes/unit-value. **[A]**
- **Notifications** module (templates, queue, deliveries, member inbox) — back "member is notified" (queue decisions) and maintenance notifications. **[A]**
- **jobs/background_tasks + scheduler/worker** — back scheduled daily-profit distribution, activation-bonus grants, tranche maturity, invite expiry. **[A]**
- **Reports** module — back the Reports stub. **currencies/countries/timezones** reference tables — back Currencies + dial-codes. **[A]**

### 3.3 What needs NEW backend modules
Invites, Network/Downline (partner-member hierarchy), Commission, Daily Profit, Bonus (deposit), Activation Bonus, Deposit/Withdraw **Requests + Approval Queue**. Plus a **units/deposit economic layer** (units@$30, deposit tranches, partner/member roles on accounts) that the current wallet does not model.

### 3.4 What needs DB changes (new/[C] tables, pending Q1)
`invites`; partner/sponsor relationship columns on accounts (`referred_by`, `partner_id`, `sponsor_id`); `deposit_requests`/`withdraw_requests` (or a unified `transaction_requests` with status); `deposit_tranches` (units, bonus%, lock/maturity); `commission_default_tier`, `commission_target(+_tier)`, `commission_referral`; `profit_schedule(+_day)`, `profit_distribution`; `bonus_campaign(+_claim)`; `activation_bonus_config(+_grant)`; system-wide `limits`/policy row; extend `currencies` with `per_unit_value`/`is_base`/`flag_slug`; extend maintenance for modes; possibly `announcements`. Also a **`units`/deposit balance** concept distinct from the current points wallet (Q3).

### 3.5 What needs new permissions
The current catalog is `resource.action` and seeds **only** `super-admin='*'`. The HTML defines **4 roles** (Super Admin, Admin, Partner, Member) and a **23-permission admin catalog** (§2.12). Needed: seed an **Admin** role (default = "approvals & members"), **Partner** and **Member** end-user roles, and ~23 new permission keys (deposits.approve, withdrawals.approve, partner.approve, member.activate, account.status, dualrole.approve, invite.send, profit.entry, profit.schedule, commission.manage, bonus.manage, activation-bonus.manage, limits.manage, early-withdraw.manage, currency.manage, wallet.adjust [sensitive], network.read, reports.read, export, audit.read, maintenance.manage, announcements.manage, live-chat.access). Self-permission edits blocked for admins. **[A]**

### 3.6 What needs Member/Partner Portal changes
**None of the uploaded screens are member/partner-facing** — but they repeatedly reference member/partner **dashboards** that must exist for the model to work (view balance/units, daily profit history, deposit/withdraw requests, commission earnings, downline, claim bonuses). These are **implied but not designed** (Q2). The current member portal (Home/Games/Dream Store/Wallet/Profile) has **no** deposit/withdraw/units/partner surfaces.

### 3.7 What needs Admin (BCC) Portal changes
The bulk of the work. BCC currently has Members/Wallet/Rewards/Dream Store/Campaigns/Notifications/Reports/Settings. The HTML adds: Dashboard rewrite, Users (accounts), Invite, Network, Create Admin, Action Queue, Commission, Daily Profit, Bonus, Activation Bonus, Currencies, Limits, Maintenance (modes), Announcements, Audit Log. **Design caveat:** the HTML is **mobile-first (444px)**; BCC is a desktop admin console — so the BCC implementation should adapt the *patterns/semantics*, not the 444px mobile layout (Q10).

---

## 4. Questions / decisions needed before implementation

**Q1 — Product & compliance framing (blocking).** These screens implement an MLM/partner-downline + fixed **daily-profit** + deposit/withdraw money model at **1 unit = $30 real money**. Is Super Dreams pivoting to (or adding) this model? What is the legal framing (real money vs internal points; KYC/AML; investment/securities and MLM regulation; jurisdictions)? Everything downstream depends on this. *(Recommend: confirm with product + legal before any build.)*

**Q2 — Where do Members/Partners interact?** The upload is admin-only. Do you have member/partner-facing designs (deposit, withdraw, my units/profit, my downline, claim bonus), or should those be proposed as new Member-Portal features?

**Q3 — Units vs points.** Is the "unit ($30)" economy a **replacement** for the current points wallet, a **parallel** ledger, or a **re-peg** of the existing wallet? (Determines whether we extend `wallet_*` or add a new deposit/units subsystem.)

**Q4 — Roles model.** Confirm the 4 roles (Super Admin, Admin, Partner, Member) and whether **dual-role** (member+partner) is in scope for v1. Confirm the 23-permission admin catalog is the source of truth for admin RBAC.

**Q5 — "Admin" vs current BCC users.** Today BCC manages *loyalty members*; the FXRTC "Users" screen manages *admin/partner/member accounts*. Do we merge these into one account model (`identity.users` + roles) or keep loyalty-members separate?

**Q6 — Bonus vs existing Campaigns.** Build deposit-**Bonus Campaigns** as a new module, or extend the existing loyalty `campaigns` module? (They differ: deposit-triggered %, lock periods vs segment/enrollment.)

**Q7 — Limits.** Keep per-wallet `wallet_limits` and add a separate **system-wide** limits/policy (min/max deposit units, min withdraw USD, early-withdraw fee, processing SLA), or unify?

**Q8 — Maintenance.** Extend existing `maintenance_windows` to the **4-mode** model (live/deposit-only/withdraw-only/full) + **member notification templates**, or keep the simple window and add modes separately?

**Q9 — Dashboard.** Rewrite the BCC dashboard metrics (units/partners/profit/queue), or add a new "Operations" dashboard alongside the existing one?

**Q10 — Mobile-first admin.** The HTML is 444px mobile. Should the Admin features be desktop-adapted in BCC (recommended), delivered as a separate mobile admin surface, or both?

**Q11 — Undesigned stubs.** `announcements`, `audit`, `reports` have no design. Reports likely reuses the existing module — confirm. Do you want Announcements and an Audit-Log UI designed before build, or built from the existing patterns/data?

**Q12 — Email OTP.** Create-Admin implies **email OTP on every admin login** + temp-password-then-reset. Add OTP to the existing auth module? (New capability.)

**Q13 — Currency/FX.** Confirm currencies are **fixed internal per-unit values** (no live forex) and USD base is immutable, as the HTML shows.

**Q14 — Rebrand.** Titles/logos still say "fxrtc"/`app.fxrtc.io`; ID prefixes are `FXA/FXP/FXM/FXS`. Confirm Super Dreams branding + final ID scheme before we hardcode anything.

**Q15 — Scope/sequence.** Confirm the phase order in §5 (or reprioritize).

---

## 5. Proposed implementation order (foundational → dependent)

> Assumes Q1–Q5 are answered "yes, build the units/partner model into Super Dreams." Each phase is backend-first (schema → module → API → RBAC → api-client) then Admin UI, mirroring the existing SD build pattern. **No phase starts until Q1 is resolved.**

**Phase 0 — Foundations & decisions (no code).**
Resolve Q1–Q5, Q14. Lock the economic model (units/$30, roles, account model), the RBAC catalog (4 roles + 23 perms), and branding/ID scheme. Produce ADRs.

**Phase 1 — Identity, roles & admin onboarding.**
Roles (Super Admin/Admin/Partner/Member) + 23 permissions seeded; Create-Admin flow (reuse `identity.users`+auth) + temp-password/first-login reset; **email OTP** (Q12). Foundation for everything gated by RBAC. *(Reuses auth/rbac/identity.)*

**Phase 2 — Accounts & Users admin.**
Extend accounts with role/partner/sponsor + status model (active/frozen/suspended/grace/inactive); build the **Users** admin surface (browse/search/profile/edit/status/reassign/permissions). *(Foundation for wallets, network, queue.)*

**Phase 3 — Units economy & wallet extension.**
Decide/implement the units ($30) ledger (extend `wallet_*` or new subsystem per Q3); admin wallet deposit/withdraw/adjust (reason-required, audited); **deposit tranches** (lock/bonus/maturity). *(Depends on Phase 2.)*

**Phase 4 — Currencies & Limits.**
Extend `currencies` (per-unit value, base, flag) + admin CRUD; system-wide **Limits & Withdraw** policy + early-withdraw fee + processing SLA. *(Needed by deposit/withdraw.)*

**Phase 5 — Deposit/Withdraw requests & Action Queue.**
Deposit/withdraw **request** entities + approval workflow (approve/reject/hold, bulk, locked-once-decided, member-notified via notifications module + audited). *(Depends on Phases 3–4.)*

**Phase 6 — Network / downline.**
Partner→member hierarchy relationships + read-only Network tree + per-member detail. *(Depends on Phase 2 accounts.)*

**Phase 7 — Earnings engines.**
Commission (tiers/targets/referral), Daily Profit (schedule/auto-plan/distribute via scheduler + wallet credit), Bonus Campaigns (deposit), Activation Bonus. Each credits the typed ledger (TXN-C/R/P/B/A). *(Depends on units economy + network + scheduler.)*

**Phase 8 — Invites.**
Invite issuance/assignment/revoke + join flow feeding onboarding. *(Can start after Phase 1; placed here as it feeds partner/member growth once the model exists.)*

**Phase 9 — Ops surfaces.**
Maintenance modes + member notifications; Admin Dashboard metrics rewrite; Audit-Log UI (over existing `audit_logs`); Announcements; confirm Reports reuse.

**Phase 10 — Member/Partner Portal (pending Q2).**
Member/partner-facing dashboards (units/profit/deposit/withdraw/downline/bonus) — only once designs exist.

**Cross-cutting:** the frosted-teal 444px design is a **mobile** reference; SD's `packages/ui` React components + tokens are the implementation vehicle. Reuse audit/notifications/scheduler seams already present. Do **not** port the raw HTML/CSS/JS.

---

## 6. Appendix — file → feature → portal → verdict (quick index)

| File | Feature | Portal | Content? | Verdict |
|---|---|---|---|---|
| invite.html | Invite | Admin | full | NEW |
| network.html | Network/downline | Admin | full | NEW |
| onboarding.html | **Create Admin** | Admin (SA) | full | NEW (reuse identity/rbac) |
| splash.html | Splash | Both | full | REUSE |
| commission.html | Commission | Admin | full | NEW |
| profit.html | Daily Profit | Admin | full | NEW |
| bonus.html | Bonus Campaigns | Admin | full | NEW |
| actbonus.html | Activation Bonus | Admin | full | NEW |
| queue.html | Action Queue | Admin | full | NEW |
| limits.html | Limits & Withdraw | Admin | full | MODIFY/EXTEND |
| currencies.html | Currencies | Admin | full | MODIFY/REUSE |
| users.html | Users (accounts) | Admin | full | EXTEND heavily |
| dashboard.html | Admin Dashboard | Admin | full | MODIFY |
| settings.html | Admin Settings | Admin (SA) | full | REUSE |
| maintenance.html | Maintenance modes | Admin | full | EXTEND |
| announcements.html | Announcements | ? | **stub** | NEW (undesigned) |
| audit.html | Audit Log | Admin | **stub** | NEW UI over existing data |
| reports.html | Reports | Admin | **stub** | REUSE existing module |

*End of spec. No application code was modified; the only file created is this document.*
