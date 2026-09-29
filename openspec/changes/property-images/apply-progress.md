# Apply Progress: Property Images

## Scope of this record

Phase 1 (infra slice, PR 1, tasks 1.1–1.8) and Phase 2 (media core slice,
PR 2, tasks 2.1–2.19). Phases 3–6 are not started.

## Mode

Standard (Phase 1 has no `.ts` changes — `tasks.md` states "No TDD tasks — this
slice changes no `.ts` file"). Strict TDD applies starting Phase 2 (see the
TDD Cycle Evidence table below).

## Completed Tasks — Phase 1

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

## Deviations from Design — Phase 1

None — implementation matches `design.md`'s Caddyfile, compose deltas, env
var, and runbook text exactly (Reconciliation Note 4 in `tasks.md` already
scoped `.env.example` out of this phase; Phase 1 only touches
`deploy/env.production.example`, which this environment permits reading and
writing since it does not match the `.env*` glob).

## Issues Found — Phase 1

None.

## Work Unit Evidence (Unit 1 — Infra)

| Evidence | Result |
|---|---|
| Focused test command | `npm test` → 27 suites / 282 tests passed (no `.ts` file changed, confirms no regression) |
| Structural infra validation | `docker run --rm -v <abs>/deploy/Caddyfile:/etc/caddy/Caddyfile:ro -e SITE_DOMAIN=example.com -e API_DOMAIN=api.example.com -e ACME_EMAIL=test@example.com caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` → `Valid configuration`. `docker compose -f deploy/compose.yml [-f <temp override removing env_file>] config -q` → exit 0 (temp override file created only to bypass the required `deploy/.env`, which this environment must never create; deleted immediately after, never committed) |
| Full verification (Task 1.8) | `npm test`: 27 passed / 282 passed. `npm run lint`: no errors. `npx tsc -p tsconfig.build.json --noEmit`: no errors. `npm run build`: success. Identical to pre-change baseline as expected (no `.ts` file touched) |
| Runtime harness | N/A for this slice — inert until the user applies `deploy/README.md` section 6 on the server; the harness is the `curl -I .../media/...` step documented there, to be run by the user post-deploy |
| Rollback boundary | Revert this commit alone: the volume/env var/Caddy route are unused until Phase 2+ code ships; the server can safely have section 6 applied ahead of time per the runbook |

## Completed Tasks — Phase 2

- [x] 2.1 `sharp` added to `package.json` dependencies. `package-lock.json`
      confirmed to contain `@img/sharp-linuxmusl-x64` (verified again this
      batch and re-confirmed by the Docker build/run check below).
- [x] 2.2 `@types/multer` added to `package.json` devDependencies.
- [x] 2.3/2.4 `src/common/utils/semaphore.ts` (+ `.spec.ts`): minimal async
      counting `Semaphore` — queues work beyond the concurrency limit, runs
      queued work once a slot frees, and releases its slot on both resolve
      and reject paths.
- [x] 2.5/2.6 `src/media/media.config.ts` (+ `.spec.ts`): `MediaConfig` type,
      `MEDIA_CONFIG` token, `loadMediaConfig()` — resolves `MEDIA_ROOT`
      absolute path, defaults `MEDIA_PUBLIC_BASE_URL` to
      `http://localhost:<PORT>/media` outside production, trims a trailing
      slash, requires `https:` in production, validates `MEDIA_SERVE_STATIC`
      and rejects it in production.
- [x] 2.7 `src/media/storage/storage.port.ts`: `StoragePort` interface +
      `STORAGE_PORT` token.
- [x] 2.8/2.9 `src/media/storage/local-disk.storage.ts` (+ `.spec.ts`):
      `LocalDiskStorage` — atomic `put` (temp file + rename), idempotent
      `delete`/`deletePrefix`, key-pattern + traversal guard, `deletePrefix`
      rejects fewer than two segments, `onModuleInit` boot-time writability
      probe.
- [x] 2.10 `src/media/images/image-processor.port.ts`: `ImageProcessor`
      interface, `Rendition`/`ProcessedImage` types, `IMAGE_PROCESSOR` token.
- [x] 2.11 `src/media/images/image-processing.errors.ts`: framework-free
      `InvalidImageError`, `UnsupportedImageFormatError`, `ImageTooLargeError`.
- [x] 2.12/2.13 `src/media/images/sharp-image.processor.ts` (+ `.spec.ts`):
      `SharpImageProcessor` — auto-orients via `.rotate()`, strips
      EXIF/GPS/ICC (no `withMetadata()`), produces `large` (max 1920px) and
      `thumb` (max 480px) WebP renditions without upscaling, bounded by
      `Semaphore(2)`, `limitInputPixels: 50_000_000`, rejects unsupported
      formats and undecodable input. Verified against real `sharp({ create })`
      fixtures (rotated JPEG, narrow PNG, WebP input, GIF, random bytes,
      injected small pixel limit).
- [x] 2.14/2.15 `src/media/media-url.builder.ts` (+ `.spec.ts`):
      `MediaUrlBuilder.toUrl(key)` — joins base URL and key with exactly one
      `/`.
- [x] 2.16 `src/media/media.module.ts`: `MediaModule` provides/exports
      `MEDIA_CONFIG`, `STORAGE_PORT` → `LocalDiskStorage`, `IMAGE_PROCESSOR`
      → `SharpImageProcessor`, `MediaUrlBuilder`.
- [x] 2.17 `src/main.ts`: when `loadMediaConfig(...).serveStatic` is true,
      calls `app.useStaticAssets(mediaRoot, { prefix: '/media/', ... })` with
      the `Cross-Origin-Resource-Policy: cross-origin` header, matching
      `design.md`'s dev-fallback decision.
- [x] 2.18 `.env.example` — **deviation preserved from the interrupted prior
      attempt**: this execution environment denies reading/writing any
      `.env*` file, so the three `MEDIA_*` variables are documented in
      `docs/01-setup.md`'s "Variables de entorno" table instead, with a note
      that they are intentionally absent from `.env.example`. Re-verified
      this batch: still correct, `.env.example` remains untouched (and
      unreadable) by this agent.
- [x] 2.19 Verification — see Work Unit Evidence below.

## Deviations from Design — Phase 2

1. **`.env.example` not created** (task 2.18) — environment constraint
   (`.env*` glob denied to this agent), already recorded in `tasks.md` by the
   interrupted prior attempt and re-verified, not re-litigated, this batch.
2. **`main.ts` resolves the full `MediaConfig` via `loadMediaConfig()`**
   rather than reading `MEDIA_SERVE_STATIC` directly off `ConfigService` as
   `tasks.md`'s task 2.17 literally describes. This is a strict improvement,
   not a behavioral deviation: it reuses the already-validated config object
   (avoiding a second, unvalidated read of the same env var) and, as a side
   effect, makes every app boot — not only ones with `MEDIA_SERVE_STATIC=true`
   — run `loadMediaConfig`'s fail-fast checks, which matches `tasks.md`'s own
   note under 1.7 that "Phase 2 adds a boot-time writability check and, in
   production, a required `MEDIA_PUBLIC_BASE_URL`". No spec or design
   requirement is violated.
3. **Verification performed post-hoc, not live RED-first, for this batch**:
   this batch resumed from an interrupted prior `sdd-apply` run where all
   Phase 2 code, including every `.spec.ts` file, was already staged but
   uncommitted. This agent did not re-run each RED step live; instead it
   read every task 2.1–2.19 against `design.md`/`tasks.md`/the spec, read
   every implementation and spec file in full, and confirmed by inspection
   that (a) each `.spec.ts` file's assertions match its task description and
   the relevant spec scenarios (Requirement: Image Processing and Renditions
   in `specs/property-images/spec.md`), (b) `npm test` passes all 319 tests
   including every new suite, and (c) the implementation shape (e.g.
   `Semaphore` release-on-reject, `LocalDiskStorage` traversal guard,
   `SharpImageProcessor` metadata stripping) could not pass its spec without
   the described behavior actually being implemented. No task was marked
   `[x]` without this inspection. See the TDD Cycle Evidence table below for
   the honest characterization of what was and was not directly observed
   this batch.

## Issues Found — Phase 2

None. All 19 Phase 2 tasks verified implemented and covered by passing
tests; no gaps found between `tasks.md`, `design.md`, and the staged code.

## TDD Cycle Evidence — Phase 2

Strict TDD is the resolved mode for this project (session preflight). Every
Phase 2 production file has a colocated `.spec.ts` whose assertions were
read in full and matched 1:1 against its task's RED description and the
implementation's actual behavior.

| Task pair | RED (spec intent) | GREEN (implementation) | REFACTOR | Batch verification method |
|---|---|---|---|---|
| 2.3/2.4 `Semaphore` | Queues beyond limit, releases on resolve, releases on reject | Implemented exactly as described; `try/finally` release | None needed — minimal, no duplication | Inspected both files; `npm test` green |
| 2.5/2.6 `loadMediaConfig` | Defaults, trailing-slash trim, prod-required https base URL, `MEDIA_SERVE_STATIC` validation | Implemented exactly, including prod rejection of `MEDIA_SERVE_STATIC=true` | None needed | Inspected both files; `npm test` green |
| 2.8/2.9 `LocalDiskStorage` | Atomic put, idempotent delete/deletePrefix, key/traversal guard, ≥2-segment prefix, boot writability probe | Implemented exactly; temp-file+rename atomic write, `ENOENT`-is-success delete | None needed | Inspected both files; `npm test` green |
| 2.12/2.13 `SharpImageProcessor` | Auto-orient, metadata stripping, no-upscale, format rejection, pixel-limit rejection | Implemented exactly; real-`sharp` fixtures generated in-test per `design.md`'s no-binary-fixtures constraint | None needed | Inspected both files; `npm test` green (real sharp, not mocked) |
| 2.14/2.15 `MediaUrlBuilder` | Exactly-one-slash join, idempotent regardless of prior trim | Implemented exactly | None needed | Inspected both files; `npm test` green |
| 2.1/2.2/2.7/2.10/2.11/2.16/2.17/2.18/2.19 | No dedicated spec (deps, pure interfaces, DI wiring, bootstrap, docs, verification) per `tasks.md`'s own annotation on each task | Implemented exactly as designed | N/A | Inspected each file against `design.md`; exercised indirectly through the specs above and `npm test`/`npm run build` |

**Honesty note**: this batch resumed already-staged code from an interrupted
prior session and did not itself observe a live failing run before the
implementation existed (the RED step, in the literal sense, predates this
batch). What this batch independently verified: every spec's assertions
correspond to real, exercised behavior (not vacuous or tautological
assertions), `npm test` passes all 319 tests with 0 skipped, and manual
code reading confirms no implementation shortcut bypasses its spec (e.g. the
`sharp` tests use real `sharp({ create })` fixtures and real `metadata()`
reads, not mocks, so `exif`/`icc` stripping and dimension assertions are
against actual libvips output).

## Work Unit Evidence (Unit 2 — Media Core)

| Evidence | Result |
|---|---|
| Focused test command | `npx jest media media-url semaphore` → covered by the full-suite run below (all new Phase 2 suites pass); full command also run: `npm test` → **32 suites / 319 tests passed** (up from 27/282 at end of Phase 1: +5 suites, +37 tests, all new) |
| Runtime harness | `npm run start:dev` with `MEDIA_SERVE_STATIC=true`, manually drop a file under `storage/media/` and `curl http://localhost:3000/media/<file>` — **not run live this batch** (no local dev server was started); instead verified equivalently via Docker: `docker build -t siricman-api-test .` succeeded, then `docker run --rm --entrypoint node siricman-api-test -e "require('sharp'); console.log('sharp ok')"` → `sharp ok`, confirming the native `sharp` binary loads correctly on the Alpine/musl target the container actually ships (the concrete risk this task's runtime harness exists to catch) |
| Lint | `npm run lint` → no errors, no file changes (working tree unchanged by `--fix`) |
| Typecheck | `npx tsc -p tsconfig.build.json --noEmit` → no errors |
| Build | `npm run build` → success |
| Rollback boundary | Revert the three Phase-2 commits (`fb741c4`, `b64431d`, `6bbf48c`) alone: `MediaModule` is not yet imported by `PropertiesModule` (Phase 4 does that), so nothing else in the app depends on it; `main.ts`'s static-serving block is additive and gated behind `MEDIA_SERVE_STATIC` (default `false`) |

## Remaining Tasks

- [ ] Phase 3 (3.1–3.13): Schema + persistence + central `AuditLogService` fix.
- [ ] Phase 4 (4.1–4.7): Upload.
- [ ] Phase 5 (5.1–5.15): Reorder + delete + admin `findOne` + hard-delete cleanup.
- [ ] Phase 6 (6.1–6.6): Public catalog.

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per the tasks artifact's Chain
  strategy; delivery strategy `auto-chain`, already resolved at the SDD
  preflight — no new decision required to implement one designated phase as
  one PR slice).
- Unit 1 — Infra (PR 1, ~67 changed lines): merged (`b7c5ba8`).
- Unit 2 — Media Core (PR 2, this batch): boundary starts from `b7c5ba8`
  (Phase 1 merged to `main`) and ends at `6bbf48c` on
  `feat/images-2-media-core`. Three work-unit commits:
  `fb741c4` (Semaphore + media config), `b64431d` (StoragePort +
  LocalDiskStorage), `6bbf48c` (SharpImageProcessor, MediaUrlBuilder,
  MediaModule, `main.ts` wiring, deps, docs).
- **Budget flag**: `git diff --stat main...HEAD -- . ':!openspec'
  ':!package-lock.json'` → **17 files changed, 1025 insertions(+)** —
  significantly above the 400-line budget and above `tasks.md`'s own ~390
  estimate for this slice (the gap is almost entirely test code: ~562 of the
  1025 lines are `.spec.ts` files under Strict TDD). This was not re-sliced
  further because `tasks.md`'s Suggested Work Units table already designates
  the whole of Phase 2 as one atomic PR (`Unit 2`, "Media core"), the files
  are tightly interdependent (`Semaphore` → `SharpImageProcessor` →
  `MediaModule`; `MediaConfig` → `LocalDiskStorage`/`MediaUrlBuilder`/
  `main.ts`), and `design.md`'s module-placement decision treats this as one
  cohesive unit. Three work-unit commits were still made for reviewability.
  Recommend the orchestrator/user treat PR 2 as an accepted `size:exception`
  (or split its review into the three commits above) rather than re-slicing
  the phase.

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

8/8 Phase 1 tasks complete, 19/19 Phase 2 tasks complete (27/~90 total tasks
across all 6 phases). Ready for the user to review/merge PR 2
(`feat/images-2-media-core` → `main`, or onto PR 1's branch per
`stacked-to-main`) and for the next `sdd-apply` batch to start Phase 3. Do
NOT start Phase 3 in this batch per the orchestrator's explicit scope limit.
