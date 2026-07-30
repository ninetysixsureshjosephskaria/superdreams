# Super Dreams Platform
## Phase 04 — Shared Packages

---

# ROLE

You are the Principal Software Architect for the Super Dreams Platform.

Your responsibility is to create reusable shared packages that eliminate duplication across every application and service.

Every shared package should have one clear responsibility and must be usable by multiple applications without modification.

This phase creates only reusable libraries.

Do NOT implement business modules.

---

# REQUIRED READING

Read before writing code:

- docs/README.md
- docs/dna/01-platform.md
- docs/dna/02-repository.md
- docs/dna/03-backend.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md
- docs/product/PRODUCT_OVERVIEW.md

These documents are the single source of truth.

---

# OBJECTIVE

Build every reusable shared package required by the platform.

Packages must remain independent.

Packages must never depend on applications.

Applications may depend on packages.

Backend services may depend on packages.

---

# CREATE

Create the following packages.

```text
packages/

ui/
theme/
types/
config/
validation/
permissions/
auth/
api-client/
constants/
utils/
```

Each package must have:

README.md

package.json

tsconfig.json

src/

index.ts

Unit tests

Proper exports

---

# PACKAGE: UI

Create reusable React components.

Components:

Button

Input

Textarea

Select

Checkbox

Radio

Switch

Modal

Dialog

Drawer

Table

Card

Badge

Avatar

Breadcrumb

Tabs

Toast

Spinner

Loader

Skeleton

Pagination

Empty State

Error State

Search Box

Date Picker

File Upload

Tooltip

Popover

Dropdown

Each component must:

Be reusable

Be accessible

Be typed

Support theming

Contain no business logic

---

# PACKAGE: THEME

Create the design system.

Include:

Color palette

Typography

Spacing

Radius

Elevation

Breakpoints

Animations

Icons

Light Theme

Dark Theme

CSS variables

Tailwind integration

Design tokens

---

# PACKAGE: TYPES

Create shared TypeScript types.

Examples:

ApiResponse

Pagination

User

Member

Wallet

Reward

Campaign

Notification

AuditLog

Enums

Interfaces

Generic utility types

No business implementation.

Only shared contracts.

---

# PACKAGE: CONFIG

Create centralized configuration.

Include:

Application config

API config

Environment config

Feature flags

Runtime config

Typed environment helpers

Validation

---

# PACKAGE: VALIDATION

Create reusable Zod validators.

Examples:

Email

Phone

Password

UUID

Pagination

Date

Currency

Address

Search

Common API inputs

Export reusable schemas.

---

# PACKAGE: PERMISSIONS

Create permission framework.

Do NOT implement RBAC yet.

Only provide helpers.

Include:

Permission types

Permission utilities

Permission checker

Permission constants

Guard helpers

Prepare for future RBAC module.

---

# PACKAGE: AUTH

Create authentication utilities.

Do NOT implement login.

Create:

Token helpers

Storage helpers

Session helpers

User context types

Auth hooks

JWT helpers

Auth constants

Authentication interfaces

No API implementation.

---

# PACKAGE: API CLIENT

Create reusable API client.

Requirements:

Axios

Typed responses

Request helpers

Response helpers

Interceptors

Error normalization

Retry support

Cancellation support

Pagination helpers

File upload helper

Download helper

No business endpoints.

---

# PACKAGE: CONSTANTS

Shared constants.

Examples:

Routes

Roles

Permissions

Languages

Currencies

Date formats

Time zones

Application limits

Regex patterns

Storage keys

API paths

---

# PACKAGE: UTILS

Reusable utility functions.

Examples:

Date formatting

Currency formatting

UUID

Debounce

Throttle

Clipboard

File helpers

String helpers

Array helpers

Object helpers

Validation helpers

Browser helpers

Storage helpers

Math helpers

No React dependency.

---

# TESTING

Each package must include:

Vitest

Basic tests

Coverage

Typed exports

---

# DOCUMENTATION

Every package must include:

README.md

Purpose

Public API

Usage examples

Folder structure

Development guide

---

# EXPORTS

Every package must expose clean public APIs.

Avoid deep imports.

Example:

```ts
import { Button } from "@superdreams/ui";
```

Never require:

```ts
import Button from "../../../components/button";
```

---

# QUALITY

Verify:

No circular dependencies

Strict TypeScript

Tree shakeable

Reusable

Lint passes

Tests pass

Typecheck passes

Build passes

No placeholder code

---

# OUTPUT FORMAT

Work package by package.

Explain:

Purpose

Architecture

Generated files

Public exports

Verification

Continue.

---

# STOP CONDITION

When every shared package has been created:

Summarize:

Folder structure

Exports

Dependencies

Shared architecture

Wait for approval.

Do not continue to DevOps.