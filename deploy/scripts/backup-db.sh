#!/usr/bin/env bash
#
# Karhabti — Postgres backup (run on the VPS).
#
# Dumps the dockerised Postgres to a timestamped, gzipped file and prunes
# backups older than RETAIN_DAYS. Designed for a daily cron job:
#
#   30 2 * * * cd /home/deploy/karhabti && BACKUP_DIR=/home/deploy/backups \
#     bash deploy/scripts/backup-db.sh >> /home/deploy/backups/backup.log 2>&1
#
# Off-site copies (Cloudflare R2 / S3) are a separate step — see
# deploy/LAUNCH_READINESS.md §2.
set -euo pipefail

# Run from the repo root (cron `cd`s there). Override any of these via env.
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.staging.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env.staging}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
DB_USER="${DB_USER:-karhabti}"
DB_NAME="${DB_NAME:-karhabti}"

# POSTGRES_PASSWORD comes from the deploy env file (used inside the container).
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set (in $ENV_FILE or the environment)}"

mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"
outfile="$BACKUP_DIR/karhabti-$stamp.sql.gz"

echo "[$(date -Is)] backing up $DB_NAME -> $outfile"
docker compose -f "$COMPOSE_FILE" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip > "$outfile"

# Fail loudly on an empty/aborted dump rather than keeping a useless file.
if [[ ! -s "$outfile" ]]; then
  echo "[$(date -Is)] ERROR: backup is empty, removing" >&2
  rm -f "$outfile"
  exit 1
fi

echo "[$(date -Is)] done ($(du -h "$outfile" | cut -f1)); pruning > ${RETAIN_DAYS}d"
find "$BACKUP_DIR" -name 'karhabti-*.sql.gz' -type f -mtime "+$RETAIN_DAYS" -delete
