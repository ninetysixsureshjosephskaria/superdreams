# Repository & Workspace DNA

**Document ID:** DNA-02  
**Version:** 1.0.0  
**Status:** Approved  
**Owner:** Super Dreams Engineering Team

---

# Purpose

This document defines the permanent standards for organizing, structuring, naming, and maintaining the Super Dreams source code repository.

Every engineer and every AI assistant must follow these rules.

Consistency is more important than personal preference.

---

# Repository Philosophy

Super Dreams uses a **single enterprise monorepo**.

All applications, backend services, shared libraries, infrastructure, and documentation reside within one repository.

This enables:

- Shared code
- Shared types
- Shared UI components
- Unified versioning
- Simplified dependency management
- Easier refactoring
- Consistent engineering standards

Multiple repositories for internal platform modules are prohibited.

---

# Repository Structure

```

SuperDreams/

apps/
backend/
packages/
infrastructure/
docs/

package.json
pnpm-workspace.yaml
turbo.json
docker-compose.yml
README.md

```

Every directory has exactly one responsibility.

---

# apps/

Contains runnable applications only.

Current applications:

- Business Control Center (BCC)
- Member Portal

Future applications:

- Mobile Web
- Partner Portal
- Documentation Site
- Public Portal

Applications must never contain reusable business logic.

---

# backend/

Contains backend services.

Current services:

- api
- worker
- scheduler

Future services:

- integrations
- reporting
- analytics workers

Business logic belongs here.

---

# packages/

Contains reusable libraries.

Examples:

- ui
- theme
- auth
- api-client
- validation
- permissions
- constants
- types
- config
- utilities

Packages must be reusable.

Packages must not depend on applications.

Applications may depend on packages.

---

# infrastructure/

Contains operational resources.

Examples:

- Docker
- Docker Compose
- PostgreSQL
- Redis
- Nginx
- Monitoring
- Deployment scripts
- Infrastructure automation

No business logic belongs here.

---

# docs/

Contains all documentation.

Documentation evolves together with the platform.

Documentation changes are version controlled.

---

# Folder Naming Rules

All folders use lowercase.

Multiple words are separated using hyphens.

Correct:

```

wallet-service

reward-engine

member-profile

```

Incorrect:

```

WalletService

walletService

Wallet_Service

```

---

# File Naming Rules

## React Components

PascalCase

Examples

```

MemberCard.tsx

WalletTable.tsx

CampaignEditor.tsx

```

---

## Hooks

Lowercase.

Prefix with use.

Examples

```

use-auth.ts

use-wallet.ts

use-notification.ts

```

---

## Utilities

Lowercase with hyphens.

Examples

```

format-currency.ts

calculate-wallet.ts

validate-email.ts

```

---

## Types

Lowercase.

Examples

```

member.ts

wallet.ts

campaign.ts

```

---

# Variable Naming

Variables must describe business meaning.

Correct

```

memberBalance

walletId

campaignStatus

rewardProbability

```

Incorrect

```

temp

value

data

abc

x

```

---

# Function Naming

Functions always begin with verbs.

Examples

```

calculateReward()

findMember()

approveCampaign()

createWallet()

publishNotification()

```

Avoid vague names.

---

# Constants

Constants use uppercase snake case.

Examples

```

DEFAULT_PAGE_SIZE

MAX_LOGIN_ATTEMPTS

JWT_EXPIRY

```

---

# Enum Naming

Use singular names.

Examples

```

RewardStatus

WalletType

CampaignState

```

---

# Git Strategy

Protected branches:

```

main

develop

```

Direct commits to protected branches are prohibited.

All changes must use Pull Requests.

---

# Branch Naming

Feature

```

feature/wallet

feature/reward-engine

feature/member-profile

```

Bug Fix

```

fix/login

fix/dashboard-filter

```

Hotfix

```

hotfix/security

```

Release

```

release/v1.0.0

```

---

# Commit Standards

Conventional Commits are mandatory.

Examples

```

feat(wallet): add manual adjustment

fix(auth): refresh token expiry

docs(api): update authentication guide

refactor(game): simplify reward calculation

test(wallet): add integration tests

```

---

# Dependency Rules

Allowed

```

Application

↓

Shared Package

↓

Infrastructure

```

Not Allowed

```

Application A

↓

Application B

```

Applications communicate through APIs only.

---

# Package Rules

Every package owns exactly one responsibility.

Example

packages/ui

Contains only UI components.

Never place:

- authentication
- business logic
- database access

inside UI packages.

---

# Documentation Rules

Every module contains:

- README.md
- Architecture.md
- API.md
- Events.md
- Permissions.md

Documentation is part of the implementation.

---

# Configuration Rules

Configuration belongs inside shared config packages.

Never duplicate configuration files across applications.

Environment variables are documented in `.env.example`.

Secrets are never committed.

---

# Code Ownership

Each module has an owner.

Business rules are owned by the corresponding domain.

No engineer should modify another domain's business rules without understanding the impact.

---

# Repository Quality Standards

The repository should always satisfy:

- Predictable structure
- Consistent naming
- Small reusable packages
- No duplicated business logic
- No undocumented modules
- No circular dependencies

---

# Related Documents

- docs/README.md
- docs/dna/01-platform.md
- docs/dna/03-backend.md
- docs/dna/04-frontend.md
- docs/dna/10-claude-rules.md

---

# End of Document