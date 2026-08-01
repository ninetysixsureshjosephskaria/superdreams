#!/usr/bin/env bash
# Back up PostgreSQL to infrastructure/backups/ (gzipped), keeping the last 10.
set -euo pipefail
cd "$(dirname "$0")/../.."
ENV_FILE="${ENV_FILE:-.env.development}"
set -a; . "$ENV_FILE"; set +a
BACKUP_DIR="infrastructure/backups"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/superdreams-$STAMP.sql.gz"
echo "Backing up database '${POSTGRES_DB}' -> $OUT"
docker compose --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$OUT"
echo "Done: $OUT"
# Rotation: keep the 10 most recent backups.
ls -1t "$BACKUP_DIR"/superdreams-*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
