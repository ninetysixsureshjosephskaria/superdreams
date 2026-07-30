# Super Dreams Platform
## Phase 06 — Database Foundation

---

# ROLE

You are the Principal Database Architect and Senior Backend Engineer for the Super Dreams Platform.

Your responsibility is to design and implement the production-ready database foundation for the platform.

This phase establishes the database architecture, conventions, schemas, migrations, auditing, and infrastructure required by all future business modules.

Do NOT implement business features.

Do NOT implement authentication.

Do NOT implement members.

Do NOT implement wallets.

Do NOT implement rewards.

Only build the database foundation.

---

# REQUIRED READING

Read before making any changes.

docs/README.md

docs/dna/01-platform.md

docs/dna/02-repository.md

docs/dna/03-backend.md

docs/dna/10-claude-rules.md

docs/product/PRODUCT_OVERVIEW.md

Follow these documents exactly.

---

# OBJECTIVE

Create a production-ready PostgreSQL foundation using Drizzle ORM.

The result should allow future modules to add tables through independent migrations without changing existing architecture.

---

# DATABASE PRINCIPLES

Use PostgreSQL.

Use Drizzle ORM.

Use migrations.

Never use synchronize.

Never modify production tables manually.

All changes must occur through versioned migrations.

---

# DIRECTORY STRUCTURE

Create:

```text
backend/api/

drizzle/

src/database/

connection/
client/
migrations/
schema/
seed/
repositories/
types/
helpers/
```

---

# DATABASE CONNECTION

Create:

Typed database connection

Connection pooling

Graceful shutdown

Retry strategy

Environment configuration

Connection health check

---

# MIGRATION SYSTEM

Configure Drizzle migrations.

Support:

Generate

Apply

Rollback (where supported)

Migration history

Migration verification

---

# DATABASE NAMING STANDARDS

Use:

snake_case

Plural table names

Singular entity names

UUID primary keys

created_at

updated_at

deleted_at

created_by

updated_by

deleted_by

version

Every future table must follow these conventions.

---

# BASE TABLES

Create only foundation tables.

Do NOT create authentication tables yet.

Create:

system_config

audit_logs

jobs

background_tasks

application_settings

feature_flags

countries

currencies

languages

timezones

These tables should contain only platform-level information.

---

# COMMON COLUMNS

Every business table should support:

UUID primary key

created_at

updated_at

deleted_at

created_by

updated_by

deleted_by

version

status (where appropriate)

Prepare reusable helpers.

---

# INDEXING

Create reusable indexing standards.

Index:

UUIDs

Foreign keys

Created dates

Status

Search columns

Document indexing strategy.

---

# AUDIT FOUNDATION

Prepare audit framework.

Support:

Entity

Action

Old Value

New Value

User

Timestamp

IP Address

User Agent

Module

Correlation ID

Do not implement audit middleware yet.

---

# SOFT DELETE

Implement reusable soft delete helpers.

No table should be physically deleted by default.

---

# PAGINATION

Prepare reusable pagination helpers.

Support:

Limit

Offset

Cursor pagination

Sorting

Filtering

---

# TRANSACTION HELPERS

Create reusable transaction utilities.

Support:

Commit

Rollback

Nested transaction helpers

Future business services should reuse these helpers.

---

# SEEDING

Prepare seed infrastructure.

Create:

Seed runner

Environment-specific seeds

Development seed support

No sample business data.

---

# VALIDATION

Validate:

Database configuration

Migration execution

Database version

Extensions

Startup readiness

---

# HEALTH CHECK

Database health should verify:

Connectivity

Migration state

Latency

Version

Connection pool

---

# README

Create database documentation.

Include:

Architecture

Naming conventions

Migration workflow

Folder structure

Best practices

Development workflow

---

# QUALITY CHECKLIST

Verify:

Database connects

Migrations execute

Seeds run

Health check passes

Typecheck passes

Lint passes

Tests pass

No warnings

No placeholder code

---

# OUTPUT FORMAT

Work section by section.

Explain:

Purpose

Generated files

Architecture decisions

Verification

Continue.

---

# STOP CONDITION

When the database foundation is complete:

Summarize:

Folder structure

Migration strategy

Naming standards

Base tables

Audit architecture

Seed architecture

Wait for approval.

Do not continue to Authentication.