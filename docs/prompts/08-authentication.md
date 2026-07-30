# Super Dreams Platform
## Phase 08 — Authentication

---

# ROLE

You are the Principal Security Engineer for the Super Dreams Platform.

Your responsibility is to implement the complete authentication system using the existing Identity Domain.

Do NOT recreate identity tables.

Do NOT implement business modules.

Do NOT implement RBAC authorization.

Authentication only.

---

# REQUIRED READING

Read before making changes:

- docs/README.md
- docs/dna/01-platform.md
- docs/dna/03-backend.md
- docs/dna/10-claude-rules.md
- docs/product/PRODUCT_OVERVIEW.md

Also review the existing Identity module.

---

# OBJECTIVE

Implement a production-ready authentication system that integrates with the Identity Domain.

Reuse existing:

- users
- sessions
- devices
- refresh_tokens
- login_history
- password_history

Do not duplicate existing models.

---

# MODULE STRUCTURE

Create:

backend/api/src/modules/auth/

```text
auth/
├── controllers/
├── services/
├── repositories/
├── dto/
├── validators/
├── middleware/
├── routes/
├── strategies/
├── guards/
├── events/
├── utils/
├── tests/
└── README.md
```

---

# FEATURES

Implement:

- Login
- Logout
- Refresh Token
- Token Rotation
- Forgot Password
- Reset Password
- Change Password
- Password Validation
- Email Verification hooks
- Session Revocation
- Device-aware Sessions
- Account Lockout
- Login Attempt Tracking
- Remember Me support
- Session Expiration

---

# SECURITY

Implement:

Password hashing (Argon2 or bcrypt according to project standards)

JWT Access Token

JWT Refresh Token

Token rotation

Secure cookie support

CSRF preparation

Rate limiting hooks

Brute-force protection

Password policy enforcement

Session validation

Token blacklist/revocation strategy

---

# CONFIGURATION

Create typed authentication configuration for:

- Token expiry
- Refresh expiry
- Password policy
- Lockout thresholds
- Cookie settings
- Issuer
- Audience

Read values from environment variables.

---

# API ENDPOINTS

Create endpoints for:

POST /auth/login

POST /auth/logout

POST /auth/refresh

POST /auth/forgot-password

POST /auth/reset-password

POST /auth/change-password

GET /auth/me

POST /auth/revoke-session

GET /auth/sessions

DELETE /auth/sessions/:id

Use consistent API response models.

Update OpenAPI documentation.

---

# MIDDLEWARE

Create reusable middleware:

- Authenticate JWT
- Optional Authentication
- Current User Context
- Session Validation

Do not implement permission checks yet.

---

# EVENTS

Create events for:

- LoginSucceeded
- LoginFailed
- LogoutCompleted
- PasswordResetRequested
- PasswordResetCompleted
- PasswordChanged
- SessionRevoked
- TokenRefreshed

---

# VALIDATION

Validate:

- Email
- Password
- Refresh Token
- Reset Token
- Session IDs
- Device IDs

Use shared validation package where applicable.

---

# TESTING

Create:

- Authentication service tests
- Controller tests
- Middleware tests
- JWT tests
- Password policy tests
- Session tests

---

# DOCUMENTATION

Create README.md including:

- Authentication architecture
- Authentication flow
- Token lifecycle
- Session lifecycle
- Password lifecycle
- Security considerations
- Integration with Identity Domain

---

# QUALITY CHECKLIST

Verify:

- Login works
- Logout works
- Refresh works
- Password reset flow compiles
- JWT validation works
- Session revocation works
- OpenAPI updated
- Tests pass
- Lint passes
- Typecheck passes
- No duplicated identity logic

---

# OUTPUT FORMAT

Implement in logical phases.

For each phase:

1. Explain the objective.
2. Generate files.
3. Explain security decisions.
4. Verify.
5. Continue.

Do not generate everything in one response.

---

# STOP CONDITION

When authentication is complete:

Summarize:

- Folder structure
- Authentication flow
- Token lifecycle
- Session management
- Password management
- Security measures

Wait for approval.

Do NOT continue to RBAC.