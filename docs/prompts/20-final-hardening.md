# Super Dreams Platform
## Phase 20 — Final Hardening & Production Readiness

---

# ROLE

You are the Principal Software Architect, Lead Security Engineer, DevOps Lead, QA Lead, Performance Engineer, and Release Manager for the Super Dreams Platform.

Your responsibility is to perform a complete production-readiness hardening of the platform.

Do NOT create new business modules.

Do NOT redesign completed modules.

Do NOT introduce breaking architectural changes.

Improve, verify, optimize, and prepare the platform for a production release.

---

# REQUIRED READING

Read ALL documentation before making changes.

Required:

- docs/README.md
- docs/product/PRODUCT_OVERVIEW.md

Read every DNA document.

Review every completed module.

Review every migration.

Review every package.

Review every application.

---

# OBJECTIVE

Prepare Super Dreams for Version 1.0.

The final output should be a deployable enterprise application.

---

# ARCHITECTURE REVIEW

Review:

- Folder structure
- Module boundaries
- Dependencies
- Circular dependencies
- Code duplication
- Shared package usage
- Separation of concerns

Fix issues without breaking APIs.

---

# CODE QUALITY

Review entire repository.

Remove:

- Dead code
- Unused exports
- Unused packages
- Duplicate utilities
- Duplicate components
- Duplicate validation
- TODO comments
- Temporary code
- Debug logging

Standardize naming.

Ensure consistency.

---

# SECURITY REVIEW

Verify:

Authentication

Authorization

RBAC enforcement

Password storage

JWT validation

Session handling

Refresh tokens

CSRF protection (where applicable)

XSS protection

SQL Injection prevention

Rate limiting

Security headers

Secret management

Input validation

Output encoding

Dependency vulnerabilities

Fix any issues.

---

# DATABASE REVIEW

Review:

Indexes

Foreign keys

Constraints

Migration consistency

Query performance

Transactions

Cascade rules

Soft delete

Audit integrity

Connection pooling

Optimize queries where appropriate.

---

# API REVIEW

Verify:

REST consistency

HTTP status codes

Error responses

Pagination

Filtering

Sorting

Validation

OpenAPI documentation

Versioning readiness

Ensure consistent API contracts.

---

# FRONTEND REVIEW

Review:

Accessibility (WCAG AA)

Responsiveness

Keyboard navigation

Error boundaries

Loading states

Empty states

Theme consistency

Dark mode

RTL readiness (where applicable)

Component reuse

Remove duplicated UI.

---

# PERFORMANCE REVIEW

Optimize:

Database queries

Bundle size

Code splitting

Lazy loading

Caching

Redis usage

React rendering

Large lists

Pagination

Background jobs

Asset loading

---

# TESTING

Review:

Unit tests

Integration tests

Repository tests

Controller tests

Service tests

Component tests

Critical flows

Increase coverage where meaningful.

Ensure all tests pass.

---

# CI/CD REVIEW

Verify:

Docker

Docker Compose

GitHub Actions

Lint

Typecheck

Tests

Build

Artifacts

Environment validation

Deployment scripts

---

# DOCUMENTATION REVIEW

Verify every module has:

README

Architecture

Public API

Examples (where useful)

Folder structure

Extension guidance

Update any outdated documentation.

---

# OBSERVABILITY

Verify:

Logging

Correlation IDs

Health endpoints

Metrics endpoints

Error reporting hooks

Audit logs

Queue monitoring

Prepare for production monitoring.

---

# DEPENDENCIES

Review:

Package versions

Security advisories

Unused dependencies

Licenses

Compatibility

Document recommendations before making major version upgrades.

---

# RELEASE READINESS

Create:

CHANGELOG.md

RELEASE_NOTES.md

DEPLOYMENT_GUIDE.md

OPERATIONS_RUNBOOK.md

BACKUP_RECOVERY.md

SECURITY_CHECKLIST.md

PERFORMANCE_BASELINE.md

KNOWN_LIMITATIONS.md

LICENSE verification

CONTRIBUTING.md (if missing)

CODE_OF_CONDUCT.md (if missing)

---

# VERSIONING

Prepare the project for:

Version 1.0.0

Update package versions consistently where appropriate.

---

# FINAL VERIFICATION

Run and verify:

pnpm install

pnpm lint

pnpm typecheck

pnpm test

pnpm build

Docker build

Docker Compose

Migration execution

Seed execution

Health checks

Resolve every error before completion.

---

# QUALITY GATE

The platform is complete only if:

- Zero TypeScript errors
- Zero ESLint errors
- Zero build errors
- Tests passing
- Documentation complete
- OpenAPI complete
- No duplicate code
- No placeholder implementations
- No broken routes
- No unused modules
- No critical security findings

---

# OUTPUT FORMAT

Work in logical phases.

For each phase:

1. Explain the review objective.
2. Identify issues (if any).
3. Apply improvements.
4. Verify.
5. Continue.

Do not introduce breaking changes.

---

# STOP CONDITION

When complete, provide:

## Executive Summary

Include:

- Platform architecture overview
- Module inventory
- Shared packages
- Database summary
- Security summary
- Performance summary
- Testing summary
- Documentation summary
- Production readiness checklist
- Remaining recommendations (non-blocking)

Confirm whether the platform is ready for Version 1.0.0 production release.

Stop after the final report.