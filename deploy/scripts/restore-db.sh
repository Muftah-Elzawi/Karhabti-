#!/usr/bin/env bash
#
# Karhabti — Postgres restore (run on the VPS).
#
# DESTRUCTIVE: replaces the current database contents with a backup produced by
# backup-db.sh (the dump uses --clean --if-exists, so existing objects are
# dropped and recreated). Stop the API first so nothing writes mid-restore.
#
# Usage:
#   bash deploy/scripts/restore-db.sh /home/deploy/backups/karhabti-YYYYMMDD-HHMMSS.sql.gz
#
# Test this at least once before launch (restore into a throwaway DB or a
# staging box) so you know the backups are actually usable.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.staging.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env.staging}"
DB_USER="${DB_USER:-karhabti}"
DB_NAME="${DB_NAME:-karhabti}"

backup_file="${1:-}"
if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set (in $ENV_FILE or the environment)}"

read -r -p "Restore '$backup_file' over database '$DB_NAME'? This is destructive. [y/N] " confirm
[[ "$confirm" == "y" || "$confirm" == "Y" ]] || { echo "Aborted."; exit 1; }

echo "[$(date -Is)] restoring $DB_NAME from $backup_file"
gunzip -c "$backup_file" \
  | docker compose -f "$COMPOSE_FILE" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1

echo "[$(date -Is)] restore complete — restart the API and verify /api/v1/health"
