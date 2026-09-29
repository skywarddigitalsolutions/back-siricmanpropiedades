# Apply Progress: Property Images

## Scope of this record

Phase 1 only (infra slice, PR 1, tasks 1.1–1.8). Phases 2–6 are not started.

## Mode

Standard (Phase 1 has no `.ts` changes — `tasks.md` states "No TDD tasks — this
slice changes no `.ts` file"). Strict TDD applies starting Phase 2.

## Completed Tasks

- [x] 1.1 `Dockerfile`: `runner` stage creates `/app/storage/media` and
      `chown -R node:node /app/storage` immediately before `USER node`.
- [x] 1.2 `deploy/compose.yml`: named volume `media_data` mounted rw at
      `/app/storage/media` on `api`, ro at `/srv/media` on `caddy`;
      `MEDIA_ROOT: /app/storage/media` forced in `api.environment`; top-level
      `volumes: media_data:` entry added.
- [x] 1.3 `deploy/Caddyfile`: `{$API_DOMAIN}` block gains `request_body { max_size
      16MB }` and a `handle_path /media/*` block (webp-only, immutable cache
      header only on `@exists`, `nosniff`, no directory browsing) before the
      fallback `handle { reverse_proxy api:3000 }`, matching `design.md`
      exactly.
- [x] 1.4 `deploy/env.production.example`: added
      `MEDIA_PUBLIC_BASE_URL=https://api.<dominio>/media` with the explanatory
      comment from `design.md`.
- [x] 1.5 `deploy/README.md`: appended `## 6. Fotos de propiedades (volumen de
      medios)` verbatim from `design.md`, plus a one-line cross-reference from
      section 4.
- [x] 1.6 `.gitignore`: added `/storage`.
- [x] 1.7 Note-only task — see "Server-side steps" below, relayed to the user
      in the final report.
- [x] 1.8 Verification — see table below.

## Deviations from Design

None — implementation matches `design.md`'s Caddyfile, compose deltas, env
var, and runbook text exactly (Reconciliation Note 4 in `tasks.md` already
scoped `.env.example` out of this phase; Phase 1 only touches
`deploy/env.production.example`, which this environment permits reading and
writing since it does not match the `.env*` glob).

## Issues Found

None.

## Work Unit Evidence (Unit 1 — Infra)

| Evidence | Result |
|---|---|
| Focused test command | `npm test` → 27 suites / 282 tests passed (no `.ts` file changed, confirms no regression) |
| Structural infra validation | `docker run --rm -v <abs>/deploy/Caddyfile:/etc/caddy/Caddyfile:ro -e SITE_DOMAIN=example.com -e API_DOMAIN=api.example.com -e ACME_EMAIL=test@example.com caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` → `Valid configuration`. `docker compose -f deploy/compose.yml [-f <temp override removing env_file>] config -q` → exit 0 (temp override file created only to bypass the required `deploy/.env`, which this environment must never create; deleted immediately after, never committed) |
| Full verification (Task 1.8) | `npm test`: 27 passed / 282 passed. `npm run lint`: no errors. `npx tsc -p tsconfig.build.json --noEmit`: no errors. `npm run build`: success. Identical to pre-change baseline as expected (no `.ts` file touched) |
| Runtime harness | N/A for this slice — inert until the user applies `deploy/README.md` section 6 on the server; the harness is the `curl -I .../media/...` step documented there, to be run by the user post-deploy |
| Rollback boundary | Revert this commit alone: the volume/env var/Caddy route are unused until Phase 2+ code ships; the server can safely have section 6 applied ahead of time per the runbook |

## Remaining Tasks

- [ ] Phase 2 (2.1–2.19): Media core (`sharp`, `StoragePort`/`LocalDiskStorage`,
      `ImageProcessor`/`SharpImageProcessor`, `Semaphore`, `MediaUrlBuilder`,
      `MediaModule`, dev static serving).
- [ ] Phase 3 (3.1–3.13): Schema + persistence + central `AuditLogService` fix.
- [ ] Phase 4 (4.1–4.7): Upload.
- [ ] Phase 5 (5.1–5.15): Reorder + delete + admin `findOne` + hard-delete cleanup.
- [ ] Phase 6 (6.1–6.6): Public catalog.

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per the tasks artifact's Chain
  strategy).
- Current work unit: Unit 1 — Infra (PR 1, ~67 changed lines).
- Boundary: starts from `b18a3b9` (planning artifacts only); ends with this
  phase's infra-only commit on `feat/images-1-infra`. No `.ts` file touched.
- Estimated review budget impact: well under the 400-line budget (`git diff
  --stat main...HEAD -- . ':!openspec'` → 6 files changed, 67 insertions(+),
  1 deletion(-)).

## Server-side steps required from the user (relay verbatim)

Before deploying Phase 2 or later, the user must apply `deploy/README.md`
section 6 on the VPS:

1. `scp -P 5941 deploy/compose.yml deploy/Caddyfile siricman:~/siricman/`
2. Add `MEDIA_PUBLIC_BASE_URL=https://api.<dominio>/media` (no trailing
   slash) to the server's `.env`.
3. `docker compose pull && docker compose up -d`.
4. Verify: `docker compose logs api` shows no `MEDIA_*`/write errors;
   `docker compose exec api sh -c 'ls -ld /app/storage/media'` shows `node` as
   owner; after uploading a photo (once Phase 4 ships),
   `curl -I https://api.<dominio>/media/properties/<id>/<imagen>-thumb.webp`
   returns `200` with `Cache-Control: public, max-age=31536000, immutable`.
5. Space check: `docker system df -v | grep media_data` or `docker compose
   exec api du -sh /app/storage/media`.

Skipping this before Phase 2+ deploys would crash the API on deploy (Phase 2
adds a boot-time writability check and, in production, a required
`MEDIA_PUBLIC_BASE_URL`) or write uploads into the container layer (lost on
recreate).

## Status

8/8 Phase 1 tasks complete (8/~90 total tasks across all 6 phases). Ready for
the user to review/merge PR 1 and for the next `sdd-apply` batch to start
Phase 2. Do NOT start Phase 2 in this batch per the orchestrator's explicit
scope limit.
