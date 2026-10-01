#!/usr/bin/env bash
# Restore a pg-backup.sh dump into the production database (DESTRUCTIVE).
#
# Usage: pg-restore.sh [--yes] <dump-file>
#
# Flow: validate file -> confirm (type RESTAURAR, or --yes) -> safety dump of the
# current database via pg-backup.sh (abort if it fails or is skipped) -> stop
# `api` -> pg_restore --clean (single transaction: all or nothing) -> start `api` again (also when the restore fails).
#
# Env: SIRICMAN_DIR (default $HOME/siricman); BACKUP_* are forwarded to
# pg-backup.sh for the safety dump.
set -euo pipefail

SIRICMAN_DIR="${SIRICMAN_DIR:-$HOME/siricman}"
export SIRICMAN_DIR
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "$(ts) $*"; }
err() { echo "$(ts) $*" >&2; }
dc() { docker compose --project-directory "$SIRICMAN_DIR" "$@"; }

assume_yes=0
dump_file=""
for arg in "$@"; do
  case "$arg" in
    --yes) assume_yes=1 ;;
    -*) err "ERROR: unknown option $arg"; exit 64 ;;
    *) dump_file="$arg" ;;
  esac
done

if [ -z "$dump_file" ]; then
  err "Usage: pg-restore.sh [--yes] <dump-file>"
  exit 64
fi
if [ ! -f "$dump_file" ]; then
  err "ERROR: dump file not found: $dump_file"
  exit 1
fi

if [ "$assume_yes" -ne 1 ]; then
  echo "This REPLACES the current database with: $dump_file"
  echo "The API will be stopped during the restore."
  printf 'Type RESTAURAR to continue: '
  answer=""
  read -r answer || true
  if [ "$answer" != "RESTAURAR" ]; then
    err "Aborted: confirmation not received."
    exit 1
  fi
fi

log "Taking a safety dump of the current database first..."
if ! bash "$SCRIPT_DIR/pg-backup.sh"; then
  err "ERROR: safety dump failed or was skipped; restore aborted, nothing was changed."
  exit 1
fi

log "Stopping api..."
dc stop api

start_api() {
  log "Starting api..."
  dc start api || err "ERROR: could not start api, run 'docker compose start api' manually"
}
trap start_api EXIT

log "Restoring $dump_file..."
dc exec -T db sh -c \
  'pg_restore --clean --if-exists --no-owner --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$dump_file"

log "OK: restore finished."
