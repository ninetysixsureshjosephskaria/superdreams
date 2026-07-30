# Super Dreams Platform
# DNA 05 — Database Architecture & Standards

---

# Purpose

This document defines the database architecture, conventions, standards, and development rules for the Super Dreams Platform.

It is the single source of truth for every database-related decision.

Every engineer, AI assistant, migration, and future module MUST follow this document.

---

# Database Philosophy

The database is a long-term business asset.

Application code changes frequently.

Database structures should change only through deliberate, version-controlled migrations.

Business data is considered permanent.

Never design tables around UI screens.

Always design around business domains.

---

# Technology Stack

Database Engine

- PostgreSQL (latest supported LTS)

ORM

- Drizzle ORM

Migration Tool

- Drizzle Kit

Validation

- Zod

Identifiers

- UUID v4

Timezone

- UTC only

Character Encoding

- UTF-8

---

# Architecture Principles

The database shall:

- Be normalized where appropriate
- Minimize duplicated data
- Prefer explicit relationships
- Support future scalability
- Be migration-driven
- Support auditing
- Support soft deletion
- Support optimistic concurrency
- Support reporting

---

# Naming Standards

## Tables

Plural

Examples

users

members

wallets

reward_programs

campaigns

notifications

reports

---

## Columns

snake_case

Examples

created_at

updated_at

deleted_at

created_by

updated_by

deleted_by

member_id

wallet_id

campaign_id

---

## Foreign Keys

Always use:

<entity>_id

Examples

member_id

user_id

wallet_id

campaign_id

reward_program_id

---

## Primary Keys

Every table uses

id UUID PRIMARY KEY

Never use auto increment IDs.

---

# Required Columns

Unless there is a valid architectural reason otherwise, every business table should include:

```sql
id UUID PRIMARY KEY

created_at TIMESTAMPTZ

updated_at TIMESTAMPTZ

deleted_at TIMESTAMPTZ NULL

created_by UUID NULL

updated_by UUID NULL

deleted_by UUID NULL

version INTEGER
```

Purpose:

created_at

Creation timestamp

updated_at

Last modification

deleted_at

Soft deletion

created_by

Audit

updated_by

Audit

deleted_by

Audit

version

Optimistic locking

---

# Time

Always store:

UTC

Never store local time.

Timezone conversion belongs to the application layer.

---

# Boolean Naming

Use positive names.

Examples

is_active

is_verified

is_deleted

Avoid

active_flag

flag_active

---

# Monetary Values

Never use floating point.

Use

NUMERIC

or smallest unit integers if business rules require.

Always include currency.

Example

amount

currency_code

---

# Status Fields

Prefer enums or controlled lookup tables.

Examples

ACTIVE

INACTIVE

PENDING

SUSPENDED

ARCHIVED

Never use arbitrary strings.

---

# Soft Delete

Business records should not be physically deleted.

Use:

deleted_at

deleted_by

Queries should exclude deleted records by default.

Hard delete should be restricted to administrative maintenance tasks.

---

# Auditing

Every business-changing action should be traceable.

Audit should capture:

Entity

Action

Previous Value

New Value

User

IP Address

User Agent

Correlation ID

Timestamp

Module

Audit is append-only.

Audit records must never be modified.

---

# Relationships

Always use explicit foreign keys.

Avoid storing duplicate information.

Example

Correct

Member

↓

Wallet

↓

Transactions

Incorrect

Wallet storing member name.

---

# Transactions

Use database transactions for:

Wallet operations

Reward allocation

Campaign execution

Balance updates

Status transitions involving multiple tables

Never allow partial commits for critical business operations.

---

# Indexing Strategy

Create indexes for:

Primary Keys

Foreign Keys

Frequently filtered columns

Status

Created Date

Reference Numbers

Unique Business Keys

Examples

member_number

wallet_reference

campaign_code

---

# Constraints

Use database constraints whenever possible.

Examples

UNIQUE

CHECK

NOT NULL

FOREIGN KEY

Do not rely only on application validation.

---

# Migrations

All schema changes must use versioned migrations.

Never modify production tables manually.

Migration Rules:

One logical change per migration

Review before execution

Never edit an executed migration

Create new corrective migrations instead

---

# Seed Data

Separate:

Development seeds

Testing seeds

Production reference data

Never insert demo business data into production.

---

# Repository Pattern

Repositories own persistence.

Repositories do not contain business rules.

Services own business logic.

---

# Performance

Avoid:

SELECT *

N+1 queries

Unnecessary joins

Missing indexes

Always paginate large datasets.

Optimize queries using PostgreSQL EXPLAIN ANALYZE before introducing denormalization.

---

# Concurrency

Use optimistic locking with the version column where concurrent updates are possible.

Critical financial operations should execute within database transactions.

Prevent race conditions on balance updates.

---

# Reporting

Operational tables are the source of truth.

Reporting modules may aggregate data but should not duplicate business entities.

Long-running reports should execute asynchronously.

---

# Backup Strategy

Support:

Daily backups

Point-in-time recovery (where configured)

Backup verification

Documented restore procedures

Backups are managed by infrastructure, not application code.

---

# Security

Never store:

Plain-text passwords

Secrets

API keys

Sensitive tokens in clear text

Sensitive values should be hashed or encrypted according to the platform security standards.

---

# Database Review Checklist

Every new table must satisfy:

- Uses UUID primary key
- Uses snake_case naming
- Includes audit fields
- Includes soft delete support where applicable
- Includes version column where appropriate
- Defines foreign keys
- Defines indexes
- Uses constraints
- Has migration
- Has repository
- Has tests
- Is documented

---

# Definition of Done

A database change is complete only when:

- Migration created
- Migration tested
- Schema updated
- Repository implemented
- Service integrated
- Tests passing
- Documentation updated
- OpenAPI unaffected or updated as required
- Performance reviewed
- Security reviewed

---

# Final Principle

The database represents the business.

Application code may evolve.

The database must remain stable, predictable, auditable, and maintainable for the lifetime of the Super Dreams Platform.