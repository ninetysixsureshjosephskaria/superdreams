# Super Dreams Platform
## Phase 01 — Workspace Bootstrap

---

# ROLE

You are the Lead Software Architect and Principal Full Stack Engineer for the Super Dreams Platform.

You are responsible for creating the complete enterprise development foundation.

Your responsibility is NOT to build business features.

Your responsibility is to create a clean, scalable, production-ready repository that will serve as the foundation for every future module.

You must think like a senior engineer working on a platform expected to live for many years.

Never optimize for speed.
Always optimize for architecture, maintainability, and code quality.

---

# REQUIRED READING

Before writing any code, read and understand these documents.

docs/README.md

docs/dna/01-platform.md

docs/dna/02-repository.md

docs/dna/10-claude-rules.md

docs/product/PRODUCT_OVERVIEW.md

These documents are the single source of truth.

Never contradict them.

---

# OBJECTIVE

Bootstrap the entire Super Dreams workspace.

This phase creates the engineering foundation only.

DO NOT implement any business logic.

DO NOT implement authentication.

DO NOT create APIs.

DO NOT create database schema.

DO NOT create UI screens.

DO NOT create dashboards.

DO NOT create member management.

DO NOT create wallet.

DO NOT create rewards.

DO NOT create campaigns.

Only create the project foundation.

---

# TECHNOLOGY STACK

Use the following stack exactly.

Package Manager

- PNPM

Monorepo

- Turborepo

Language

- TypeScript (Strict Mode)

Runtime

- Node.js LTS

Linting

- ESLint

Formatting

- Prettier

Git Hooks

- Husky

Commit Validation

- Commitlint

Formatting Hooks

- lint-staged

---

# CREATE REPOSITORY STRUCTURE

Create the following directory structure.

```text
SuperDreams/

apps/
    bcc/
    member/

backend/
    api/
    worker/
    scheduler/

packages/
    ui/
    theme/
    auth/
    api-client/
    validation/
    permissions/
    constants/
    config/
    types/
    utils/

infrastructure/

docs/

.github/
    workflows/

.vscode/
```

Create README.md files inside every top-level folder describing its purpose.

---

# ROOT FILES

Generate and configure:

package.json

pnpm-workspace.yaml

turbo.json

tsconfig.base.json

.editorconfig

.gitignore

.prettierrc

.prettierignore

eslint.config.js

README.md

LICENSE (MIT unless otherwise specified)

.env.example

.nvmrc

---

# PACKAGE CONFIGURATION

Configure workspace scripts.

Required scripts:

```
dev

build

lint

format

typecheck

test

clean
```

All packages should inherit common standards.

Avoid duplicated configuration.

---

# TURBOREPO

Configure Turbo for:

- build
- dev
- lint
- test
- typecheck
- clean

Enable caching where appropriate.

---

# TYPESCRIPT

Configure:

Strict mode

Path aliases

Shared tsconfig

Modern module resolution

Incremental compilation

Declaration maps

Source maps

Target latest stable ECMAScript supported by the chosen Node.js LTS.

---

# ESLINT

Configure enterprise rules.

Include:

TypeScript

Import ordering

Unused imports

Unused variables

Promise handling

Consistent return types

No explicit any

No console except approved logging locations

---

# PRETTIER

Configure:

Single quotes

Trailing commas

Semicolons

Consistent line width

Consistent formatting across repository

---

# EDITORCONFIG

Create a standard EditorConfig.

Use:

UTF-8

LF

Final newline

Spaces

4 spaces for Markdown

2 spaces for code where appropriate

Trim trailing whitespace

---

# GITIGNORE

Ignore:

node_modules

dist

coverage

.env

logs

.cache

.turbo

.vscode/settings.json

Operating system files

Temporary files

---

# HUSKY

Configure Git hooks.

pre-commit

Run:

lint-staged

pre-push

Run:

typecheck

tests

---

# COMMITLINT

Configure Conventional Commits.

Examples:

feat(auth):

fix(wallet):

docs(api):

refactor(member):

test(reward):

---

# LINT-STAGED

Automatically run:

ESLint

Prettier

on staged files.

---

# VSCODE

Create recommended settings.

Include:

Format on save

ESLint

Prettier

TypeScript SDK

Recommended extensions

---

# README

Create a professional root README.

Include:

Project overview

Architecture

Repository structure

Requirements

Installation

Development

Scripts

Workspace overview

Contributing

Documentation

---

# LICENSE

Generate MIT license.

---

# QUALITY REQUIREMENTS

Everything generated should:

Compile successfully

Use strict TypeScript

Follow enterprise naming conventions

Have no placeholder code

Contain no TODO comments

Contain no dead code

Be production-ready

---

# OUTPUT FORMAT

Work in phases.

For every phase:

Explain what will be created.

Generate files.

Explain architectural decisions.

Verify consistency.

Only then continue.

Do NOT generate everything in one enormous response.

---

# STOP CONDITION

When the workspace foundation is complete:

Provide a summary of everything created.

List every generated file.

Explain why each exists.

Wait for approval.

Do NOT continue to backend bootstrap.

Do NOT continue to frontend bootstrap.

Stop after Phase 01.