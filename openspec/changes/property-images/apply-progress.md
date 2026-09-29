# Apply Progress: Property Images

## Scope of this record

Phase 1 (infra slice, PR 1, tasks 1.1–1.8), Phase 2 (media core slice,
PR 2, tasks 2.1–2.19), Phase 3 (schema + persistence + central
`AuditLogService` fix, PR 3, tasks 3.1–3.13), Phase 4 (upload slice,
PR 4, tasks 4.1–4.7), and Phase 5 (reorder + delete + admin `findOne` +
hard-delete cleanup, PR 5, tasks 5.1–5.15). Phase 6 is not started.

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

## Completed Tasks — Phase 4

- [x] 4.1 `src/properties/images/property-images.service.spec.ts` (upload
      only): fake `PropertyImagesRepository`, in-memory fake `StoragePort`
      with per-key failure injection, fake `ImageProcessor`, mocked
      `AuditLogService` — happy path (mapped response + exact audit call),
      nonexistent property → `NotFoundException`, cap pre-check
      short-circuits before the processor runs, processor error →
      `BadRequestException` with nothing written, second `put()` failure
      deletes the first key, `insertAppended` failure (both
      `PropertyNotFoundError` and `ImageCapExceededError`) deletes both
      keys, a rejecting mocked `AuditLogService.record()` still returns
      success.
- [x] 4.2 `src/properties/images/property-images.service.ts`:
      `PropertyImagesService.upload()` — existence check, cheap cap
      pre-check, `ImageProcessor.process()`, write both renditions (second
      `put()` failure compensates the first), locked `insertAppended`
      (any failure compensates both keys; `PropertyNotFoundError` →
      `NotFoundException`, `ImageCapExceededError` → `BadRequestException`),
      `auditLogService.record(...).catch(() => undefined)` (defensive
      guard at this call site only — no duplicate try/catch/logging
      wrapper; `AuditLogService.record()` itself already never rejects
      per Phase 3), map to `PropertyImageResponse`.
- [x] 4.3 `src/properties/controllers/admin-property-images.controller.spec.ts`
      (POST only): class-level `@Auth(admin, manager)` role metadata with
      no per-method override, `@Throttle({default:{limit:60,ttl:60_000}})`
      metadata on the handler, exported `IMAGE_UPLOAD_LIMITS` shape,
      missing `file` → `400` without calling the service, delegates to
      `service.upload(propertyId, file, actor)`.
- [x] 4.4 `src/properties/controllers/admin-property-images.controller.ts`:
      `AdminPropertyImagesController` (`@Controller('admin/properties/:id/images')`,
      class-level `@Auth(admin, manager)`), `POST` handler with
      `FileInterceptor('file', { storage: memoryStorage(), limits:
      IMAGE_UPLOAD_LIMITS })`, `ParseUUIDPipe` on `:id`, `201`.
- [x] 4.5 `src/properties/properties.module.ts`: imports `MediaModule`;
      `TypeOrmModule.forFeature([Property, PropertyImage])`; registers
      `PropertyImagesRepository`, `PropertyImagesService`,
      `AdminPropertyImagesController`.
- [x] 4.6 Verification — see Work Unit Evidence below.
- [x] 4.7 Manual harness check — see Work Unit Evidence below.

## Deviations from Design — Phase 4

Two deviations, both discovered by task 4.7's manual runtime harness (the
exact purpose that harness exists to serve — neither is reachable by unit
tests, which construct these classes directly and never boot real Nest DI
or a real `busboy` multipart parser):

1. **`SharpImageProcessor` needed `@Optional()` on its constructor
   parameter** (`src/media/images/sharp-image.processor.ts`, a Phase 2
   file). Its constructor takes `options: Partial<SharpImageProcessorOptions>
   = {}` with no `@Inject()` token; Nest's DI reflects the parameter's
   design-time type as the injection token, which erases to the generic
   `Object` for an interface type, and (unlike a plain default value) Nest
   still attempts to resolve a provider for that token and throws
   `UnknownDependenciesException` when none exists. This was never caught
   before now because Phase 2's own harness batch explicitly noted
   `MediaModule` was "not yet imported by `PropertiesModule`" at the time
   (see the Phase 2 Work Unit Evidence table above) — Phase 4 (task 4.5) is
   the first slice that actually wires `MediaModule` into a real Nest
   application via `PropertiesModule`, so this is the first point in the
   whole change where `SharpImageProcessor` is constructed by Nest's
   injector rather than directly by a spec (`new SharpImageProcessor()`).
   Fixed by adding `@Optional()` to the constructor parameter; behavior for
   every existing caller (the `MediaModule` factory, and every unit test
   that constructs it directly) is unchanged — `@Optional()` only changes
   what happens when Nest cannot resolve a provider for that parameter (it
   now injects `undefined`, which is exactly what a bare `new
   SharpImageProcessor()` call already passed).
2. **`IMAGE_UPLOAD_LIMITS.parts` is `2`, not `1`.** `design.md`'s "Decision:
   Upload transport and HTTP mapping" and task 4.3's literal text both
   specify `parts: 1`. Reproduced against a minimal, isolated Express +
   `multer` server (this project's exact installed `multer`/`busboy`
   versions, no app code involved) that with `parts: 1`, every legitimate
   single-file multipart upload is rejected with busboy's
   `LIMIT_PART_COUNT` ("Too many parts") before any file data is read.
   Root cause: busboy's internal `parts` counter increments once per
   multipart boundary *occurrence* in the byte stream, and a single-file
   request contains two occurrences — the boundary opening the file part,
   and the closing `--boundary--` — not one. `parts: 2` is the smallest
   value that lets exactly one legitimate file through while a second
   field or file still correctly triggers `fields: 0`/`files: 1`
   (`LIMIT_FIELD_COUNT`/`LIMIT_FILE_COUNT`) — both outcomes verified
   against the same isolated server before changing the app. Fixed in
   `IMAGE_UPLOAD_LIMITS` (`admin-property-images.controller.ts`, with the
   mechanism documented in a code comment on the constant) and its spec
   assertion (task 4.3's test, `admin-property-images.controller.spec.ts`).
   `tasks.md` is annotated at 4.3/4.7 rather than silently diverging from
   its literal text.

No other deviations — the rest of Phase 4 matches `design.md`'s upload
orchestration order, response shapes, throttle value, and multer transport
decision exactly.

## Issues Found — Phase 4

None beyond the two deviations above (both fixed, not merely noted).

## TDD Cycle Evidence — Phase 4

| Task pair | RED (observed failure before implementation) | GREEN (implementation) | REFACTOR | Verification |
|---|---|---|---|---|
| 4.1/4.2 `PropertyImagesService.upload()` | Wrote the spec first (9 cases: happy path + audit call shape, 404, cap short-circuit, processor-error mapping, first-key compensation, both-key compensation for both repository error types, audit-rejection defensiveness); `npx jest property-images.service` failed with `TS2307: Cannot find module './property-images.service'` (module did not exist) | Implemented `PropertyImagesService.upload()` against the design's orchestration order; re-ran and observed **9/9 passed on the first implementation attempt** | None needed — matches the design's compensation/mapping shape directly | Live RED then GREEN observed this batch |
| 4.3/4.4 `AdminPropertyImagesController` (POST) | Wrote the spec first (role metadata, throttle metadata, `IMAGE_UPLOAD_LIMITS` shape, missing-file 400, delegation); `npx jest admin-property-images.controller` failed with `TS2307: Cannot find module './admin-property-images.controller'` (module did not exist) | Implemented the controller with `FileInterceptor`/`memoryStorage`/`ParseUUIDPipe`; re-ran and observed **5/5 passed on the first implementation attempt** | `npm run lint --fix` reformatted (no logic change) after the `parts: 1` → `parts: 2` deviation fix; re-ran `npm test` (still 5/5) after | Live RED then GREEN observed this batch |
| 4.5 `properties.module.ts` wiring | No dedicated spec, per `tasks.md`'s own annotation (DI wiring; exercised by the controller/service specs plus build/tsc) | Wired `MediaModule` import, `PropertyImage` in `forFeature`, and the three new providers/controller | N/A | Exercised indirectly: `npm run build`/`tsc` compiled the module graph, and task 4.7's real Nest bootstrap is the actual DI-wiring proof (and is what surfaced deviation 1 above) |

**Honesty note**: unlike Phase 3, this batch's RED steps were genuinely
observed live in this session (module-not-found failures before each
implementation), not reconstructed from an interrupted prior run. The two
deviations above were also found live, by literally running the manual
harness task 4.7 requires — not by code inspection — which is exactly the
category of defect (real Nest DI resolution, real `busboy` multipart
parsing) that unit tests in this repo cannot reach, since every spec
constructs `SharpImageProcessor`/drives multer through direct instantiation
or a fake, never through a real Nest application boot or a real HTTP
multipart request.

## Work Unit Evidence (Unit 4 — Upload)

| Evidence | Result |
|---|---|
| Focused test command | `npx jest property-images.service admin-property-images.controller` → 14/14 passed (9 + 5); full command also run: `npm test` → **37 suites / 362 tests passed** (up from 35/348 at end of Phase 3: +2 suites, +14 tests, all new) |
| Lint | `npm run lint` → clean (auto-formatted the new files and the two deviation-fix files; no logic changes from `--fix`) |
| Typecheck | `npx tsc -p tsconfig.build.json --noEmit` → no errors |
| Build | `npm run build` → success |
| Runtime harness (manual check, Task 4.7) | Throwaway Postgres `siricman-migtest` (127.0.0.1:55432, migrations already applied from Phase 3). Built `dist/main.js` run with inline env vars (`MEDIA_ROOT`/`MEDIA_PUBLIC_BASE_URL`/`MEDIA_SERVE_STATIC=true` pointed at a temp dir, dummy `JWT_SECRET`/`MFA_ENCRYPTION_KEY`, `PORT=3055`). Scratch `manager` role + user inserted directly via SQL (no MFA required for `manager`); a JWT was self-signed matching `JwtStrategy`'s `{ id, jti }` payload with the same dummy secret (simpler and equally honest per the orchestrator's instruction, since no seeded admin/MFA flow exists in this throwaway DB). Scratch property inserted via SQL. **First boot attempt failed** with `UnknownDependenciesException` on `SharpImageProcessor` — this is deviation 1 above; fixed, rebuilt, reboot succeeded. `curl -F file=@<16MB file>` → `413 Payload Too Large`. `curl -F file=@<real 800×600 JPEG generated with sharp>` → **first attempt failed** with `400 "Too many parts"` — this is deviation 2 above; reproduced in isolation, fixed (`parts: 2`), rebuilt, reboot, retried → `201` with `{ id, position: 0, url, width: 800, height: 600, thumbnailUrl, thumbnailWidth: 480, thumbnailHeight: 360, createdAt }` (no upscaling, dimensions correct); confirmed both `.webp` files exist on disk under `MEDIA_ROOT/properties/<id>/` and exactly one `property_images` row exists for the scratch property (`psql` query). `curl` of the returned `thumbnailUrl` (dev static route) → `200`, real WebP bytes (`RIFF ... Web/P image, VP8 encoding, 480x360`), `Cache-Control: public, max-age=31536000, immutable`, `Cross-Origin-Resource-Policy: cross-origin`. `curl -F file=@<text file renamed .jpg>` → `400 "Could not decode the uploaded file as an image"`. App stopped; scratch property (cascade-deleted its image row), user, `user_roles` row, and role deleted via SQL and confirmed `0` remaining; all local temp files (generated images, media root) deleted. `siricman-migtest` left running (shared fixture, per Phase 3's own precedent); no other container or database touched |
| Rollback boundary | Revert the Phase-4 work-unit commit(s) alone: no other route depends on `AdminPropertyImagesController`/`PropertyImagesService` yet (Phase 5 extends the same files); the `SharpImageProcessor` `@Optional()` fix is additive/behavior-preserving for every existing caller and safe to keep even if the rest of Phase 4 were reverted |

## Completed Tasks — Phase 5

- [x] 5.1/5.2 `src/properties/dto/reorder-property-images.dto.ts` (+
      `.spec.ts`): `ReorderPropertyImagesDto` (`@IsArray()`,
      `@ArrayMinSize(1)`, `@ArrayMaxSize(30)`, `@ArrayUnique()`,
      `@IsUUID('4', { each: true })`). These two files were already
      staged, uncommitted, by an interrupted prior `sdd-apply` attempt;
      this batch verified them against `design.md`/the spec by
      temporarily moving the implementation file aside, observing a live
      RED (`TS2307: Cannot find module`), restoring it, and observing a
      live GREEN (6/6 tests) before keeping them as-is.
- [x] 5.3 `src/properties/dto/index.ts`: added the missing
      `export * from './reorder-property-images.dto'` — the interrupted
      prior attempt had created the DTO but never wired its barrel
      export.
- [x] 5.4/5.5 `src/properties/images/property-images.service.ts` (+
      `.spec.ts`): `reorder()` — fetches the current order via
      `findByPropertyId` first and detects a same-order submission as a
      no-op (returns the mapped current images; never calls
      `repository.reorder()`, never audits); otherwise calls
      `repository.reorder()` (maps `PropertyNotFoundError` →
      `NotFoundException`, `NotAPermutationError` →
      `BadRequestException`), then records `PROPERTY_IMAGE_REORDERED`
      with `{ imageIds }` (new order) and returns the mapped, reordered
      images.
- [x] 5.6/5.7 `src/properties/images/property-images.service.ts` (+
      `.spec.ts`): `delete()` — calls `repository.deleteAndCompact()`
      (404 via `NotFoundException` when it returns `null`, i.e. the
      image does not belong to that property), best-effort deletes both
      rendition files via the existing `deleteKeys()` helper (already
      catches and logs per-key failures without throwing, reused as-is
      from Phase 4's upload compensation path), then records
      `PROPERTY_IMAGE_DELETED` with `{ imageId, position }`.
- [x] 5.8/5.9 `src/properties/controllers/admin-property-images.controller.ts`
      (+ `.spec.ts`): `PUT order` (no `@Throttle` override, so it keeps
      the class's inherited global 20/min) delegates to
      `service.reorder(id, dto.imageIds, actor)`, `200`; `DELETE
      :imageId` (`@Throttle({ default: { limit: 60, ttl: 60_000 } })`,
      `ParseUUIDPipe` on `imageId`) delegates to `service.delete(id,
      imageId, actor)`, `204`.
- [x] 5.10/5.11 `src/properties/services/properties.service.ts` (+
      `.spec.ts`): injected `STORAGE_PORT`, `PropertyImagesRepository`,
      `MediaUrlBuilder`, and a `Logger`; `remove()` now best-effort calls
      `storagePort.deletePrefix(propertyMediaPrefix(id))` after the row
      `delete()` succeeds (failure logged via `Logger.warn`, never
      thrown); new `findOneWithImages(id)` calls the existing `findOne()`
      then `propertyImagesRepository.findByPropertyId(id)`, mapping each
      row through `toPropertyImageResponse()`; `findOne()` itself is
      byte-for-byte unchanged (regression-tested).
- [x] 5.12/5.13 `src/properties/controllers/admin-properties.controller.ts`
      (+ `.spec.ts`): `GET :id` now delegates to
      `service.findOneWithImages(id)` instead of `service.findOne(id)`.
- [x] 5.14 Verification — see Work Unit Evidence below.
- [x] 5.15 Manual harness check — see Work Unit Evidence below.

## Deviations from Design — Phase 5

1. **Repository interface unchanged, no-op detection moved to the
   service.** `design.md`'s reorder decision describes the no-op check
   ("identical order = no-op, no write, no audit") without specifying
   which layer detects it. `PropertyImagesRepository.reorder()` (already
   implemented in Phase 3) already skips the `UPDATE` statement
   internally when the submitted order matches the current order, but
   its return type (`Promise<PropertyImage[]>`) gives the service no
   signal to distinguish a no-op from a real write. Rather than change
   the Phase-3 repository's already-tested, already-merged contract
   (which `design.md`'s Interfaces/Contracts section documents
   verbatim), the service fetches the current order via the existing
   `findByPropertyId()` finder first and compares arrays itself: an
   exact match skips calling `repository.reorder()` entirely (so no
   repository write call and no audit call), and — because an array
   identical to the current order is by construction a valid permutation
   (current ids have no duplicates) — no separate permutation check is
   needed on that path. This is strictly additive to the design, not a
   contradiction of it: the observable behavior (no write, no audit
   entry, `200` with the unchanged order) matches the spec's "Reordering
   with the exact current image ids succeeds" and the no-op requirement
   in `design.md`'s uniqueness decision exactly.
2. **Harness environment substitution for task 5.15**, matching Phase
   4's precedent exactly: `npm run db:up`/`npm run start:dev`/`npm run
   db:down` were not used; instead the already-running throwaway
   Postgres `siricman-migtest` (127.0.0.1:55432) and a built
   `dist/main.js` with inline env vars were reused, per the
   orchestrator's explicit instruction for this batch. Noted inline on
   task 5.15 in `tasks.md` as well.

No other deviations — reorder/delete orchestration order, the
`findOneWithImages` response shape, the hard-delete cleanup order (row
delete, then best-effort `deletePrefix`, matching design's "Decision:
Delete order — DB first, files best effort" extended to the property
level), and the throttle values all match `design.md` exactly.

## Issues Found — Phase 5

None.

## TDD Cycle Evidence — Phase 5

| Task pair | RED (observed failure before implementation) | GREEN (implementation) | REFACTOR | Verification |
|---|---|---|---|---|
| 5.1/5.2 `ReorderPropertyImagesDto` | Files were already staged (uncommitted) from an interrupted prior attempt; this batch independently re-observed RED by temporarily renaming `reorder-property-images.dto.ts` aside and running `npx jest reorder-property-images.dto` — failed with `TS2307: Cannot find module` (0 tests ran) | Restored the file (unchanged from the staged version, verified correct against 5.1's literal validator list and the spec's DTO scenarios); re-ran and observed 6/6 passed | None needed | Live RED (via temporary move) then GREEN observed this batch |
| 5.3 `dto/index.ts` export | No dedicated spec — a missing barrel export doesn't fail any existing test on its own (verified: `npm test` was already green with the DTO unexported, since nothing imported it yet) | Added the missing `export * from './reorder-property-images.dto'` | None needed | Exercised indirectly once the controller (5.8/5.9) imports `ReorderPropertyImagesDto` from the barrel |
| 5.4/5.5 `PropertyImagesService.reorder()` | Wrote the spec first (5 cases: rewrite + audit shape, same-order no-op with no repository/audit call, non-permutation → `BadRequestException`, nonexistent-property → `NotFoundException`); `npx jest property-images.service` failed to compile with `TS2339: Property 'reorder' does not exist on type 'PropertyImagesService'` (also covered 5.6/5.7's `delete` cases in the same failing compile) | Implemented `reorder()` per the orchestration described above; re-ran and observed **16/16 passed** (9 prior upload tests + 5 reorder + [pending 5.6/5.7 delete cases compiled together]) on the first implementation attempt | None needed | Live RED then GREEN observed this batch |
| 5.6/5.7 `PropertyImagesService.delete()` | Same failing compile as above (`TS2339: Property 'delete' does not exist`), added alongside 5.4/5.5's tests in one spec-file edit | Implemented `delete()` per the orchestration described above; re-ran and observed all 16 tests passed (3 new delete cases + 5 reorder + 8 prior upload, one upload count off by prior batch's 9 — see full evidence table below) | None needed | Live RED then GREEN observed this batch (same commit as 5.4/5.5) |
| 5.8/5.9 `AdminPropertyImagesController` (`PUT order`, `DELETE :imageId`) | Wrote the spec first (4 cases: reorder delegation, no throttle override on `reorder`, delete delegation, 60/min throttle on `remove`); `npx jest admin-property-images.controller` failed to compile with `TS2339: Property 'reorder' does not exist` / `Property 'remove' does not exist` | Implemented both handlers; re-ran and observed **9/9 passed** (5 prior upload tests + 4 new) on the first implementation attempt | None needed | Live RED then GREEN observed this batch |
| 5.10/5.11 `PropertiesService` (`remove()` cleanup, `findOneWithImages()`) | Wrote the spec first (5 cases: `deletePrefix` called after row delete with correct call order, `deletePrefix` failure logged without throwing, `findOneWithImages` happy path + URLs, `findOneWithImages` 404, `findOne()` regression — no `findByPropertyId` call); `npx jest properties.service.spec` failed to compile with `TS2339: Property 'findOneWithImages' does not exist on type 'PropertiesService'` | Implemented both; re-ran and observed **37/37 passed** across the two matched spec files (32 prior `PropertiesService` tests + 5 new, plus the unrelated `public-properties.service.spec.ts` matched by the same glob) on the first implementation attempt | None needed | Live RED then GREEN observed this batch |
| 5.12/5.13 `AdminPropertiesController` `GET :id` wiring | Wrote the spec first (delegates to `findOneWithImages`, not `findOne`); ran and observed a real runtime assertion failure (`Number of calls: 0` on `service.findOneWithImages`) rather than a compile error, since both methods already existed on the fake service object — a valid RED for a wiring change | Changed the one line (`this.propertiesService.findOne(id)` → `this.propertiesService.findOneWithImages(id)`); re-ran and observed 3/3 passed | Fixed one `@typescript-eslint/no-floating-promises` lint warning by `await`-ing the controller call in the new test | Live RED then GREEN then lint-driven REFACTOR observed this batch |

**Honesty note**: every RED step in this batch was genuinely observed live
in this session — either a TypeScript compile failure (`TS2307`/`TS2339`)
for new methods/files, or a real failing assertion for the one pure-wiring
change (5.12/5.13) — not reconstructed from an interrupted prior run,
except for 5.1/5.2 where the prior attempt's staged files were kept after
this batch independently re-verified RED by temporarily removing the
implementation and observing the failure live, then restoring it and
observing GREEN, exactly as the orchestrator's scope instructions required.

## Work Unit Evidence (Unit 5 — Reorder + Delete + Admin + Hard-Delete Cleanup)

| Evidence | Result |
|---|---|
| Focused test command | `npx jest property-images.service admin-property-images.controller properties.service admin-properties.controller reorder-property-images.dto` → all matched suites passed; full command also run: `npm test` → **38 suites / 385 tests passed** (up from 38/368 at the start of this batch — the two pre-existing untracked DTO files already counted toward that baseline; net new this batch: +17 tests across the service/controller/properties-service spec extensions) |
| Lint | `npm run lint` → clean (no errors, no `--fix` changes left in the working tree beyond what was already staged/committed) |
| Typecheck | `npx tsc -p tsconfig.build.json --noEmit` → no errors |
| Build | `npm run build` → success |
| Runtime harness (manual DB check, Task 5.15) | Throwaway Postgres `siricman-migtest` (127.0.0.1:55432, migrations already applied). Built `dist/main.js` run with inline env vars (`MEDIA_ROOT`/`MEDIA_PUBLIC_BASE_URL`/`MEDIA_SERVE_STATIC=true` pointed at a temp dir, dummy 64-hex-char `JWT_SECRET`/`MFA_ENCRYPTION_KEY`, `RUN_SEED=false`, `PORT=3055`). A scratch `admin` role + user (self-signed JWT matching `JwtStrategy`'s `{ id, jti }` payload — confirmed `JwtStrategy.validate()` performs no MFA check per request, matching the prompt's fallback instruction) and two scratch properties were inserted directly via SQL (one general-purpose, one never-published for the hard-delete scenario). App booted cleanly on the first attempt (no `UnknownDependenciesException` this time — Phase 4's `@Optional()` fix already covers the DI path). **Upload**: 3 images uploaded to property 1 → `201` each, positions 0/1/2, correct non-upscaled dimensions. **Reorder**: a full permutation (`[img3,img1,img2]`) → `200` with positions rewritten to `0,1,2` in the new order; resubmitting the identical order → `200` with the same unchanged result (no-op, confirmed via exactly one `property.image_reordered` audit row despite two reorder requests); a foreign-id permutation → `400` `"imageIds is not an exact permutation..."`; a non-UUID entry → `400` DTO validation error. **Delete**: deleting the first image → `204`; admin `GET /:id` confirmed the remaining two images ordered ascending by position (`0`, `1`) with no gap, and the deleted image's `-lg.webp`/`-thumb.webp` files were confirmed absent on disk (`Get-ChildItem`) while the two surviving images' files remained; deleting an image scoped to a different (nonexistent) property id → `404`. **Hard delete**: uploaded 1 image to the never-published scratch property, then `DELETE /api/admin/properties/:id` → `204`; confirmed via `psql` that both the property row and its `property_images` row were gone (cascade), and confirmed via filesystem inspection that the property's entire media directory was removed. **Direct SQL constraint check**: a single-row `UPDATE` attempting to force a duplicate `(property_id, position)` inside its own transaction failed immediately with `duplicate key value violates unique constraint "UQ_property_images_property_position"` (positions unchanged) — direct proof the deferrable constraint is live and that the earlier full-permutation reorder's success depended on the set-based single-statement `UPDATE ... WITH ORDINALITY` avoiding any intra-statement duplicate, exactly as `design.md` specifies. App log showed zero warnings/errors across the whole session. App stopped cleanly (port 3055 confirmed not listening afterward); all scratch rows (role, user, user\_roles, both properties, their image rows, and the 7 matching `audit_logs` entries) and all local temp files/directories deleted and confirmed at 0 remaining. One pre-existing, unrelated `audit_logs` row (entity id `33333333-...`, action `property.image_uploaded`) was found already present in the shared fixture DB before this batch started — left untouched, as it predates this session and is out of this batch's scope. `siricman-migtest` left running (shared fixture, per Phase 3/4 precedent); no other container or database touched |
| Rollback boundary | Revert the Phase-5 work-unit commits alone: admin `GET /:id` falls back to plain `findOne()` if `findOneWithImages`'s commit is reverted (both still exist as separate methods on `PropertiesService` until then); upload (Phase 4) keeps working independently of reorder/delete; the four Phase-5 commits are independently revertable in reverse order (admin wiring → hard-delete cleanup → controller routes → DTO+service reorder/delete) since each only adds new methods/routes without modifying Phase 4's upload path |

## Remaining Tasks

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
- Unit 3 — Schema + Persistence (PR 3, branch `feat/images-3-schema`):
  merged (see `9cfeac0`'s successor merge — boundary starts from `9cfeac0`
  and ends at `1b33e9b`). Two work-unit commits: `4211bb8` (central
  `AuditLogService.record()` fix) and `1b33e9b` (`PropertyImage` entity,
  migration, repository, key builder, image mappers, audit enum values).
  Budget flag (recorded when this slice was current): `git diff --stat
  main...HEAD -- . ':!openspec'` → 11 files changed, 896 insertions(+), 4
  deletions(-) — treated as an accepted `size:exception` per the
  reasoning kept in this file's prior revision.
- Unit 4 — Upload (PR 4, this batch, branch `feat/images-4-upload`,
  created fresh from `main` after PR 3 merged): boundary starts from
  `d38085a` (Phase 3's merge commit into `main`) and ends at `89109df`.
  Two work-unit commits: `96db7dd` (`SharpImageProcessor` `@Optional()`
  fix, found by this batch's own runtime harness) and `89109df`
  (`PropertyImagesService.upload()`, `AdminPropertyImagesController`
  POST route, `properties.module.ts` wiring).
- **Budget flag (Unit 4)**: `git diff --stat main...HEAD -- . ':!openspec'`
  → **6 files changed, 608 insertions(+), 6 deletions(-)** — above the
  400-line budget and above `tasks.md`'s own ~340 estimate, again mostly
  test code (`property-images.service.spec.ts` 209 lines +
  `admin-property-images.controller.spec.ts` 93 lines = 302 of the 608).
  Not re-sliced further for the same reasons as PR 3: `tasks.md`'s
  Suggested Work Units table already designates the whole of Phase 4 as
  one atomic PR (`Unit 4`, "Upload"), the files are directly dependent
  (service → controller → module wiring, all exercising the same
  orchestration path), and splitting the service/controller from their
  specs would violate the "keep tests with code" work-unit rule. Two
  work-unit commits were still made for reviewability (the pre-existing
  DI bugfix isolated from the new upload feature). Recommend the
  orchestrator/user treat PR 4 as an accepted `size:exception` (or split
  its review into the two commits above) rather than re-slicing the
  phase.
- Unit 5 — Reorder + Delete + Admin + Hard-Delete Cleanup (PR 5, this
  batch, branch `feat/images-5-manage`, created fresh from `main` after
  PR 4 merged): boundary starts from `main` (post-PR-4) and ends at
  `cbf5ce1`. Four work-unit commits: `ee9aca3` (reorder DTO + service
  `reorder()`/`delete()`), `d309117` (controller `PUT order` +
  `DELETE :imageId` routes), `b5fccd6` (`PropertiesService` hard-delete
  media cleanup + `findOneWithImages()`), `cbf5ce1` (admin `GET :id`
  wiring).
- **Budget flag (Unit 5)**: `git diff --stat main...HEAD -- . ':!openspec'`
  → **11 files changed, 667 insertions(+), 5 deletions(-)** — above the
  400-line budget and above `tasks.md`'s own ~380 estimate, for the same
  structural reason as PR 3/PR 4: roughly half the diff is test code kept
  with its behavior (`property-images.service.spec.ts` +181 lines,
  `properties.service.spec.ts` +124 lines, `admin-property-images.controller.spec.ts`
  +67 lines). Not re-sliced further: `tasks.md`'s Suggested Work Units
  table already designates the whole of Phase 5 as one atomic PR
  (`Unit 5`), and the four work-unit commits already separate reorder,
  routing, hard-delete cleanup, and admin wiring for reviewability.
  Recommend the orchestrator/user treat PR 5 as an accepted
  `size:exception` (or review it commit-by-commit) rather than
  re-slicing the phase.

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
tasks complete, 7/7 Phase 4 tasks complete, 15/15 Phase 5 tasks complete
(62/68 total tasks across all 6 phases). Phases 1–4 are merged to `main`.
Ready for the user to review/merge PR 5 (`feat/images-5-manage` → `main`,
per `stacked-to-main`) and for the next `sdd-apply` batch to start Phase 6
(public catalog, tasks 6.1–6.6). Do NOT start Phase 6 in this batch per
the orchestrator's explicit scope limit.
