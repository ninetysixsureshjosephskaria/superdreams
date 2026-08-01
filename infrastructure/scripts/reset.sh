#!/usr/bin/env bash
# Tear down the stack AND remove named volumes (destroys all local data).
set -euo pipefail
cd "$(dirname "$0")/../.."
ENV_FILE="${ENV_FILE:-.env.development}"
echo "WARNING: this removes containers and named volumes (all local DB/Redis data)."
read -r -p "Continue? [y/N] " reply
[[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
docker compose --env-file "$ENV_FILE" down -v
echo "Stack reset."
