#!/usr/bin/env bash
# Bring up the full Super Dreams stack (build + start).
set -euo pipefail
cd "$(dirname "$0")/../.."
ENV_FILE="${ENV_FILE:-.env.development}"
echo "Starting Super Dreams stack (env: $ENV_FILE)…"
docker compose --env-file "$ENV_FILE" up -d --build
docker compose --env-file "$ENV_FILE" ps
