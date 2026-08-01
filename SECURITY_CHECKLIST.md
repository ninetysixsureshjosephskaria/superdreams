# Security Checklist — Super Dreams Platform

Security posture for v1.0.0, aligned with `docs/dna/07-security.md` and
ADR-017. Use the pre-production checklist before every release.

## Controls in place

### Authentication

- **Password hashing:** Argon2id via `@node-rs/argon2` (never plaintext; only
  hashes stored).
- **Tokens:** short-lived JWT access tokens; refresh tokens are random, **hashed
  at rest**, **rotated** on use, and delivered as **HTTP-only** cookies.
- **Account lockout:** failed logins are tracked (`login_history`); accounts lock
  after a configurable threshold within a window.
- **Session revocation:** deleting a session invalidates its refresh chain.

### Authorization

- **RBAC** on every administrative endpoint via catalog-defined permissions
  (`requirePermission`) — no hardcoded role checks. Permission resolution is
  cached (Redis) and invalidated on grant changes.
- Member self-service and public endpoints are auth-only by design and scoped to
  the caller's own data.

### Data protection

- **SQL injection:** all queries use Drizzle's parameterized builder; no
  string-concatenated SQL.
- **Input validation:** every request body/query is validated with Zod at the
  service boundary; JSON schemas back the OpenAPI contract.
- **Secret redaction:** secret settings (`isSecret`) are never returned by reads
  (write-only).
- **Output encoding / XSS:** React escapes by default; no `dangerouslySetInnerHTML`
  on untrusted data; notification templates substitute variables only (no
  scripting).

### Transport & headers

- **Helmet** security headers (strict CSP in production; relaxed only when
  Swagger UI is enabled).
- **CORS** restricted to a configured allow-list with credentials.
- **Rate limiting** per window on the API.

### Auditing

- Every configuration change and business mutation writes to the append-only
  `audit_logs` table (module, actor, IP, correlation ID, old/new values where
  practical).

### Secrets

- All secrets come from the environment; the API **refuses to start in
  production** with a placeholder `JWT_SECRET` shorter than 16 characters.

## Pre-production checklist

- [ ] `NODE_ENV=production`.
- [ ] `JWT_SECRET` is strong, unique, ≥ 16 chars, and stored in a secret manager.
- [ ] `CORS_ORIGINS` is an explicit allow-list (not `*`).
- [ ] `SWAGGER_ENABLED=false` (or docs are access-restricted).
- [ ] TLS terminated at the edge; HSTS enabled; secure cookies over HTTPS.
- [ ] Database and Redis are password-protected and network-isolated.
- [ ] `pnpm audit --prod --audit-level high` passes (CI enforces this).
- [ ] Backups configured and a restore has been drilled.
- [ ] Admin credentials rotated from any seed/demo defaults.
- [ ] Log level set to `info` (not `debug`/`trace`) in production.

## OWASP Top 10 (2021) mapping

| Risk | Mitigation |
| ---- | ---------- |
| A01 Broken Access Control | Catalog RBAC on all admin routes; ownership checks on self-service. |
| A02 Cryptographic Failures | Argon2id hashing; hashed refresh tokens; TLS at edge. |
| A03 Injection | Parameterized Drizzle queries; Zod validation. |
| A04 Insecure Design | Ledgers + projections; state machines; idempotent queues. |
| A05 Security Misconfiguration | Env validation; strict CSP in prod; CORS allow-list. |
| A06 Vulnerable Components | CI `pnpm audit` (high+) gate; pinned lockfile. |
| A07 Auth Failures | Lockout, refresh rotation, session revocation. |
| A08 Integrity Failures | Frozen lockfile; roll-forward migrations; audit trail. |
| A09 Logging/Monitoring | Structured logs, correlation IDs, audit log, health probes. |
| A10 SSRF | No user-controlled outbound fetches in v1.0.0. |

## Known security-relevant limitations

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md): CSRF relies on same-site
cookie handling (no separate token yet), rate limiting is in-memory
(single-instance), and email/SMS providers are mocked.
