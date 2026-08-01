# Authentication Module

Foundation for authentication: login/logout, sessions, refresh-token rotation,
password reset/change, and email verification. It **reuses the Identity module**
for all user and credential concerns (no identity logic is duplicated here) and
contains **no authorization** — roles, permissions and RBAC are a later phase.

## Responsibilities

| Area               | Detail                                                                              |
| ------------------ | ----------------------------------------------------------------------------------- |
| Login / Logout     | Credential check via Identity (Argon2id), session issuance, revocation.             |
| Access tokens      | Short-lived JWT (HS256) via `jose`, signed/verified only in `TokenService`.         |
| Refresh tokens     | Opaque, random, stored **hashed** (SHA-256); rotated on every use.                  |
| Reuse detection    | A used/revoked refresh token presented again revokes the whole session.             |
| Sessions           | Per-login sessions with device, IP, user-agent; revocable individually or per user. |
| Devices            | Device-aware sessions (optional `deviceId`); registered/tracked per user.           |
| Password reset     | Single-use, expiring, hashed tokens. **No email is sent** (delivery is later).      |
| Password change    | Requires current password; enforces recent-reuse prevention.                        |
| Email verification | Single-use, expiring, hashed tokens; sets `users.email_verified_at`.                |
| Lockout            | Temporary lock after N failed attempts within a window (from login history).        |
| Events             | In-process `AuthEventBus` (login, logout, refresh, reuse, revoke, password).        |

## Structure

```
modules/auth/
  controllers/   HTTP boundary (request/response, refresh cookie)
  dto/           input/output types
  events/        AuthEvent + AuthEventBus
  guards/        requireAuth (presence-only; no permissions)
  middleware/    createAuthenticate / createOptionalAuthenticate
  repositories/  sessions, devices, refresh/reset/verify tokens, login/password history
  routes/        /api/v1/auth route registration
  services/      auth, session, password, email-verification
  strategies/    jwt.strategy (TokenService)
  utils/         opaque token generation + hashing
```

## Endpoints (`/api/v1/auth`)

| Method | Path               | Auth | Purpose                                                          |
| ------ | ------------------ | ---- | ---------------------------------------------------------------- |
| POST   | `/login`           | –    | Authenticate; issues access + refresh (cookie + body).           |
| POST   | `/refresh`         | –    | Rotate refresh token (cookie or body) → new tokens.              |
| POST   | `/logout`          | ✓    | Revoke the current session.                                      |
| GET    | `/me`              | ✓    | Current authenticated user.                                      |
| POST   | `/forgot-password` | –    | Create a reset token (no email; token only exposed in non-prod). |
| POST   | `/reset-password`  | –    | Reset password with a token; revokes sessions.                   |
| POST   | `/change-password` | ✓    | Change password (requires current).                              |
| POST   | `/verify-email`    | –    | Verify email with a token.                                       |
| GET    | `/sessions`        | ✓    | List active sessions.                                            |
| POST   | `/revoke-session`  | ✓    | Revoke a session by id (body).                                   |
| DELETE | `/sessions/:id`    | ✓    | Revoke a session by id (REST).                                   |

## Security notes

- Access tokens are short-lived JWTs; **refresh tokens are never JWTs** — they are
  opaque and stored only as SHA-256 hashes.
- Refresh rotation is mandatory; the old token is revoked on each rotation, and
  **reuse of a rotated/revoked token revokes the entire session** (theft response).
- Reset and verification tokens are single-use, expiring, and stored hashed.
- The refresh cookie is `httpOnly`, `Secure` (in production), and `SameSite`
  configurable; scoped to `/api/v1/auth`.
- JWT secret, issuer, audience, TTLs, lockout thresholds and cookie flags come
  from environment configuration — nothing is hardcoded.

See `docs/adr/ADR-017-authentication-security.md` for the recorded decisions.
