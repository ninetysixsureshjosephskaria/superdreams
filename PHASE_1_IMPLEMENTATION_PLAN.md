# PHASE_1_IMPLEMENTATION_PLAN.md
## Authentication & Account Foundation

**Status:** Plan only — no code, database, or frontend changed.
**Scope:** Member Sign Up → activation → login/logout → forgot/reset → resend, plus member **account status**, **admin visibility** of that status, the **RBAC foundation** (Member/Partner/Admin/Super Admin), and **audit logging** for account/auth actions.
**Constraint honored:** builds entirely on the **existing** Super Dreams auth architecture (`backend/api/src/modules/auth` + `identity` + `rbac`). **No second auth system.**
**Related docs:** `FEATURE_IMPLEMENTATION_SPEC.md` (Phase 1 here ≈ that doc's Phase 1 "Identity, roles & admin onboarding", scoped to the *member* side + RBAC scaffold; MLM/financial features excluded).

---

## 0. Current state — what already exists (verified by reading the code)

**A large part of Phase 1 items 1–8 is already implemented** (member onboarding flow, built earlier and on `main`). This plan therefore separates **[DONE]** (reuse/verify/harden) from **[NEW]** (build in Phase 1).

| Phase-1 item | Current status | Evidence |
|---|---|---|
| 1. Member Sign Up | **[DONE]** `POST /api/v1/auth/register` → creates `PENDING` user, issues verification token, sends activation email | `auth/services/registration.service.ts`, `auth/routes/auth.routes.ts:164` |
| 2. Email verification / activation | **[DONE]** `POST /auth/verify-email` → sets `emailVerifiedAt` + status `ACTIVE` | `auth/services/email-verification.service.ts` |
| 3. OTP vs activation link | **[DONE — link, no OTP]** No OTP exists anywhere in auth; design = emailed activation link (`/activate?token=`) | grep: 0 OTP references in `modules/auth` |
| 4. Login | **[DONE]** `POST /auth/login`; gates on `SUSPENDED`/`DEACTIVATED` and `emailVerifiedAt`; lockout via `login_history` | `auth/services/auth.service.ts:24-74` |
| 5. Logout | **[DONE]** `POST /auth/logout` (+ session revoke, `DELETE /auth/sessions/:id`) | `auth.service.ts:76`, routes |
| 6. Forgot password | **[DONE]** `POST /auth/forgot-password` → reset token + email | `auth/services/password.service.ts:28` |
| 7. Reset password | **[DONE]** `POST /auth/reset-password` | `password.service.ts` |
| 8. Resend activation | **[DONE]** `POST /auth/resend-verification` (non-committal response) | `registration.service.ts:48` |
| 9. Member account status | **[PARTIAL]** `users.status` enum + login gate exist; `identity.changeStatus` exists but no admin path/audit; no role/member-profile linkage on signup | `identity/services/user.service.ts:83` |
| 10. Admin visibility of member status | **[PARTIAL]** BCC shows **loyalty `members`** status (+ `member_status_history`); self-signed-up **users** are not surfaced as accounts | `modules/members/*`, BCC `features/members` |
| 11. RBAC foundation (4 roles) | **[NEW]** only `super-admin='*'` seeded; no member/partner/admin roles; registration assigns no role | `rbac/catalog.ts:426` (single role) |
| 12. Audit logging for auth/account | **[PARTIAL]** login attempts in `login_history`; **auth/identity do NOT write `audit_logs`**; account-status changes unaudited | `auth.service.ts:51,101`; only non-auth modules have `audit.repository.ts` |

> **Net:** Phase 1 is mostly **hardening + wiring**, not greenfield. The genuinely new work is **RBAC roles**, **account-status lifecycle + admin surface**, **audit for account actions**, and **reconciling `users` (auth) vs `members` (loyalty)**.

---

## 1. Existing authentication components/services to REUSE (do not rebuild)

**Backend module `modules/auth`:**
- `RegistrationService` — `register()`, `resendVerification()`.
- `EmailVerificationService` — `requestVerification(userId)→rawToken`, `verifyEmail(token)`.
- `PasswordService` — `forgotPassword()`, `resetPassword()`, `changePassword()`.
- `AuthService` — `login()` (lockout + status gate + email-verified gate + `login_history` + events), `logout()`, `me()`.
- `SessionService` / token services — opaque rotating refresh tokens + JWT (HS256); `/auth/sessions`, `/refresh`, session revocation.
- `authenticate` preHandler (JWT guard) + `AuthEventBus` (`LoginSucceeded/LoginFailed/LogoutCompleted/...`).
- `EmailService` (`email/`) — env-gated provider (**Mock** local / **Resend** prod), `sendVerificationEmail`, `sendPasswordResetEmail`.

**Module `modules/identity`:**
- `UserService` — `createUser({email,password,firstName,lastName})` (hashes password via `@node-rs/argon2`, sets `PENDING`, throws `ConflictError` on dup), `getById()`, `changeStatus(id,next)`.
- `users` repository + `UserResponse` mapper.

**Module `modules/rbac`:**
- Permission **catalog** (`catalog.ts`), `roles/permissions/role_permissions/user_roles` repos, resolver + cache, guards/policies, `rbac-catalog` seed, endpoints (`GET /roles`, `/permissions`, role↔user, role↔permission, `GET /users/:id/permissions`).

**Frontend (already built, member side):** `packages/api-client` `createAuthApi` (register, login, logout, refresh, verifyEmail, forgotPassword, resetPassword, resendVerification, changePassword); member pages Login/SignUp/Activate/ForgotPassword/ResetPassword/ChangePassword + routes; `packages/ui` primitives (FormField, Input, PasswordInput, Alert, Button, etc.).

---

## 2. Existing database tables/models to REUSE (no changes needed to these)

| Table | Role in Phase 1 |
|---|---|
| `identity.users` (status `PENDING/ACTIVE/INACTIVE/SUSPENDED/DEACTIVATED`, `password_hash`, `email_verified_at`, `must_change_password`) | **The account.** Authoritative auth identity + account status. |
| `auth.sessions`, `refresh_tokens`, `devices` | Session lifecycle, logout, refresh rotation. |
| `auth.login_history` | Login success/failure + lockout + auth attempt audit. |
| `auth.password_history` | Password-reuse prevention (if enabled). |
| `auth.email_verification_tokens` | Activation-link lifecycle (hashed token + expiry + single-use). |
| `auth.password_reset_tokens` | Forgot/reset lifecycle. |
| `rbac.permissions / roles / role_permissions / user_roles` | RBAC foundation (seed roles, assign default role). |
| `audit.audit_logs` | Account/auth action audit (currently unused by auth). |
| `members.members` (+ `member_status_history`, `member_activity_logs`) + `members.user_id` FK | Loyalty profile + its own status/history; link target for a signed-up user. |
| `reference.countries` | (Optional) nationality/dial-code if signup collects it later. |

---

## 3. Required DATABASE changes

**Design goal: minimize schema change.** Phase 1 needs **no new tables**; the work is seed data + (optionally) one nullable column. All changes are additive and reversible.

- **[SEED, not schema]** Add 3 system roles to the `rbac-catalog` seed: `member`, `partner`, `admin` (alongside existing `super-admin`). Idempotent (the seed already upserts). → **new drizzle migration NOT required** (seed only), unless we add columns below.
- **[OPTIONAL COLUMN — Decision D4]** If we want to distinguish self-signup source / activation metadata beyond `email_verified_at`, add nullable columns to `users` (e.g. `activated_at`, `signup_source`). **Default recommendation: skip** — `email_verified_at` already captures activation.
- **[OPTIONAL COLUMN — Decision D6]** If a member **profile** is auto-created on activation, no schema change is needed (`members` + `members.user_id` already exist); it's a service-layer decision.
- **Migration note:** current latest migration is `0012_*`. Any Phase-1 column change would become `0013_*`. **Preferred Phase-1 path = zero migrations** (roles via seed), so nothing new to migrate → smaller deploy risk.

---

## 4. Required API endpoints

### 4.1 Reuse as-is (already implemented)
`POST /auth/register`, `/resend-verification`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `/change-password`, `/verify-email`; `GET /auth/me`, `/auth/sessions`; `POST /auth/revoke-session`; `DELETE /auth/sessions/:id`. RBAC: `GET /roles`, `/permissions`, `GET /users/:id/permissions`.

### 4.2 New / modified for Phase 1
| Endpoint | Type | Purpose | Notes |
|---|---|---|---|
| `GET /auth/me` | **modify** | Include the caller's **roles + resolved permissions** in the response | Frontend guard/nav needs this; reuse rbac resolver |
| `POST /auth/register` | **modify (internal)** | Assign default **`member`** role on user creation | Service change only, same contract |
| `POST /auth/verify-email` | **modify (internal, optional D6)** | Optionally create/link a `members` profile on activation | Decision-gated |
| `GET /api/v1/accounts` (or extend BCC `GET /members`) | **new/decision D5** | Admin list of **user accounts** with status (for accounts not in loyalty `members`) | Only if signups create users without member rows |
| `GET /api/v1/accounts/:id` | **new/decision D5** | Admin view of a user account (status, roles, verified, last login) | |
| `PATCH /api/v1/accounts/:id/status` | **new** | Admin change **auth account** status (suspend/reactivate/deactivate) → gates login | Wraps `identity.changeStatus` + audit |
| (reuse) `PATCH /api/v1/members/:id/status` | reuse | Loyalty member status (already exists, already audited to `member_status_history`) | Keep as-is |

> The choice between "extend `members` admin surface" vs "add a thin `accounts` surface over `identity.users`" is **Decision D5** (§14).

---

## 5. Required MEMBER pages (`apps/member`)

Mostly **[DONE]**; Phase 1 = verify + small hardening.
- **[DONE]** SignUp, Activate (`/activate?token=`), Login, ForgotPassword, ResetPassword, ChangePassword; Login "resend activation" panel + forgot/sign-up links.
- **[VERIFY]** Post-login routing when account is `PENDING`/blocked (clear "verify your email" state — already wired), and `mustChangePassword` redirect (already wired to `/change-password`).
- **[NEW, small]** A "logged-out / session-expired" affordance and a visible **account-status** notice if a member is `SUSPENDED` (friendly message on login failure — copy only).
- **No new member pages** are strictly required for Phase 1.

---

## 6. Required ADMIN pages (`apps/bcc`)

- **[REUSE]** BCC `features/members` (list/details) already shows loyalty member status + status history.
- **[NEW]** **Account status visibility + control** on the admin member/account detail: show `users.status` (auth account), `emailVerifiedAt`, last login (from `login_history`), assigned roles; add a guarded **status action** (Activate / Suspend / Deactivate) calling `PATCH /accounts/:id/status` (or members status if merged per D5).
- **[NEW, if D5 = separate accounts]** A minimal **Accounts** list/detail surface for user accounts that have no loyalty `members` row (self-signups).
- **[DEFER]** Full FXRTC "Users" screen (partner/admin/tranches/wallet ops/23 perms) is **later phases**, not Phase 1.

---

## 7. Required RBAC permissions & roles

### 7.1 Seed the 4 system roles (foundation)
| Role | Phase-1 permission grant | Notes |
|---|---|---|
| `super-admin` | `'*'` (exists) | unchanged |
| `admin` | scoped read + account-status subset (e.g. `member.read`, `member.status`, new `account.read`, `account.status`) | full 23-perm admin catalog deferred to later phases |
| `partner` | **none yet** (scaffold only) | partner features are later phases |
| `member` | self-service only (e.g. `profile.read/update` equivalents; may be *no* catalog perms in Phase 1 since member self endpoints are `authenticate`-gated, not permission-gated) | assigned by default on signup |

### 7.2 New permission keys (minimal, Phase 1 only)
- `account.read` — view auth account + status (admin).
- `account.status` — change auth account status / suspend login (admin, super-admin).
- (Reuse existing `member.read`, `member.status` for the loyalty side.)
- Defer the ~23 FXRTC admin permissions to later phases.

### 7.3 Assignment mechanics
- On `register()`, assign the `member` role (via `user_roles`).
- Admins/partners/super-admins are assigned out-of-band (later phases / seed).
- `GET /auth/me` returns resolved permissions so the frontend guards work with **real** RBAC (replacing the current mock `ProtectedRoute`).

---

## 8. Required email functionality

- **[REUSE]** `EmailService` (env-gated): `EMAIL_PROVIDER=mock` locally, `resend` in prod.
- **[REUSE]** `sendVerificationEmail` (activation link `${WEB_APP_URL}/activate?token=`), `sendPasswordResetEmail` (`/reset-password?token=`).
- **[VERIFY]** Copy/branding of both emails (Super Dreams, not FXRTC).
- **[CONFIG — prod]** `RESEND_API_KEY`, `EMAIL_FROM`, `WEB_APP_URL` must be set on Railway for real emails (see §12). Without `RESEND_API_KEY`, prod silently falls back to Mock (no emails sent).
- **[NO OTP]** Per existing design; no OTP email needed for members. (Email-OTP-per-login is an **admin** feature in a later phase.)
- **[OPTIONAL, Phase 1]** Notify member on account **suspension/reactivation** (reuse `notifications` module) — Decision D7.

---

## 9. Activation / token / OTP lifecycle

**Activation (email verification):**
1. `register()` → `users` row `PENDING`, `email_verified_at = null`, `member` role assigned.
2. `EmailVerificationService.requestVerification(userId)` → generates raw token, stores **hashed** token in `email_verification_tokens` with expiry + single-use; returns raw token.
3. Email sends `${WEB_APP_URL}/activate?token=<raw>`.
4. `verify-email` → validates (exists, not expired, not used), marks token used, sets `email_verified_at = now`, status `ACTIVE`.
5. `resend-verification` → re-issues a fresh token (invalidating prior per existing logic); response is intentionally non-committal (no account-existence disclosure).

**Password reset:** `forgot-password` → hashed token in `password_reset_tokens` (expiry, single-use) → email `/reset-password?token=` → `reset-password` validates + updates hash (+ `password_history` if enabled).

**OTP:** **Not used in Phase 1** (no member OTP in the existing design). Documented as a deliberate decision; admin login OTP is a later phase.

**To verify/confirm (Decision D3):** exact **TTL** and **single-use/rotation** semantics of both token tables (values live in auth config) — confirm they match desired policy before shipping.

---

## 10. Account status lifecycle

Two distinct statuses exist; Phase 1 must define the contract clearly:

**A) `users.status` (auth account) — authoritative for login:**
```
PENDING ──(verify-email)──▶ ACTIVE ──(admin suspend)──▶ SUSPENDED ──(admin reactivate)──▶ ACTIVE
   │                           │
   │                           └──(admin deactivate)──▶ DEACTIVATED
   └ (blocked from login until email verified)
INACTIVE = reserved (not currently gated in login)
```
- Login blocks: `SUSPENDED`, `DEACTIVATED` (explicit), and any account with `email_verified_at = null` (covers `PENDING`).
- **Phase-1 addition:** admin transitions (suspend/reactivate/deactivate) via `PATCH /accounts/:id/status`, audited.

**B) `members.status` (loyalty profile) — `recordStatus` (ACTIVE/INACTIVE/PENDING/SUSPENDED/ARCHIVED)** with `member_status_history` (already implemented + audited).

**Reconciliation (Decision D5/D6):** decide whether a self-signup creates only a `users` account (auth) or also a `members` profile, and whether the two statuses are independent (recommended: **user.status governs login; member.status governs loyalty**; admin UI shows both). Define whether suspending the auth account should also reflect on the member profile.

---

## 11. Security / validation requirements

- **Password hashing:** `@node-rs/argon2` (argon2id) — already used by `UserService`. ⚠ This is the **same native binding implicated in the production startup failure** (see §12) — login/register cannot work in prod until that's resolved.
- **Enumeration resistance:** email-verified check runs **after** password check; forgot-password + resend responses are non-committal (already implemented) — preserve.
- **Lockout:** `login_history` recent-failure threshold (config) — reuse.
- **Token security:** verification/reset tokens stored **hashed**, single-use, time-limited — reuse; confirm TTLs (D3).
- **Session security:** opaque rotating refresh tokens + JWT; logout revokes session — reuse.
- **Validation (Zod):** `registerSchema` (email, password policy, firstName, lastName), `loginSchema`, `forgot/reset/change` schemas, `resendVerificationSchema` — reuse; confirm password policy matches spec.
- **RBAC enforcement:** replace the mock `ProtectedRoute` with real permission checks fed by `GET /auth/me`; admin account-status endpoints guarded by `account.status`.
- **Audit integrity:** account-status changes and (optionally) activation/password-reset recorded to `audit_logs` with actor + before/after + ip/ua.
- **Transport/config:** `RESEND_API_KEY`/secrets only via env; `WEB_APP_URL` must be the correct member-portal origin so links resolve.

---

## 12. Dependency on the Railway deployment issue (explicit)

**Phase 1 has a hard production dependency on the unresolved deploy failure.**
1. **Startup blocker:** production currently fails during container start (`seed.js` never reaches `seed.js starting`; migrate→seed→server chain stalls). The leading hypothesis under investigation is a **native `@node-rs/argon2` load failure** in the Linux image (a child-process probe was just deployed to confirm). **Auth's password hashing/verification uses the same `@node-rs/argon2` binding** — so if that binding is truly failing on the platform, **login and register will also fail in production**, independent of Phase 1 code quality. **This must be resolved before Phase 1 can function in production.**
2. **Email delivery:** real activation/reset emails require `RESEND_API_KEY` (+ `EMAIL_FROM`, `WEB_APP_URL`) set on the Railway API service. Absent the key, prod falls back to Mock and **no emails are sent**.
3. **Migrations/seed:** if we add the roles via the seed (recommended), the seed must actually run on deploy — which is exactly what's currently broken. Zero-migration Phase 1 reduces but does not remove this dependency (roles still seed at deploy).

**Consequence for sequencing:** Phase 1 can be **built and fully tested locally** now (Mock email + local Postgres/PGlite). **Go-live is gated on** (a) the argon2/startup fix and (b) Resend env config. Recommend finishing the deploy diagnosis (argon2 child-probe result) in parallel; do not schedule Phase 1 production cut-over until both are green.

---

## 13. Tests required

**Backend (Vitest + PGlite, single-fork on this Windows box):**
- **[VERIFY/EXTEND]** existing `onboarding.integration.test.ts` (signup→activation email→activate→login-blocked→login-after→forgot→reset) — extend for resend + lockout.
- **[NEW]** default `member` role assigned on register; `GET /auth/me` returns roles + permissions.
- **[NEW]** account-status transitions: `PATCH /accounts/:id/status` (suspend blocks login; reactivate restores; deactivate blocks); permission-guarded (403 without `account.status`).
- **[NEW]** audit: account-status change writes an `audit_logs` row with actor/before/after.
- **[VERIFY]** token lifecycle: expired token rejected, single-use enforced, resend invalidates prior (per config).
- **[VERIFY]** enumeration resistance (forgot/resend non-committal), lockout threshold.
- **[NEW]** RBAC seed idempotency: seeding roles twice is a no-op; 4 roles present.

**Frontend (`apps/member`, `apps/bcc`):**
- **[VERIFY]** member auth pages render/submit; Activate consumes `?token=`.
- **[NEW]** BCC account-status action (guarded button; optimistic → server confirm).
- **[VERIFY]** real RBAC guard replaces mock `ProtectedRoute` (member vs admin route access).

**Full-suite gates:** `pnpm typecheck` (10/10), API tests (single-fork), `pnpm lint`, frontend tests, member/bcc build. Pre-push hook runs typecheck + tests.

---

## 14. Decisions needed BEFORE coding

- **D1 — Deploy gate:** Accept that Phase 1 is built/tested **locally** now and **go-live waits** on the argon2/startup fix + Resend env? (Recommend: yes.)
- **D2 — Scope confirm:** Phase 1 = **member** auth + account status + RBAC scaffold + audit only; **no** partner/admin-console features (invite, Create-Admin, admin OTP) yet? (Recommend: yes.)
- **D3 — Token policy:** confirm activation/reset **TTL** (e.g. 24h / 1h) and single-use/rotation semantics to lock in.
- **D4 — Schema:** OK to do Phase 1 **without any new migration** (roles via seed, no new columns)? (Recommend: yes.)
- **D5 — Accounts vs Members surface:** does a self-signup create only a `users` account, or also a loyalty `members` row? And does admin visibility target a new thin **Accounts** surface or the existing **Members** surface? (Determines §4.2 / §6.)
- **D6 — Member profile on activation:** auto-create/link a `members` profile when a user activates? (yes/no)
- **D7 — Suspension notice:** email/notify a member when suspended/reactivated (reuse notifications), or silent? 
- **D8 — Member role permissions:** should the `member` role carry explicit catalog permissions, or rely on `authenticate`-gated self endpoints (current pattern)? (Recommend: keep self endpoints `authenticate`-gated; `member` role is identity-only for now.)
- **D9 — Password policy:** confirm the required password rules (length/complexity) match the spec so `registerSchema` is authoritative.
- **D10 — RBAC go-live:** replace the mock `ProtectedRoute` with real RBAC in Phase 1, or keep mock until a later phase? (Recommend: switch member-portal to real auth in Phase 1; BCC real RBAC when admin surfaces land.)

---

## 15. Exact Phase 1 implementation sequence

> Backend-first, then frontend, mirroring the existing SD build pattern. Steps 1–8 already exist and are **verify/harden**; the new work is steps concentrated in RBAC, account status, and audit. **No production cut-over until §12 is green.**

1. **Confirm decisions D1–D10** (esp. D5/D6 which shape endpoints & UI). *(no code)*
2. **RBAC roles seed** — add `member`, `partner`, `admin` to `rbac-catalog` seed (idempotent); keep `super-admin`. Unit test idempotency.
3. **Default role on signup** — `register()` assigns `member` role; integration test.
4. **`GET /auth/me` enrichment** — return roles + resolved permissions (reuse rbac resolver); test.
5. **Account-status admin capability** — new `account.read` / `account.status` permissions; `PATCH /accounts/:id/status` (wraps `identity.changeStatus`) with guard; login-gate tests (suspend/reactivate/deactivate).
6. **Audit wiring** — write `audit_logs` for account-status changes (actor/before/after/ip/ua), following the existing per-module `audit.repository.ts` pattern; test. (Login attempts stay in `login_history`.)
7. **Verify/harden existing auth** — token TTL/single-use (D3), lockout, enumeration resistance, resend invalidation; extend `onboarding.integration.test.ts`.
8. **(If D6) Member profile linkage** — create/link `members` row on activation; test.
9. **api-client** — add `getMe` roles/permissions typing + `accounts` status calls; export types.
10. **Member portal** — switch mock `ProtectedRoute` → real RBAC (D10); verify auth pages + suspended-account messaging; build.
11. **Admin portal (BCC)** — account-status visibility + guarded status action on member/account detail (+ Accounts surface if D5); build.
12. **Full verification** — typecheck 10/10, API tests (single-fork) green, lint clean, both frontends build; then **stop** and report. Production deploy of Phase 1 is gated on the Railway argon2/startup fix + Resend env (§12), handled separately.

---

*End of plan. No application code, database, or frontend was modified; the only file created is this document.*
