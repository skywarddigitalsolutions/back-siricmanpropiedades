#!/usr/bin/env bash
# Daily Postgres backup for the Siricman stack (runs on the host, from cron).
#
# Dumps the database through `docker compose exec -T db` (no port is published),
# validates the dump, then rotates old ones. It refuses to run when the backup
# filesystem is low on space so backups can never starve the server or uploads.
#
# Env (all optional):
#   SIRICMAN_DIR        compose project dir          (default: $HOME/siricman)
#   BACKUP_DIR          where dumps are stored       (default: $SIRICMAN_DIR/backups)
#   BACKUP_KEEP         newest dumps to keep         (default: 7)
#   BACKUP_MIN_FREE_MB  minimum free space in MB     (default: 2048)
#
# Exit codes: 0 ok, 2 skipped (low disk), other non-zero = failure.
set -euo pipefail

SIRICMAN_DIR="${SIRICMAN_DIR:-$HOME/siricman}"
BACKUP_DIR="${BACKUP_DIR:-$SIRICMAN_DIR/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-7}"
BACKUP_MIN_FREE_MB="${BACKUP_MIN_FREE_MB:-2048}"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "$(ts) $*"; }
err() { echo "$(ts) $*" >&2; }

dc() { docker compose --project-directory "$SIRICMAN_DIR" "$@"; }

mkdir -p "$BACKUP_DIR"

free_mb="$(df -Pm "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
if [ "$free_mb" -lt "$BACKUP_MIN_FREE_MB" ]; then
  err "SKIPPED: only ${free_mb} MB free (< ${BACKUP_MIN_FREE_MB} MB)"
  exit 2
fi

stamp="$(date '+%Y%m%d-%H%M%S')"
final="$BACKUP_DIR/siricman-${stamp}.dump"
partial="${final}.partial"

# Any failure from here on removes the partial file and never rotates.
cleanup() {
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    rm -f "$partial"
    err "ERROR: backup failed (exit $rc), partial file removed"
  fi
}
trap cleanup EXIT

# Credentials are read inside the container, never passed through the host.
dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$partial"

if [ ! -s "$partial" ]; then
  err "ERROR: pg_dump produced an empty file"
  exit 1
fi

# A dump that pg_restore cannot list is not a backup.
dc exec -T db pg_restore --list < "$partial" > /dev/null

mv "$partial" "$final"

# Rotation: names embed the timestamp, so reverse name order is newest first.
# Only siricman-*.dump files are ever considered.
shopt -s nullglob
dumps=("$BACKUP_DIR"/siricman-*.dump)
shopt -u nullglob
if [ "${#dumps[@]}" -gt "$BACKUP_KEEP" ]; then
  mapfile -t old < <(printf '%s\n' "${dumps[@]}" | sort -r | tail -n +"$((BACKUP_KEEP + 1))")
  rm -f -- "${old[@]}"
fi

size="$(du -h "$final" | cut -f1)"
log "OK: $(basename "$final") (${size})"
