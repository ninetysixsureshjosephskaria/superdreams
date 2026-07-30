# Super Dreams Platform
## Phase 05 — DevOps & Infrastructure

---

# ROLE

You are the Lead DevOps Engineer for the Super Dreams Platform.

Your responsibility is to build a production-ready development and deployment infrastructure.

Do NOT implement business modules.

Do NOT implement authentication.

Do NOT create database schema.

Only build infrastructure.

---

# REQUIRED READING

Read before writing code:

- docs/README.md
- docs/dna/01-platform.md
- docs/dna/02-repository.md
- docs/dna/09-devops.md (if available)
- docs/dna/10-claude-rules.md
- docs/product/PRODUCT_OVERVIEW.md

Follow all engineering standards.

---

# OBJECTIVE

Prepare the repository for:

- Local development
- Testing
- CI/CD
- Production deployment
- Future scaling

Everything should work using a single command.

---

# CREATE

Create the following structure.

```text
infrastructure/

docker/
    api/
    bcc/
    member/

nginx/

postgres/

redis/

scripts/

.github/
    workflows/

monitoring/
```

---

# DOCKER

Create Dockerfiles for:

- backend/api
- apps/bcc
- apps/member

Requirements:

- Multi-stage builds
- Production optimized
- Small image size
- Non-root user
- Healthcheck
- Proper caching

---

# DOCKER COMPOSE

Create:

docker-compose.yml

docker-compose.dev.yml

Services:

- api
- postgres
- redis
- bcc
- member

Requirements:

Named volumes

Health checks

Networks

Restart policies

Environment files

Service dependencies

---

# DATABASE

Configure PostgreSQL container.

Requirements:

Persistent volume

Health check

Automatic startup

Development configuration

Production-ready defaults

No schema.

---

# REDIS

Configure Redis.

Requirements:

Persistent storage

Health check

Password support

Graceful restart

---

# NGINX

Create reverse proxy.

Support:

API

BCC

Member

Compression

Caching headers

Security headers

Gzip

SPA routing

---

# ENVIRONMENT

Create:

.env.example

.env.development

.env.production

Separate:

API

Database

Redis

Frontend

Logging

Security

Ports

Document every variable.

---

# GITHUB ACTIONS

Create CI pipeline.

Stages:

Install

Lint

Typecheck

Unit Tests

Build

Artifact generation

Pipeline should fail on any error.

---

# PRE-COMMIT

Configure:

Husky

lint-staged

Commitlint

Automatically run:

Formatting

Linting

Type checking (where appropriate)

---

# CODE QUALITY

Configure:

ESLint

Prettier

TypeScript

No warnings allowed.

---

# SECURITY

Prepare:

Security headers

CORS configuration

Secret management structure

Environment validation

Dependency auditing

Do not hardcode secrets.

---

# LOGGING

Prepare centralized logging.

Support:

Development

Production

JSON output

Log levels

Correlation IDs

---

# MONITORING

Prepare structure for:

Prometheus

Grafana

Loki

Health endpoints

Metrics endpoint

Do not configure dashboards yet.

---

# BACKUPS

Create scripts for:

Database backup

Database restore

Cleanup

Rotation strategy

Document usage.

---

# SCRIPTS

Create helper scripts.

Examples:

start

stop

reset

backup

restore

clean

seed (placeholder)

doctor

verify

Scripts should simplify local development.

---

# README

Create documentation for:

Infrastructure

Docker

Environment

Development

Deployment

Troubleshooting

---

# QUALITY CHECKLIST

Verify:

Docker builds

Compose starts

Containers healthy

CI passes

Lint passes

Typecheck passes

Tests pass

No hardcoded secrets

No placeholder production code

---

# OUTPUT FORMAT

Work one section at a time.

For every section:

Explain why it exists.

Generate files.

Explain configuration.

Verify.

Continue.

---

# STOP CONDITION

When DevOps setup is complete:

Summarize:

- Infrastructure structure
- Docker services
- CI/CD
- Scripts
- Monitoring
- Deployment strategy

Wait for approval.

Do not continue to database foundation.