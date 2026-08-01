# ADR-017 — Authentication Security Decisions

**Status:** Approved
**Date:** 2026-07-31
**Owner:** Super Dreams Engineering Team
**Applies to:** `backend/api` (authentication module)
**Relates to:** DNA‑03 (Backend), DNA‑05 (Database), DNA‑06 (API), DNA‑09 (Security), ADR‑016

---

## Context

Phase 08 builds the authentication foundation on top of the Phase 07 Identity
module. The DNA fixes the required security properties (short-lived access
tokens, rotated and revocable refresh tokens, reuse detection, expiring
reset/verification tokens, revocable sessions/devices, no hardcoded secrets,
secure cookies) but leaves the concrete mechanisms to implementation. This ADR
records the mechanisms chosen so they are consistent and not re-litigated.

No authorization (roles, permissions, RBAC) is introduced; that is a later phase.

---

## Decisions

1. **Access tokens are JWTs signed with `jose` (HS256).** Signing and verification
   live only in `TokenService` (`strategies/jwt.strategy.ts`). Tokens carry
   `sub` (user id), `sid` (session id), `iss`, `aud`, `iat`, `exp`. TTL defaults
   to 15 minutes. `@fastify/jwt` is **not** used — a single, framework-agnostic
   signing surface keeps token logic testable and centralized.

2. **Refresh tokens are opaque, not JWTs.** They are 256 bits of CSPRNG output
   (`base64url`) and are persisted **only** as SHA-256 hashes. The raw value is
   returned to the client once and never stored.

3. **Refresh rotation is mandatory.** Every refresh issues a new token and marks
   the presented token used + revoked, linking `replaced_by_token_id`.

4. **Reuse detection revokes the session.** Presenting an already-used or revoked
   refresh token revokes **all** refresh tokens for that session and the session
   itself, and emits `RefreshTokenReuseDetected`. This is the theft response.

5. **Sessions and devices are first-class and revocable.** Sessions carry device,
   IP and user-agent, have an absolute expiry, and can be revoked individually,
   for a whole user (on password change/reset), or via reuse detection. Devices
   are registered per user when a `deviceId` is supplied.

6. **Reset and email-verification tokens are single-use, expiring, and hashed.**
   Same opaque + SHA-256 model as refresh tokens. Reset defaults to 1 hour,
   verification to 24 hours. **No email is sent** in this phase; delivery is a
   later phase. Outside production the reset endpoint returns the raw token to
   support testing; in production it is never exposed in the response.

7. **Password lifecycle reuses Identity's Argon2id.** Hashing/verification is not
   reimplemented. `password_history` prevents reuse of recent passwords; changing
   or resetting a password revokes existing sessions.

8. **Account lockout is derived from `login_history`.** After N failed attempts
   (default 5) within a window (default 15 min) for an email, login is rejected
   before credential checks. No mutable lock flag is stored on the user.

9. **Refresh token transport is an httpOnly cookie.** The cookie is `httpOnly`,
   `Secure` in production, `SameSite` (default `lax`), and scoped to
   `/api/v1/auth`. The token is also returned in the response body to support
   non-browser clients; both paths accept it on refresh.

10. **All parameters come from configuration.** JWT secret, issuer, audience,
    all TTLs, lockout thresholds and cookie flags are environment-driven and
    validated in `config/env.ts`. The production guard already rejects a weak
    JWT secret. Nothing security-relevant is hardcoded.

11. **Validation boundary is Zod, mapped to canonical 400s.** Auth services parse
    input with Zod; the central error handler now maps `ZodError` to the standard
    validation error envelope.

---

## Consequences

- Token verification is stateless for signature but **stateful for session**:
  every authenticated request validates the session behind `sid`, so revocation
  takes effect immediately (no waiting for token expiry).
- Rotation + reuse detection require a database round-trip per refresh; acceptable
  for the security guarantee and consistent with the DNA.
- Email-dependent flows (reset, verification) are complete server-side but inert
  until the notifications phase wires delivery.

---

## Alternatives considered

- **JWT refresh tokens** — rejected: cannot be revoked before expiry without a
  server-side store, so an opaque hashed token is simpler and stronger.
- **`@fastify/jwt`** — rejected in favour of `jose` for a centralized, portable
  signing surface that is trivial to unit test.
- **Mutable `locked_until` on the user** — rejected in favour of deriving lockout
  from immutable `login_history`, avoiding extra write contention on the user row.
