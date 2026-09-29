# Apply Progress: Property Images

## Scope of this record

Phase 1 (infra slice, PR 1, tasks 1.1–1.8), Phase 2 (media core slice,
PR 2, tasks 2.1–2.19), and Phase 3 (schema + persistence + central
`AuditLogService` fix, PR 3, tasks 3.1–3.13). Phases 4–6 are not started.

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

## Completed Tasks — Phase 3

- [x] 3.1/3.2 `src/audit/audit-log.service.ts` (+ `.spec.ts`): central fix —
      `record()` wraps `auditLogRepository.save(log)` in `try/catch`, logs a
      warning via `Logger` (entity type, entity id, action, and the
      underlying error message), and always resolves. Covers every current
      and future caller, including `PropertiesService`'s existing unguarded
      `await record()` calls, with one change.
- [x] 3.3 `src/audit/enums/audit-action.enum.ts`: added
      `PROPERTY_IMAGE_UPLOADED = 'property.image_uploaded'`,
      `PROPERTY_IMAGE_REORDERED = 'property.image_reordered'`,
      `PROPERTY_IMAGE_DELETED = 'property.image_deleted'`.
- [x] 3.4 `src/properties/entities/property-image.entity.ts`: `PropertyImage`
      entity — `@PrimaryColumn('uuid') id` (app-generated), `@ManyToOne`
      `Property` with `onDelete: 'CASCADE'` plus explicit `propertyId`
      column, `position: smallint`, `largeKey`/`thumbKey`,
      `width`/`height`, `thumbWidth`/`thumbHeight`, `largeBytes`/
      `thumbBytes`, `createdAt`. No inverse `images` relation on `Property`
      (Reconciliation Note 5 / design decision preserved).
- [x] 3.5 `src/migrations/1790500000002-CreatePropertyImages.ts`: creates
      `property_images` with `PK id`, `CHECK (position >= 0)`,
      `UNIQUE (property_id, position) DEFERRABLE INITIALLY IMMEDIATE`, and
      `FK property_id -> properties(id) ON DELETE CASCADE`; `down()` drops
      the table. `InitSchema`/`CreateNeighborhoods`/`CreateProperties`
      untouched.
- [x] 3.6/3.7 `src/properties/images/property-image-keys.ts` (+ `.spec.ts`):
      `buildPropertyImageKeys(propertyId, imageId)` returns the
      `properties/{propertyId}/{imageId}-lg.webp` / `-thumb.webp` pair;
      `propertyMediaPrefix(propertyId)` returns `properties/{propertyId}/`.
- [x] 3.8/3.9 `src/properties/images/property-images.repository.ts` (+
      `.spec.ts`): `PropertyImagesRepository` — `propertyExists`/
      `countByProperty` (non-transactional reads); `insertAppended` locks
      the property row (`SELECT ... FOR UPDATE`) before counting/inserting,
      throws `PropertyNotFoundError`/`ImageCapExceededError`, inserts at
      `position = count`; `reorder` locks first, validates an exact
      permutation (`NotAPermutationError` otherwise), is a no-op when the
      submitted order matches the current order, otherwise issues exactly
      one `UPDATE ... FROM unnest($1::uuid[]) WITH ORDINALITY` statement;
      `deleteAndCompact` locks first, returns `null` when the image does not
      belong to the property, otherwise deletes and issues exactly one
      compaction `UPDATE ... WHERE position > $2`; `findByPropertyId`/
      `findCoversByPropertyIds` read ordered/position-0 rows.
- [x] 3.10/3.11 `src/properties/helpers/property-image.mapper.ts` (+
      `.spec.ts`): `toPropertyImageResponse` (admin shape: `id`, `position`,
      `url`, `width`, `height`, `thumbnailUrl`, `thumbnailWidth`,
      `thumbnailHeight`, `createdAt`) and `toPublicPropertyImage` (public
      shape: same rendition fields, no `id`/`position`) via
      `MediaUrlBuilder`; neither ever serializes `largeKey`/`thumbKey`.
- [x] 3.12 Verification — see Work Unit Evidence below.
- [x] 3.13 Manual DB check — see Work Unit Evidence below.

## Deviations from Design — Phase 3

None — implementation matches `design.md`'s entity/migration SQL, the
repository's lock-first transactional contract, the reorder/compaction SQL,
and the response-shape decisions exactly.

## Issues Found — Phase 3

None.

## TDD Cycle Evidence — Phase 3

| Task pair | RED (observed failure before implementation) | GREEN (implementation) | REFACTOR | Verification |
|---|---|---|---|---|
| 3.1/3.2 `AuditLogService.record()` central fix | Added a failing test asserting `record()` resolves and logs a warning when `auditLogRepository.save()` rejects; ran `npx jest audit-log.service` and observed 1 failed / 3 passed (rejected promise) before any implementation change | Wrapped `save()` in `try/catch`, added `Logger.warn(...)` with entity type/id/action; re-ran and observed 4/4 passed | None needed — minimal, matches existing `RetentionService` `Logger` convention | Live RED then GREEN observed this batch |
| 3.6/3.7 `property-image-keys` | Wrote the spec first; `npx jest property-image-keys` failed with `TS2307: Cannot find module './property-image-keys'` (module did not exist) | Implemented `buildPropertyImageKeys`/`propertyMediaPrefix`; re-ran and observed 2/2 passed | None needed | Live RED then GREEN observed this batch |
| 3.8/3.9 `PropertyImagesRepository` | Wrote the spec first (22 cases: lock-first ordering, `PropertyNotFoundError`, `ImageCapExceededError`, `NotAPermutationError` — wrong length/duplicate/foreign/missing id, no-op reorder, single-UPDATE reorder and compaction assertions, `findByPropertyId`/`findCoversByPropertyIds`); `npx jest property-images.repository` failed with `TS2307` (module did not exist) | Implemented `PropertyImagesRepository` against a single `DataSource` dependency (`.manager.query`/`.manager.getRepository` for non-tx reads, `.transaction(cb)` + `manager.query`/`manager.getRepository` for locked writes); re-ran and observed **22/22 passed on the first implementation attempt** | Two ESLint-driven refactors after `npm run lint`: typed `manager.query<unknown[]>(...)` instead of the untyped default (`any`) return, and extracted a typed `FindOptionsWhere<PropertyImage>` plus an explicit `Promise.resolve<PropertyImage[]>([])` for the empty-ids short-circuit in `findCoversByPropertyIds` (fixed a `no-unsafe-return` finding); re-ran `npm test` (still 22/22) and `npm run lint` (clean) after each | Live RED then GREEN then lint-driven REFACTOR observed this batch |
| 3.10/3.11 `property-image.mapper` | Wrote the spec first (admin/public projections, key-leak guards); `npx jest property-image.mapper` failed with `TS2307` (module did not exist) | Implemented `toPropertyImageResponse`/`toPublicPropertyImage` using `MediaUrlBuilder.toUrl()`; re-ran and observed 4/4 passed | None needed | Live RED then GREEN observed this batch |
| 3.3, 3.4, 3.5 | No dedicated spec, per `tasks.md`'s own annotation on each task (enum literals, declarative entity, migration — this repo has no migration unit-test layer) | Implemented exactly as designed | N/A | Exercised indirectly through 3.8/3.9's repository spec (entity) and the manual DB check in 3.13 (migration); `npm test`/`npm run build` |

## Work Unit Evidence (Unit 3 — Schema + Persistence)

| Evidence | Result |
|---|---|
| Focused test command | `npx jest audit-log.service property-image-keys property-images.repository property-image.mapper` → covered by the full-suite run below; full command also run: `npm test` → **35 suites / 348 tests passed** (up from 32/319 at end of Phase 2: +3 suites — `property-image-keys`, `property-images.repository`, `property-image.mapper` — +29 tests, all new; `audit-log.service` grew from 3 to 4 tests in the same suite) |
| Lint | `npm run lint` → clean after fixing 9 `@typescript-eslint` findings in `property-images.repository.ts` (untyped `manager.query()` results and one `no-unsafe-return` on the empty-array short-circuit; see TDD Cycle Evidence REFACTOR column) |
| Typecheck | `npx tsc -p tsconfig.build.json --noEmit` → no errors |
| Build | `npm run build` → success |
| Runtime harness (manual DB check, Task 3.13) | Throwaway Postgres container `siricman-migtest` (127.0.0.1:55432, db `migtest`, `InitSchema`/`CreateNeighborhoods`/`CreateProperties` already applied). `npm run migration:run` → `CreatePropertyImages1790500000002` executed. `psql \d property_images` confirmed the table, `CHK_property_images_position`, `UQ_property_images_property_position ... DEFERRABLE`, and `FK_property_images_property ... ON DELETE CASCADE` exactly as written. Inserted a scratch property + 3 image rows at positions 0–2. (b) A single-statement `UPDATE ... FROM unnest($1::uuid[]) WITH ORDINALITY` full permutation (`c,a,b` → positions `0,1,2`) committed with no mid-statement violation. (c) A single-statement `UPDATE ... CASE WHEN ... THEN 0 ...` forcing two rows to the same `(property_id, position)` was rejected with `duplicate key value violates unique constraint "UQ_property_images_property_position"` and rolled back cleanly (positions unchanged). (d) `DELETE FROM properties WHERE id = ...` cascade-deleted all 3 `property_images` rows (`0` remaining) and the property row itself (`0` remaining) — no orphans. `npm run migration:revert` → table dropped, `properties` (0 rows, scratch already cascade-deleted) and `neighborhoods` (48 rows) intact; `npm run migration:run` again → re-applied successfully. Container left running (a shared fixture, not started/stopped by this batch); no other container or database touched |
| Rollback boundary | Revert the two Phase-3 commits (`4211bb8` audit fix, `1b33e9b` schema+persistence) alone: no controller routes exist yet (Phase 4 adds them), so no external behavior regresses; the `AuditLogService` fix is additive (never-throws is strictly safer) and does not change any existing call site's inputs/outputs; `npm run migration:revert` cleanly drops `property_images` with `properties`/`neighborhoods` untouched, as proven above |

## Remaining Tasks

- [ ] Phase 4 (4.1–4.7): Upload.
- [ ] Phase 5 (5.1–5.15): Reorder + delete + admin `findOne` + hard-delete cleanup.
- [ ] Phase 6 (6.1–6.6): Public catalog.

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main, per the tasks artifact's Chain
  strategy; delivery strategy `auto-chain`, already resolved at the SDD
  preflight — no new decision required to implement one designated phase as
  one PR slice).
- Unit 1 — Infra (PR 1, ~67 changed lines): merged (`b7c5ba8`).
- Unit 2 — Media Core (PR 2): merged (`9cfeac0` merge commit; three
  work-unit commits `fb741c4`, `b64431d`, `6bbf48c` on
  `feat/images-2-media-core`).
- Unit 3 — Schema + Persistence (PR 3, this batch, branch
  `feat/images-3-schema`): boundary starts from `9cfeac0` (Phase 2 merged to
  `main`) and ends at `1b33e9b`. Two work-unit commits: `4211bb8` (central
  `AuditLogService.record()` fix) and `1b33e9b` (`PropertyImage` entity,
  migration, repository, key builder, image mappers, audit enum values).
- **Budget flag**: `git diff --stat main...HEAD -- . ':!openspec'` (from
  `9cfeac0`, i.e. this slice alone) → **11 files changed, 896 insertions(+),
  4 deletions(-)** — above the 400-line budget and above `tasks.md`'s own
  ~330–370 estimate (the gap is again mostly test code: the
  `property-images.repository.spec.ts` file alone, covering 22 cases across
  `propertyExists`/`countByProperty`/`insertAppended`/`reorder`/
  `deleteAndCompact`/`findByPropertyId`/`findCoversByPropertyIds`, is ~330
  lines). Not re-sliced further because `tasks.md`'s Suggested Work Units
  table already designates the whole of Phase 3 as one atomic PR (`Unit 3`,
  "Schema + persistence"), the files are directly dependent (entity →
  migration → repository → mapper; audit fix is small and independent but
  was kept in this phase per the orchestrator's placement instruction), and
  splitting the repository from its 22-case spec would violate the
  "keep tests with code" work-unit rule. Two work-unit commits were still
  made for reviewability (audit fix isolated from the property-images
  schema work). Recommend the orchestrator/user treat PR 3 as an accepted
  `size:exception` (or split its review into the two commits above) rather
  than re-slicing the phase.

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

8/8 Phase 1 tasks complete, 19/19 Phase 2 tasks complete, 13/13 Phase 3
tasks complete (40/~90 total tasks across all 6 phases). Phase 1 and 2 are
merged to `main`. Ready for the user to review/merge PR 3
(`feat/images-3-schema` → `main`, per `stacked-to-main`) and for the next
`sdd-apply` batch to start Phase 4. Do NOT start Phase 4 in this batch per
the orchestrator's explicit scope limit.
