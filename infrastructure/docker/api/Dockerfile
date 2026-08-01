# syntax=docker/dockerfile:1
#
# Super Dreams API (Fastify) — multi-stage, production image.
# Build context is the repository root (pnpm workspace).

# --- Base: Node LTS + pnpm via corepack ------------------------------------
FROM node:24-alpine AS base
ENV CI=true
RUN corepack enable
WORKDIR /repo

# --- Dependencies: install using only manifests (cached across source edits)-
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY backend/api/package.json backend/api/
COPY apps/bcc/package.json apps/bcc/
COPY apps/member/package.json apps/member/
COPY packages/ui/package.json packages/ui/
COPY packages/theme/package.json packages/theme/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/constants/package.json packages/constants/
COPY packages/validation/package.json packages/validation/
COPY packages/api-client/package.json packages/api-client/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build + prune to a production-only deployment -------------------------
FROM deps AS build
COPY . .
RUN pnpm --filter @superdreams/api build \
 && pnpm --filter @superdreams/api --prod deploy --legacy /deploy

# --- Runtime: minimal, non-root -------------------------------------------
FROM node:24-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /deploy/package.json ./package.json
COPY --from=build /repo/backend/api/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
