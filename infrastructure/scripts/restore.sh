#!/usr/bin/env bash
# Restore PostgreSQL from a gzipped dump: restore.sh <file.sql.gz>
set -euo pipefail
cd "$(dirname "$0")/../.."
ENV_FILE="${ENV_FILE:-.env.development}"
set -a; . "$ENV_FILE"; set +a
FILE="${1:-}"
[[ -n "$FILE" && -f "$FILE" ]] || { echo "Usage: $0 <backup.sql.gz>"; exit 1; }
echo "Restoring '$FILE' into database '${POSTGRES_DB}'…"
gunzip -c "$FILE" | docker compose --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "Restore complete."
