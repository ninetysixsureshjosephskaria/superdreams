# syntax=docker/dockerfile:1
#
# Super Dreams BCC (React + Vite) — build static assets, serve with Nginx.
# Build context is the repository root (pnpm workspace).

# --- Base: Node LTS + pnpm via corepack ------------------------------------
FROM node:24-alpine AS base
ENV CI=true
RUN corepack enable
WORKDIR /repo

# --- Dependencies: install using only manifests ----------------------------
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

# --- Build: Vite production build (env baked at build time) -----------------
FROM deps AS build
# Vite only exposes VITE_-prefixed variables to the client bundle.
ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_APP_NAME="Super Dreams — Business Control Center"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
COPY . .
RUN pnpm --filter @superdreams/bcc build

# --- Runtime: static files served by unprivileged Nginx --------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner
# PORT is injected by the platform (Railway) at runtime; default to 8080 so the
# image also works under docker-compose. The base image's entrypoint runs
# envsubst on templates, rendering ${PORT} into the active server config.
ENV PORT=8080
COPY infrastructure/docker/bcc/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/bcc/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:${PORT}/healthz" || exit 1
