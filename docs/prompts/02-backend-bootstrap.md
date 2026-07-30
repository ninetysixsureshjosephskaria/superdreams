# Super Dreams Platform
## Phase 02 — Backend Bootstrap

---

# ROLE

You are the Lead Backend Architect for the Super Dreams Platform.

Your responsibility is to create the complete backend foundation that all future business modules will build upon.

Do not implement business features.

Only build the backend infrastructure.

---

# REQUIRED READING

Before making any changes, read:

- docs/README.md
- docs/dna/01-platform.md
- docs/dna/02-repository.md
- docs/dna/03-backend.md
- docs/dna/10-claude-rules.md
- docs/product/PRODUCT_OVERVIEW.md

These documents are mandatory.

---

# OBJECTIVE

Bootstrap the backend service located at:

backend/api

The backend must be production-ready and prepared for future business modules.

Do NOT implement:

- Authentication
- Users
- Members
- Wallet
- Rewards
- Campaigns
- Reports
- Notifications
- Settings

Only build the backend foundation.

---

# TECHNOLOGY STACK

Use:

- Fastify
- TypeScript
- Drizzle ORM
- PostgreSQL
- Redis
- Zod
- Pino
- dotenv
- @fastify/swagger
- @fastify/swagger-ui
- @fastify/helmet
- @fastify/cors
- @fastify/rate-limit
- @fastify/sensible
- @fastify/jwt (install only, don't implement auth)

---

# PROJECT STRUCTURE

Create a clean enterprise structure.

```text
backend/api/

src/
    app/
    config/
    plugins/
    routes/
    middleware/
    errors/
    logger/
    database/
    cache/
    services/
    utils/
    types/
    health/

tests/

drizzle/

package.json
tsconfig.json
README.md
```

---

# APPLICATION BOOTSTRAP

Create:

- Fastify instance
- Plugin registration
- Graceful shutdown
- Environment loading
- Logger
- Error handler
- Route loader

Keep app bootstrap clean.

---

# CONFIGURATION

Create typed configuration.

Separate:

Application

Database

Redis

JWT

Logging

Swagger

Environment

Use Zod to validate environment variables.

Fail startup if configuration is invalid.

---

# LOGGING

Configure Pino.

Requirements:

Structured logging

Request ID

Response time

Environment awareness

Pretty logs for development

JSON logs for production

No sensitive information.

---

# DATABASE

Configure Drizzle ORM.

Create:

Database connection

Migration folder

Database provider

Connection lifecycle

Health check

No schema yet.

---

# REDIS

Configure Redis client.

Support:

Connection

Reconnect

Graceful shutdown

Health check

No caching implementation yet.

---

# PLUGINS

Register:

Helmet

CORS

Rate Limiting

Swagger

Swagger UI

Sensible

Compression (if appropriate)

Organize plugins individually.

---

# ROUTING

Create route registration.

Only create:

GET /

GET /health

GET /ready

GET /live

No business routes.

---

# HEALTH CHECKS

Health endpoint should verify:

Application

Database connection

Redis connection

Return structured JSON.

---

# ERROR HANDLING

Create:

Base application error

Validation error

Not Found

Unauthorized

Forbidden

Conflict

Internal server error

Centralize error handling.

Never expose stack traces in production.

---

# MIDDLEWARE

Prepare middleware structure for:

Authentication

Authorization

Permissions

Audit

Request context

Do not implement logic yet.

---

# API RESPONSE FORMAT

Use one consistent response format.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "",
    "message": ""
  }
}
```

---

# SWAGGER

Configure Swagger.

Expose:

/docs

Generate OpenAPI automatically.

---

# TYPESCRIPT

Strict mode.

No any.

Use shared tsconfig.

Use path aliases.

---

# TESTING

Configure:

Vitest

Testing utilities

Test folder

Health endpoint test

No business tests.

---

# README

Generate backend README.

Include:

Architecture

Folder structure

Running locally

Environment

Commands

Development workflow

---

# QUALITY CHECKLIST

Verify:

- Backend starts successfully
- Swagger works
- Health endpoint works
- Database connection initializes
- Redis initializes
- Logger works
- Lint passes
- Typecheck passes
- Tests pass
- Build passes

---

# OUTPUT FORMAT

Work in small phases.

For every phase:

Explain the objective.

Generate files.

Explain architecture.

Verify.

Continue.

---

# STOP CONDITION

When backend bootstrap is complete:

Summarize:

- Folder structure
- Installed dependencies
- Generated files
- Architecture decisions

Wait for approval.

Do not continue to frontend bootstrap.