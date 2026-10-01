# Feature 10 — Daily DB backups + uptime monitoring

**Objective:** a daily, self-rotating Postgres dump on the VPS that can never fill the disk, a tested restore procedure, and an external uptime monitor that emails when the site or API goes down.

**Problem / why:** today there is no database backup at all. DonWeb's plan already includes a weekly server backup ("Backup: Premium Semanal"), which covers losing the VPS and the `media_data` photos. What it does not cover is a human or app error between weekly snapshots (deleted properties, a bad migration, `docker compose down -v`). A daily dump closes that gap cheaply.

## Scope

- In: daily compressed `pg_dump` on the same VPS (keep last 7, auto-rotate), skip when free disk < 2 GB; restore script + runbook; `GET /api/health` (DB check) for monitoring; UptimeRobot (free) HTTP monitors for site + API with email alerts (set up by the user, documented in the runbook).
- Out: offsite copy, `media_data` backup (covered by DonWeb weekly), other monitoring (metrics, logs, heartbeat for the cron).

## Constraints and decisions

- Hard user condition: backups must never eat the space the server and property uploads need → the dump is skipped (non-zero exit, logged) when free space on the backup filesystem is below `BACKUP_MIN_FREE_MB` (default 2048).
- Scripts run on the host from the user's crontab (`matias` is in the `docker` group) and talk to Postgres through `docker compose exec -T db` — no port is published.
- Dump format: `pg_dump -Fc` (custom, already compressed, restorable selectively). Written to a temp file, validated with `pg_restore --list`, then renamed; a failed dump leaves no partial file and does not rotate.
- Rotation only after a successful dump; keep the newest 7.
- Restore asks for explicit confirmation, takes a safety dump first (same disk guard), stops `api` during the restore, and starts it again.
- Repo has `core.autocrlf=true` and the runbook copies files with `scp` from the working tree → `.gitattributes` forces LF for `*.sh` (CRLF breaks bash).
- `/api/health` is public, returns 200 `{status:"ok"}` when `SELECT 1` succeeds and 503 otherwise; UptimeRobot treats 4xx/5xx as down, so a 401 endpoint cannot be monitored.

## TDD

- Mode: strict TDD enabled (source: user global orchestrator config). Runner: `npm test` (Jest) for the health endpoint; `bash deploy/backup/test/run-tests.sh` (bash harness with a stubbed `docker`) for the scripts. RED observed before GREEN.

## Tasks

| ID | Task | Route | Status | Commit |
|----|------|-------|--------|--------|
| T1 | `GET /api/health` with DB check (public, unit-tested) | delegated (writer trigger: 2+ files) | ✅ | 635a32f |
| T2 | `.gitattributes` LF for `*.sh`; `deploy/backup/pg-backup.sh` + bash test harness | delegated | ✅ | d5492d5 |
| T3 | `deploy/backup/pg-restore.sh` + tests | delegated | ✅ | f6dc461 |
| T4 | Runbook section 10 (install cron, measure DB size, restore, UptimeRobot); section 6 note about media | delegated | ✅ | 8f1cb1d |

## Acceptance criteria

- `bash deploy/backup/test/run-tests.sh` green: dump created + validated, low disk skips with non-zero exit and no file, failed dump leaves no partial file and no rotation, rotation keeps 7, restore refuses without confirmation.
- `npm run lint`, `npm test`, `npm run build` green.
- On the server (user): cron installed, first dump present, DB size recorded, UptimeRobot monitors green.

## Progress

- 2026-10-01: feature started, branch `feat/backups-monitoring`, doc created. RDD: off (default).

- 2026-10-01 T1: RED (`Cannot find module './health.controller'`), GREEN 3/3 health tests; full `npm test` 430/430, lint and build clean.
- 2026-10-01 T2: harness RED (4 FAIL, script missing), GREEN 7/7 after `pg-backup.sh`; `.gitattributes` forces LF, `git ls-files --eol` shows i/lf w/lf.
- 2026-10-01 T3: harness RED (3 FAIL for the happy/failure-restart paths), GREEN 15/15 after `pg-restore.sh`.
- 2026-10-01 T4: runbook section 10 added, section 6 media note updated (photos covered by DonWeb weekly backup).

- 2026-10-01: fix commit `fix(deploy): restore dumps in a single transaction` (all-or-nothing restore); back PR #27 merged, GHCR build green.
- 2026-10-01 rollout (run by the user): the server was still on the feature 2 deploy, so the first `pull` crashed the API (`MEDIA_PUBLIC_BASE_URL is required`). Applied runbook sections 6-8 (new `compose.yml` + `Caddyfile`, `MEDIA_PUBLIC_BASE_URL` in `.env`); `/api/health` 200, site 200, `API_INTERNAL_URL`/`SITE_URL` correct, all 4 containers Up.
- 2026-10-01 rollout: DB size 8303 kB; disk 34G, 29G free; first manual dump `siricman-20261001-114324.dump` (33K) OK; crontab `30 3 * * *` installed (server clock is UTC-3, so 03:30 local); UptimeRobot monitors for the site and `/api/health` Up at a 5-minute interval with email alerts.

## Next step

Feature done. Check `~/siricman/backups/backup.log` after the first nightly run (2026-10-02 03:30).
