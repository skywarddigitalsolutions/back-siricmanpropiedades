#!/usr/bin/env bash
# Test harness for pg-backup.sh / pg-restore.sh. Plain bash, no dependencies:
# a stub `docker` is put first in PATH so no real Docker or Postgres is needed.
# Stub behaviour is driven by env vars:
#   STUB_FAIL_DUMP=1      pg_dump exits 1 after writing a few bytes
#   STUB_FAIL_VALIDATE=1  pg_restore --list exits 1
#   STUB_FAIL_RESTORE=1   pg_restore (real restore) exits 1
#   STUB_LOG=<file>       every docker invocation is appended here
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SH="$HERE/../pg-backup.sh"
RESTORE_SH="$HERE/../pg-restore.sh"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/bin"
cat > "$WORK/bin/docker" <<'STUB'
#!/usr/bin/env bash
args="$*"
[ -n "${STUB_LOG:-}" ] && echo "docker $args" >> "$STUB_LOG"
case "$args" in
  *"pg_dump"*)
    printf 'FAKEDUMP'
    [ "${STUB_FAIL_DUMP:-}" = 1 ] && exit 1
    printf 'DATA'
    exit 0 ;;
  *"pg_restore --list"*)
    cat > /dev/null
    [ "${STUB_FAIL_VALIDATE:-}" = 1 ] && exit 1
    exit 0 ;;
  *"pg_restore"*)
    cat > /dev/null
    [ "${STUB_FAIL_RESTORE:-}" = 1 ] && exit 1
    exit 0 ;;
esac
exit 0
STUB
chmod +x "$WORK/bin/docker"
export PATH="$WORK/bin:$PATH"

FAILURES=0
CASE=0

# new_case: fresh SIRICMAN_DIR / BACKUP_DIR / stub log, clean stub env.
new_case() {
  CASE=$((CASE + 1))
  CASE_DIR="$WORK/case$CASE"
  mkdir -p "$CASE_DIR/siricman"
  export SIRICMAN_DIR="$CASE_DIR/siricman"
  export BACKUP_DIR="$CASE_DIR/backups"
  export STUB_LOG="$CASE_DIR/docker.log"
  : > "$STUB_LOG"
  unset STUB_FAIL_DUMP STUB_FAIL_VALIDATE STUB_FAIL_RESTORE BACKUP_KEEP BACKUP_MIN_FREE_MB
  export BACKUP_MIN_FREE_MB=1
}

check() { # check <name> <condition-exit-code>
  if [ "$2" -eq 0 ]; then echo "PASS: $1"; else echo "FAIL: $1"; FAILURES=$((FAILURES + 1)); fi
}

count() { # count <glob-dir> <pattern>
  local n=0 f
  for f in "$1"/$2; do [ -e "$f" ] && n=$((n + 1)); done
  echo "$n"
}

seed_dumps() { # seed_dumps <n>: n old dumps with ascending timestamp names
  mkdir -p "$BACKUP_DIR"
  local i
  for i in $(seq 1 "$1"); do
    printf 'old%s' "$i" > "$BACKUP_DIR/$(printf 'siricman-20200101-0000%02d.dump' "$i")"
  done
}

# --- pg-backup.sh ---------------------------------------------------------

new_case
bash "$BACKUP_SH" > "$CASE_DIR/out" 2> "$CASE_DIR/err"; rc=$?
[ "$rc" -eq 0 ] && [ "$(count "$BACKUP_DIR" 'siricman-*.dump')" -eq 1 ] \
  && [ "$(count "$BACKUP_DIR" '*.partial')" -eq 0 ]
check "backup success creates exactly one .dump and no .partial" $?

new_case
BACKUP_MIN_FREE_MB=999999999 bash "$BACKUP_SH" > "$CASE_DIR/out" 2> "$CASE_DIR/err"; rc=$?
[ "$rc" -eq 2 ] && grep -q 'SKIPPED' "$CASE_DIR/err" \
  && [ "$(count "$BACKUP_DIR" '*')" -eq 0 ]
check "low disk exits 2 with SKIPPED and creates no file" $?

new_case
seed_dumps 3
STUB_FAIL_DUMP=1 bash "$BACKUP_SH" > "$CASE_DIR/out" 2> "$CASE_DIR/err"; rc=$?
[ "$rc" -ne 0 ] && [ "$(count "$BACKUP_DIR" '*.partial')" -eq 0 ] \
  && [ "$(count "$BACKUP_DIR" 'siricman-*.dump')" -eq 3 ]
check "failing pg_dump: non-zero, no .partial, existing dumps untouched" $?

new_case
seed_dumps 9
STUB_FAIL_DUMP=1 BACKUP_KEEP=2 bash "$BACKUP_SH" > /dev/null 2>&1
[ "$(count "$BACKUP_DIR" 'siricman-*.dump')" -eq 9 ]
check "failing pg_dump does not rotate" $?

new_case
seed_dumps 3
STUB_FAIL_VALIDATE=1 bash "$BACKUP_SH" > "$CASE_DIR/out" 2> "$CASE_DIR/err"; rc=$?
[ "$rc" -ne 0 ] && [ "$(count "$BACKUP_DIR" '*.partial')" -eq 0 ] \
  && [ "$(count "$BACKUP_DIR" 'siricman-*.dump')" -eq 3 ]
check "failing validation: non-zero, no .partial, existing dumps untouched" $?

new_case
seed_dumps 9
bash "$BACKUP_SH" > /dev/null 2>&1; rc=$?
[ "$rc" -eq 0 ] && [ "$(count "$BACKUP_DIR" 'siricman-*.dump')" -eq 7 ] \
  && [ ! -e "$BACKUP_DIR/siricman-20200101-000001.dump" ] \
  && [ ! -e "$BACKUP_DIR/siricman-20200101-000003.dump" ] \
  && [ -e "$BACKUP_DIR/siricman-20200101-000004.dump" ] \
  && [ -e "$BACKUP_DIR/siricman-20200101-000009.dump" ]
check "rotation keeps the newest 7 (9 old + 1 new)" $?

new_case
seed_dumps 3
echo keep > "$BACKUP_DIR/backup.log"
BACKUP_KEEP=1 bash "$BACKUP_SH" > /dev/null 2>&1
[ -e "$BACKUP_DIR/backup.log" ] && [ "$(count "$BACKUP_DIR" 'siricman-*.dump')" -eq 1 ]
check "rotation only touches siricman-*.dump files" $?

# --- pg-restore.sh --------------------------------------------------------

make_dump() { printf 'FAKEDUMP' > "$CASE_DIR/restore-me.dump"; }
log_line() { grep -n "$1" "$STUB_LOG" | head -1 | cut -d: -f1; } # first line number matching

new_case
bash "$RESTORE_SH" --yes "$CASE_DIR/does-not-exist.dump" > /dev/null 2>&1; rc=$?
[ "$rc" -ne 0 ] && ! grep -q 'stop' "$STUB_LOG"
check "restore: missing file exits non-zero without touching docker" $?

new_case
make_dump
echo "no" | bash "$RESTORE_SH" "$CASE_DIR/restore-me.dump" > /dev/null 2>&1; rc=$?
[ "$rc" -ne 0 ] && ! grep -q 'pg_restore' "$STUB_LOG" && ! grep -q ' stop ' "$STUB_LOG" \
  && [ "$(count "$BACKUP_DIR" '*')" -eq 0 ]
check "restore: wrong confirmation word aborts before any docker call" $?

new_case
make_dump
bash "$RESTORE_SH" "$CASE_DIR/restore-me.dump" > /dev/null 2>&1 < /dev/null; rc=$?
[ "$rc" -ne 0 ] && ! grep -q 'pg_restore' "$STUB_LOG"
check "restore: no confirmation (empty stdin) aborts" $?

new_case
make_dump
bash "$RESTORE_SH" --yes "$CASE_DIR/restore-me.dump" > /dev/null 2>&1; rc=$?
dump_l="$(log_line 'pg_dump')"; stop_l="$(log_line ' stop api')"
restore_l="$(log_line 'pg_restore --clean --if-exists --no-owner')"; start_l="$(log_line ' start api')"
[ "$rc" -eq 0 ] && [ -n "$dump_l" ] && [ -n "$stop_l" ] && [ -n "$restore_l" ] && [ -n "$start_l" ] \
  && [ "$dump_l" -lt "$stop_l" ] && [ "$stop_l" -lt "$restore_l" ] && [ "$restore_l" -lt "$start_l" ] \
  && [ "$(count "$BACKUP_DIR" 'siricman-*.dump')" -eq 1 ]
check "restore --yes: safety dump, then stop, restore, start in order" $?

new_case
make_dump
echo "RESTAURAR" | bash "$RESTORE_SH" "$CASE_DIR/restore-me.dump" > /dev/null 2>&1; rc=$?
[ "$rc" -eq 0 ] && grep -q 'pg_restore --clean' "$STUB_LOG"
check "restore: typing RESTAURAR confirms" $?

new_case
make_dump
STUB_FAIL_DUMP=1 bash "$RESTORE_SH" --yes "$CASE_DIR/restore-me.dump" > /dev/null 2>&1; rc=$?
[ "$rc" -ne 0 ] && ! grep -q ' stop ' "$STUB_LOG" && ! grep -q 'pg_restore --clean' "$STUB_LOG"
check "restore: failed safety dump aborts before stopping the API" $?

new_case
make_dump
BACKUP_MIN_FREE_MB=999999999 bash "$RESTORE_SH" --yes "$CASE_DIR/restore-me.dump" > /dev/null 2>&1; rc=$?
[ "$rc" -ne 0 ] && ! grep -q ' stop ' "$STUB_LOG" && ! grep -q 'pg_restore --clean' "$STUB_LOG"
check "restore: skipped safety dump (low disk) aborts the restore" $?

new_case
make_dump
STUB_FAIL_RESTORE=1 bash "$RESTORE_SH" --yes "$CASE_DIR/restore-me.dump" > /dev/null 2>&1; rc=$?
stop_l="$(log_line ' stop api')"; start_l="$(log_line ' start api')"
[ "$rc" -ne 0 ] && [ -n "$stop_l" ] && [ -n "$start_l" ] && [ "$stop_l" -lt "$start_l" ]
check "restore: failing pg_restore still restarts the API and exits non-zero" $?

echo
if [ "$FAILURES" -eq 0 ]; then echo "All tests passed."; else echo "$FAILURES test(s) failed."; exit 1; fi
