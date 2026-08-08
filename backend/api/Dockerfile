# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# Super Dreams API — production-grade multi-stage image.
#
# This deliberately does NOT use Nixpacks/Railpack auto-sequencing. The build
# is fully explicit and deterministic:
#   builder  — install ALL deps (incl. devDependencies) and compile with tsup
#   pruner   — produce a self-contained, PRODUCTION-ONLY bundle via `pnpm deploy`
#   runtime  — copy only the pruned bundle; run migrate -> seed -> server
#
# Build context MUST be the repository root (the pnpm workspace root), so the
# workspace lockfile and all package manifests are available. In railway.json:
#   "builder": "DOCKERFILE", "dockerfilePath": "backend/api/Dockerfile".
# ---------------------------------------------------------------------------

# Pin the runtime major to the repo's engines (node >=24). Debian slim (glibc)
# keeps the @node-rs/argon2 native prebuild path simple and reliable.
ARG NODE_IMAGE=node:24-slim

# ---------------------------------------------------------------------------
# Stage 1: builder — full install + compile
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS builder
ENV CI=true
# Corepack activates the exact pnpm pinned in the root package.json
# ("packageManager": "pnpm@9.12.0"), so the image and local dev match.
RUN corepack enable
WORKDIR /repo

# Copy the whole workspace. .dockerignore keeps node_modules/dist/.git/etc out,
# so this is the source + manifests + lockfile + migrations only.
COPY . .

# Install every dependency (including devDependencies such as tsup) regardless
# of NODE_ENV. (No BuildKit cache mount here — Railway's builder rejects
# un-namespaced cache ids; a plain install is portable across builders.)
RUN pnpm install --frozen-lockfile

# Compile the API (tsup -> backend/api/dist: server.js, migrate.js, seed.js).
RUN pnpm --filter @superdreams/api build

# Produce a self-contained, production-only deployment of just the API:
# dist/, drizzle/, package.json and a prod-only node_modules (no devDeps).
RUN pnpm --filter @superdreams/api deploy --prod /prod

# ---------------------------------------------------------------------------
# Stage 2: runtime — minimal, production-only
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy only the pruned bundle from the builder — no source, no devDependencies,
# no build tooling. This is the entire runtime surface.
COPY --from=builder --chown=node:node /prod/package.json ./package.json
COPY --from=builder --chown=node:node /prod/node_modules ./node_modules
COPY --from=builder --chown=node:node /prod/dist ./dist
COPY --from=builder --chown=node:node /prod/drizzle ./drizzle

# TEMPORARY DIAGNOSTIC (Phase 2 login outage): the startup wrapper reports the
# exact exit status/signal of migrate/seed/server so the failing stage is fully
# observable in Railway logs. Copied from the build context (not the pruned
# /prod bundle). Revert CMD to the plain chain below once diagnosed:
#   CMD ["sh", "-c", "node dist/migrate.js && node dist/seed.js && exec node dist/server.js"]
COPY --chown=node:node backend/api/scripts/start.sh ./scripts/start.sh

# Drop privileges.
USER node

# The server reads PORT/HOST from the environment (Railway injects PORT); it
# defaults to 0.0.0.0. Documented for clarity.
EXPOSE 3000

# Run the diagnostic startup wrapper (see backend/api/scripts/start.sh). It runs
# migrate -> seed -> server sequentially and prints each stage's exit/signal.
CMD ["sh", "scripts/start.sh"]
