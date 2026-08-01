#!/usr/bin/env bash
# Stop the stack (containers only; data volumes are preserved).
set -euo pipefail
cd "$(dirname "$0")/../.."
ENV_FILE="${ENV_FILE:-.env.development}"
docker compose --env-file "$ENV_FILE" down
