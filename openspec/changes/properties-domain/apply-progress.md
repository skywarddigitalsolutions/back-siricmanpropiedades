# Apply Progress: Properties Domain (back)

## Scope of this batch

Phase 3a only (PR slice 3a: Admin Create/Update/Get), tasks 3a.1–3a.17.
Phase 1 (Neighborhoods) and Phase 2 (Property Schema Foundation) were
completed and merged in prior batches (see below). Phases 3b–5b are NOT
started.

## Mode

**Strict TDD Mode** (`npm test`, jest + ts-jest, `rootDir: src`).

## Branch / Commit State

Branch: `feat/properties-3a-admin-crud` (from `main`, after PR 1/neighborhoods
and PR 2/property-schema merged). Starting commit `5b396d7` (merge of PR 2).
This apply batch adds one implementation commit (`ec05f7d` —
"feat(properties): add admin create/update/get for properties") on top; the
docs commit for `tasks.md`/`apply-progress.md` follows separately, same
pattern as Phase 2. No push, no PR, no branch switch performed.

## Prior batches (for reference)

Phase 1 was implemented on `feat/properties-1-neighborhoods` and merged via
PR 1. Phase 2 was implemented on `feat/properties-2-schema` (starting commit
`ae5adeb`, implementation commit `b4dfe09`) and merged via PR 2. Both
branches no longer exist locally; this batch starts fresh from `main` per
the orchestrator's session instructions.

## Completed Tasks — Phase 1 (16/17; 1.5 intentionally left open)

- [x] 1.1 RED `src/common/utils/slugify.spec.ts`
- [x] 1.2 GREEN `src/common/utils/slugify.ts`
- [x] 1.3 RED `src/neighborhoods/caba-neighborhoods.spec.ts`
- [x] 1.4 GREEN `src/migrations/1790500000000-CreateNeighborhoods.ts` (+ `CABA_NEIGHBORHOODS`)
- [ ] **1.5 MANUAL** — signed off 2026-09-27 (see PR 1 description / prior apply-progress); left as the historical record, not re-verified this batch.
- [x] 1.6 `AuditAction.NEIGHBORHOOD_CREATED` added (additive)
- [x] 1.7 RED `src/neighborhoods/dto/create-neighborhood.dto.spec.ts`
- [x] 1.8 GREEN `src/neighborhoods/dto/create-neighborhood.dto.ts` + `dto/index.ts`
- [x] 1.9 GREEN `src/neighborhoods/entities/neighborhood.entity.ts`
- [x] 1.10 RED `src/neighborhoods/neighborhoods.service.spec.ts`
- [x] 1.11 GREEN `src/neighborhoods/neighborhoods.service.ts`
- [x] 1.12 RED `src/neighborhoods/neighborhoods.controller.spec.ts`
- [x] 1.13 GREEN `src/neighborhoods/neighborhoods.controller.ts`
- [x] 1.14 GREEN `src/neighborhoods/neighborhoods.module.ts`
- [x] 1.15 GREEN `src/app.module.ts` registers `NeighborhoodsModule` (additive)
- [x] 1.16 Verify slice — all four gates green (prior batch)

(Phase 1 TDD Cycle Evidence and Verification Evidence are preserved in git
history / the merged PR 1; not repeated here to keep this artifact focused
on the current batch. See commits `0d18434`..`c260f7b`.)

## Completed Tasks — Phase 2 (9/9)

- [x] 2.1 RED `src/common/transformers/numeric.transformer.spec.ts`
- [x] 2.2 GREEN `src/common/transformers/numeric.transformer.ts`
- [x] 2.3 GREEN `src/properties/enums/property.enums.ts`
- [x] 2.4 GREEN `src/migrations/1790500000001-CreateProperties.ts`
- [x] 2.5 GREEN `src/properties/entities/property.entity.ts`
- [x] 2.6 GREEN `src/properties/properties.module.ts` (skeleton, empty controllers/providers)
- [x] 2.7 GREEN `src/app.module.ts` registers `PropertiesModule` (additive)
- [x] 2.8 **MANUAL, executed this batch** — migration run/verify/revert/verify/run against `siricman-migtest` (see Migration Evidence below)
- [x] 2.9 Verify slice — all four gates green (see Verification Evidence)

## TDD Cycle Evidence (Phase 2)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1/2.2 | `src/common/transformers/numeric.transformer.spec.ts` | Unit (pure) | N/A (new) | ✅ Written — failed with `TS2307: Cannot find module './numeric.transformer'` | ✅ 9/9 passed after implementing `numeric.transformer.ts` | ✅ 9 cases: `to()` decimal/zero/null/undefined, `from()` decimal-string/integer-string/null/undefined, plus a `to()`→`from()` round-trip | ✅ First implementation attempt used explicit `number \| null \| undefined` return-type annotations; with `strictNullChecks: false` (project tsconfig) those annotations collapse to plain `number`, so `return value` (a string) failed to typecheck. Simplified to inferred return types — still minimal, no behavior change, tests re-run green. |
| 2.3 | N/A — purely structural/declarative (six TS enums whose values are string literals fixed by the design's Postgres enum definitions) | N/A | N/A | N/A | N/A | Triangulation skipped: single possible output, no branching/logic (enum member list, verified by successful compilation against the migration's `CREATE TYPE` statements in 2.8) | N/A |
| 2.4 | N/A — declarative raw-SQL migration (columns/constraints/indexes fixed 1:1 by `design.md`'s tables) | N/A (new) | N/A | N/A | N/A | Triangulation skipped: single possible output (schema DDL, not branching logic). Correctness verified operationally in 2.8 (run/revert/run against a real Postgres instance + full `\d properties` inspection), which is a stronger proof for DDL than a unit test would be. | N/A |
| 2.5 | N/A — entity mirrors the 2.4 migration's columns 1:1 (declarative TypeORM metadata) | N/A (new) | N/A | N/A | N/A | Triangulation skipped: single possible output (column-to-decorator mapping). Correctness cross-checked against 2.4's DDL column-by-column while writing the file. | N/A |
| 2.6, 2.7 | N/A — purely structural (module wiring, `imports`/`controllers`/`providers` arrays, `AppModule` registration) | N/A | N/A | N/A | N/A | Triangulation skipped: single possible output, no branching/logic | N/A |

### Test Summary (Phase 2)
- **Total tests written this batch**: 9 (numeric transformer)
- **Total tests passing**: 9/9 (batch), 150/150 (full suite after this batch)
- **Layers used**: Unit only — no integration/e2e harness exists in this project (`openspec/config.yaml`: `integration: false`, `e2e: false`). The migration (2.4) and entity (2.5) are declarative/structural work with no test scenarios in `tasks.md`; their correctness is proven operationally via the manual migration run/revert/run in 2.8, not via jest.
- **Approval tests** (refactoring): None — the only pre-existing files modified are `app.module.ts` (additive import + registration, no behavior change to existing routes) and `openspec/changes/properties-domain/tasks.md` (checkbox updates); neither needed approval tests, confirmed by the unchanged full-suite pass count for everything outside this batch's new files.
- **Pure functions created**: 0 new pure functions this batch beyond the transformer object (`numericTransformer.to`/`.from`); no branching business logic was introduced in Phase 2 (that starts in Phase 3a).

## Work Unit Evidence (Phase 2)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- src/properties/entities src/common/transformers` → **1 suite, 9 tests, all passed** (the `entities` path matches no spec file — `Property` is declarative, covered structurally by the migration verification, not unit tests) |
| Runtime harness command/scenario and exact result | **Executed** against the authorized throwaway container `siricman-migtest` (127.0.0.1:55432). See Migration Evidence below — full run → schema inspection → revert → post-revert inspection → run again, all as expected. |
| Rollback boundary | Revert commit `b4dfe09`: drops `src/common/transformers/numeric.transformer.ts(+.spec)`, `src/properties/enums/property.enums.ts`, `src/properties/entities/property.entity.ts`, `src/properties/properties.module.ts`, `src/migrations/1790500000001-CreateProperties.ts`, and the additive `PropertiesModule` import/registration in `app.module.ts`. No other code depends on `PropertiesModule` yet (empty `controllers`/`providers`). At the DB level, `npm run migration:revert` against any environment where this migration ran drops `properties`, its owned sequence, and the six enum types, leaving `neighborhoods` and all prior tables untouched (verified below). |

## Migration Evidence (Task 2.8)

Executed against `siricman-migtest` (127.0.0.1:55432, db `migtest`, already had `InitSchema` + `CreateNeighborhoods` applied):

| Step | Command | Result |
|---|---|---|
| 1. Run | `DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=postgres DB_PASSWORD=migtest DB_NAME=migtest npm run migration:run` | **PASS** — `CreateProperties1790500000001` executed successfully (enum types, sequence, table, FK, 5 indexes all created in one transaction, committed). |
| 2. Verify schema | `docker exec siricman-migtest psql -U postgres -d migtest -c "\d properties"` | **PASS** — all 34 columns present with correct types/defaults/nullability matching `design.md`; `PK_properties`, `UQ_properties_code`, `UQ_properties_slug`, `FK_properties_neighborhood ... ON DELETE RESTRICT` all present; all 5 named indexes present (`IDX_properties_pub_status_first_published_at`, `IDX_properties_currency_price`, `IDX_properties_pub_status_operation_type`, `IDX_properties_neighborhood_id`, `IDX_properties_created_at`). |
| 3. Verify enums/sequence | `SELECT typname FROM pg_type WHERE typname LIKE 'property_%'` / `SELECT sequence_name, start_value FROM information_schema.sequences WHERE sequence_name = 'property_code_seq'` | **PASS** — all 6 enum types present; `property_code_seq` `start_value = 101`. |
| 4. Revert | `DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=postgres DB_PASSWORD=migtest DB_NAME=migtest npm run migration:revert` | **PASS** — `CreateProperties1790500000001` reverted successfully in one transaction. |
| 5. Verify post-revert | `\dt` / `SELECT typname FROM pg_type WHERE typname LIKE 'property_%'` / `SELECT count(*) FROM neighborhoods` | **PASS** — `properties` table gone, all 6 enum types gone, `neighborhoods` untouched with all 48 rows intact. |
| 6. Run again | same as step 1 | **PASS** — re-applies cleanly, no errors. |

**Deviation from the literal task wording**: task 2.8 (and `design.md`'s Migration/Rollout section) describe reverting "twice (properties, then neighborhoods)". The orchestrator's session instructions for this batch scoped the authorized DB session narrowly: revert only the properties migration and leave neighborhoods (and its 48 seeded rows) intact in the shared throwaway container, since Phase 1 was already independently verified against a real DB in a prior session and reverting neighborhoods here was not requested. This is a narrower, explicitly-authorized verification, not a skipped check — properties' `down()` was fully exercised and neighborhoods' `down()` was already verified in Phase 1's own migration testing.

## Verification Evidence (Task 2.9)

| Command | Observed result |
|---|---|
| `npm test` | **PASS** — 16 test suites, 150 tests, 0 failed. Exit code 0. |
| `npm run lint` | **PASS** — `eslint "src/**/*.ts" --fix`, exit code 0, no reported errors, no output. |
| `npx tsc -p tsconfig.build.json --noEmit` | **PASS** — no output, exit code 0. |
| `npm run build` | **PASS** — `nest build`, no output, exit code 0. |

## Files Changed (Phase 2)

| File | Action |
|------|--------|
| `src/common/transformers/numeric.transformer.ts` | Created |
| `src/common/transformers/numeric.transformer.spec.ts` | Created |
| `src/properties/enums/property.enums.ts` | Created |
| `src/migrations/1790500000001-CreateProperties.ts` | Created |
| `src/properties/entities/property.entity.ts` | Created |
| `src/properties/properties.module.ts` | Created |
| `src/app.module.ts` | Modified (additive: `PropertiesModule` import + registration) |

## Deviations from Design (Phase 2)

None functionally — implementation matches `design.md`'s column table, index list, enum definitions, and migration shape exactly. See the noted narrower-scope deviation in Migration Evidence above (only the properties migration was reverted this session, per explicit orchestrator instruction; neighborhoods was left applied).

## Completed Tasks — Phase 3a (17/17)

- [x] 3a.1 RED `src/properties/helpers/property-identifiers.spec.ts`
- [x] 3a.2 GREEN `src/properties/helpers/property-identifiers.ts`
- [x] 3a.3 GREEN `src/common/interfaces/paginated.interface.ts`
- [x] 3a.4 `AuditAction.PROPERTY_CREATED` / `PROPERTY_UPDATED` added (additive)
- [x] 3a.5 GREEN `src/properties/dto/create-property.dto.ts`, `update-property.dto.ts`, `dto/index.ts`
- [x] 3a.6 RED `src/properties/dto/create-property.dto.spec.ts`
- [x] 3a.7 GREEN — DTO validators adjusted until 3a.6 passed (no adjustment needed beyond the initial implementation)
- [x] 3a.8 RED `src/properties/services/properties.service.spec.ts` (`create`)
- [x] 3a.9 GREEN `PropertiesService.create()`
- [x] 3a.10 RED extend `properties.service.spec.ts` (`update`)
- [x] 3a.11 GREEN `PropertiesService.update()`
- [x] 3a.12 RED extend `properties.service.spec.ts` (`findOne`)
- [x] 3a.13 GREEN `PropertiesService.findOne()` (+ REFACTOR: `update()` now calls `this.findOne(id)` instead of duplicating the fetch/404 logic)
- [x] 3a.14 RED `src/properties/controllers/admin-properties.controller.spec.ts`
- [x] 3a.15 GREEN `src/properties/controllers/admin-properties.controller.ts`
- [x] 3a.16 GREEN `src/properties/properties.module.ts` wires `PropertiesService` + `AdminPropertiesController`
- [x] 3a.17 Verify slice — all four gates green (see Verification Evidence below)

## TDD Cycle Evidence (Phase 3a)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3a.1/3a.2 | `src/properties/helpers/property-identifiers.spec.ts` | Unit (pure) | N/A (new) | ✅ Written — failed with `TS2307: Cannot find module './property-identifiers'` | ✅ 4/4 passed after implementing `formatPropertyCode`/`buildPropertySlug` | ✅ 2 cases per function (two sequence values for `formatPropertyCode`; normal-length and >80-char title for `buildPropertySlug`) | ➖ None needed — both functions are single-expression compositions of already-tested primitives (`slugify`) |
| 3a.3 | N/A — purely structural (single interface declaration, no runtime logic) | N/A | N/A | N/A | N/A | Triangulation skipped: single possible output, no branching/logic | N/A |
| 3a.4 | N/A — purely structural (two additive enum members) | N/A | N/A | N/A | N/A | Triangulation skipped: single possible output, no branching/logic | N/A |
| 3a.5–3a.7 | `src/properties/dto/create-property.dto.spec.ts` | Unit (DTO validation) | N/A (new) | ✅ Written first — failed with `TS2307: Cannot find module './create-property.dto'` (test authored *before* the DTO, ahead of the literal 3a.5→3a.6 task order, to keep the "test before production code" law; the DTO/validators were then written once as the 3a.7 GREEN, no further adjustment needed) | ✅ 5/5 passed after implementing `CreatePropertyDto`/`UpdatePropertyDto` | ✅ 5 cases: invalid enum, missing required field, negative numeric field, fully valid payload, `code`/`slug`/`publicationStatus` rejected via full `ValidationPipe` (whitelist + forbidNonWhitelisted) | ➖ None needed — declarative decorator list, no branching logic to simplify |
| 3a.8/3a.9 | `src/properties/services/properties.service.spec.ts` (`create`) | Unit (mocked repositories) | N/A (new) | ✅ Written — failed with `TS2307: Cannot find module './properties.service'` | ✅ 2/2 passed after implementing `create()` | ✅ 2 cases: successful creation (code/slug/status/audit) and missing-neighborhood rejection (no reserve/save/audit) | ➖ None needed at this step (see 3a.4 REFACTOR entry below for the lint-driven type-safety refactor) |
| 3a.10/3a.11 | extend `properties.service.spec.ts` (`update`) | Unit (mocked repositories) | ✅ 2/2 (create tests) re-run green before extending | ✅ Written — failed with `TS2339: Property 'update' does not exist on type 'PropertiesService'` | ✅ 5/5 passed after implementing `update()` | ✅ 5 cases: slug regenerated pre-publish, slug frozen post-publish, no-op with no changes, save+audit with `changedFields`, `code`/`slug` DTO keys ignored | ➖ None needed beyond the 3a.13 extraction (below) |
| 3a.12/3a.13 | extend `properties.service.spec.ts` (`findOne`) | Unit (mocked repositories) | ✅ 7/7 (create+update tests) re-run green before extending | ✅ Written — failed with `TS2339: Property 'findOne' does not exist on type 'PropertiesService'` | ✅ 2/2 passed after implementing `findOne()` | ✅ 2 cases: found (joined with neighborhood) and missing (`NotFoundException`) | ✅ `update()` refactored to call `this.findOne(id)` instead of its own inline fetch+404, removing duplication; full spec file (9/9) re-run green after the refactor |
| 3a.14/3a.15 | `src/properties/controllers/admin-properties.controller.spec.ts` | Unit (class metadata) | N/A (new) | ✅ Written — failed with `TS2307: Cannot find module './admin-properties.controller'` | ✅ 1/1 passed after implementing the controller with class-level `@Auth(admin, manager)` | ➖ Single scenario — class-level role metadata has one expected value; the guard-boundary behavior itself (401/403 resolution) is existing, already-tested `AuthGuard`/`UserRoleGuard` infrastructure, matching the precedent set by `neighborhoods.controller.spec.ts` | ➖ None needed |
| — | N/A — lint-driven type-safety refactor (not a new test) | N/A | N/A | N/A | N/A | N/A | ✅ `eslint --fix` flagged `no-unsafe-assignment`/`no-unsafe-member-access` on `propertyRepository.query(...)` (TypeORM's `query<T = any>` returns `any` when uninferred) and `no-unused-vars` on destructure-based field exclusion in `create()`/`update()`. Fixed by (a) passing an explicit generic `query<{ value: string }[]>(...)` instead of casting the awaited `any`, and (b) replacing destructure-and-discard with an explicit field allowlist (`UPDATABLE_FIELDS`) / explicit per-field object literal in `create()`. All 19 `src/properties/**` tests re-run green after each fix. |

### Test Summary (Phase 3a)
- **Total tests written this batch**: 19 (4 identifiers, 5 DTO, 9 service, 1 controller)
- **Total tests passing**: 19/19 (batch), 169/169 (full suite after this batch)
- **Layers used**: Unit only — no integration/e2e harness exists in this project (`openspec/config.yaml`: `integration: false`, `e2e: false`). Service tests use hand-mocked repositories via `getRepositoryToken`, matching `NeighborhoodsService.spec.ts`/`UsersService.spec.ts`. Controller test asserts `Reflect.getMetadata` class-level role metadata, matching `NeighborhoodsController.spec.ts`'s method-level pattern.
- **Approval tests** (refactoring): None — `src/audit/enums/audit-action.enum.ts` and `src/properties/properties.module.ts` were modified additively (new enum members; empty `controllers`/`providers` arrays populated), not refactored; no pre-existing behavior changed, confirmed by the full-suite pass count for everything outside this batch's new files (150 pre-existing tests all still pass unchanged).
- **Pure functions created**: 2 (`formatPropertyCode`, `buildPropertySlug`) — both triangulated with 2 cases each. No new pure functions in the service/controller layer (I/O-bound by nature); business logic that could be pure (the `update()` field-diffing loop) stays in the service because it needs the fetched entity, matching `UsersService`'s existing pattern (e.g. `activate`/`deactivate`) rather than the query-builder pure-helper pattern reserved for Phase 3b/5a.

## Deviations from Design (Phase 3a)

1. **TDD task-order deviation (procedural, not behavioral)**: `tasks.md` sequences 3a.5 (GREEN: create the DTO) before 3a.6 (RED: write the DTO spec) and 3a.7 (GREEN: adjust). Strict TDD's non-negotiable law is "no production code before a failing test," so the actual execution order was: write `create-property.dto.spec.ts` first (guaranteed RED — the DTO module didn't exist), then implement `create-property.dto.ts`/`update-property.dto.ts` once as the combined 3a.5+3a.7 GREEN. All three tasks (3a.5, 3a.6, 3a.7) are still fully delivered and checked off; only the *chronological* order of writing was inverted to honor strict TDD. Same reasoning applied narrowly to 3a.8 vs. the literal reading of "3a.8 RED... 3a.9 GREEN" (already the correct order) — no deviation there.
2. **`neighborhoodId` is not an editable field in `update()`**: `design.md` lists `neighborhoodId` as part of `CreatePropertyDto`, and `UpdatePropertyDto = PartialType(CreatePropertyDto)` therefore types it as an optional update field, but **task 3a.10's enumerated test scenarios do not include a neighborhood-change scenario**, and `design.md`'s prose for `update()` only describes slug regeneration, the no-op case, and `changedFields` — it does not specify how a neighborhood change should be resolved (repository lookup, 400-if-missing, etc.). To avoid speculative untested behavior, `PropertiesService.update()` explicitly excludes `neighborhoodId` from the diffed/applied fields (see `UPDATABLE_FIELDS` and its doc comment). **This is a real gap**: submitting `neighborhoodId` in a `PATCH` request is currently silently ignored (not rejected — the DTO still accepts it since it's inherited from `CreatePropertyDto` via `PartialType`, but the service drops it). Flagged as an open item below for a follow-up task (either Phase 3b/4 or a dedicated task) to decide and implement the intended behavior.
3. **Everything else matches `design.md` exactly**: sequence reservation via `propertyRepository.query('SELECT nextval(...)')`, code format (`SP-<n>`), slug derivation and freeze rule, `changedFields`-based audit metadata, `NotFoundException('Property not found')` message, class-level `@Auth(admin, manager)` guard boundary (method-level `@RoleProtected(admin)` for `DELETE` is Phase 4, not this slice).

## Work Unit Evidence (Phase 3a)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- src/properties/helpers/property-identifiers src/properties/dto/create-property.dto src/properties/services/properties.service src/properties/controllers/admin-properties.controller` → **4 suites, 19 tests, all passed** |
| Runtime harness command/scenario and exact result | **N/A** — unit-only (mocked repositories via `getRepositoryToken`, no DB/HTTP harness in this project per `openspec/config.yaml`'s `integration: false`/`e2e: false`), as forecast in `tasks.md`'s Suggested Work Units table for unit 3a. No schema change in this slice, so no migration harness applies either. |
| Rollback boundary | Revert commit `ec05f7d`: drops `src/properties/helpers/property-identifiers.ts(+.spec)`, `src/properties/dto/{create-property,update-property,index}.ts(+.spec)`, `src/properties/services/properties.service.ts(+.spec)`, `src/properties/controllers/admin-properties.controller.ts(+.spec)`, `src/common/interfaces/paginated.interface.ts`, and reverts the additive `PROPERTY_CREATED`/`PROPERTY_UPDATED` audit actions and the `PropertiesService`/`AdminPropertiesController` wiring in `properties.module.ts` back to the Phase 2 empty-skeleton state. No schema/migration change in this slice, so no DB rollback is needed. No other module depends on these new files yet (Phase 3b/4/5b build on top in later batches). |

## Verification Evidence (Task 3a.17)

| Command | Observed result |
|---|---|
| `npm test` | **PASS** — 20 test suites, 169 tests, 0 failed. Exit code 0. |
| `npm run lint` | **PASS** — `eslint "src/**/*.ts" --fix`, exit code 0, no reported errors, no output (after the type-safety fixes noted in the TDD Cycle Evidence refactor row above). |
| `npx tsc -p tsconfig.build.json --noEmit` | **PASS** — no output, exit code 0. |
| `npm run build` | **PASS** — `nest build`, no output, exit code 0. |

## Files Changed (Phase 3a)

| File | Action |
|------|--------|
| `src/audit/enums/audit-action.enum.ts` | Modified (additive: `PROPERTY_CREATED`, `PROPERTY_UPDATED`) |
| `src/common/interfaces/paginated.interface.ts` | Created |
| `src/properties/helpers/property-identifiers.ts` (+ `.spec.ts`) | Created |
| `src/properties/dto/create-property.dto.ts` (+ `.spec.ts`) | Created |
| `src/properties/dto/update-property.dto.ts` | Created |
| `src/properties/dto/index.ts` | Created |
| `src/properties/services/properties.service.ts` (+ `.spec.ts`) | Created |
| `src/properties/controllers/admin-properties.controller.ts` (+ `.spec.ts`) | Created |
| `src/properties/properties.module.ts` | Modified (wires `PropertiesService` + `AdminPropertiesController`, replacing the Phase 2 empty skeleton) |

## Review Budget (Phase 3a)

`git diff --stat` for the implementation commit (`ec05f7d`) vs. its parent (`5b396d7`, PR 2's merge commit): **821 insertions(+), 6 deletions(-)** across 13 files (excluding `openspec/**`, `.atl/`, `.codegraph/`).

This is **above** `tasks.md`'s own forecast for this slice (~400-450 lines) and above the session's 400-line review budget. No content was cut, compressed, or restyled to fit — per the apply skill's explicit instruction, the slice was implemented honestly and the overage is reported rather than iterated against. The main drivers: `create-property.dto.ts` (168 lines) has ~25 fields each needing 2-4 lines of decorators (an inherent DTO-verbosity cost, not incidental), and full TDD coverage across 4 new production files added 336 lines of test code (214 service + 82 DTO + 29 identifiers + 11 controller). **Recommendation**: treat PR 3a as `size:exception` under the `ask-on-risk` delivery strategy — the slice is already the smallest cohesive unit for "admin create/update/get" (splitting `create`/`update`/`findOne` further would break the single-controller, single-service cohesion the design calls for), and the orchestrator/user already accepted a 7-PR stacked chain for this change.

## Open Items Carried Forward

- Task 1.5 (manual barrio-spelling review) — already signed off in a prior batch (2026-09-27); not re-verified this batch.
- **New**: `neighborhoodId` changes via `PATCH /api/admin/properties/:id` are silently ignored by `PropertiesService.update()` (see Deviation 2 above) — needs an explicit product/design decision (allow with a neighborhood-existence check, or explicitly reject with 400) before it's implemented, likely as a Phase 3b/4 follow-up or a small dedicated task.
- **New**: PR 3a's authored line count (827) exceeds both `tasks.md`'s forecast and the 400-line review budget — flagged above for a `size:exception` decision before/at review time; not re-splittable without breaking cohesion.
- Phase 3b onward — NOT started.

## Next Step

Phase 3a (tasks 3a.1–3a.17) is complete and verified (`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` all green). Ready for the next `sdd-apply` batch to start Phase 3b (Admin Filters and List) once PR 3a is reviewed/merged (or explicitly continued) per the `stacked-to-main` chain strategy. Per this batch's explicit scope (Phase 3a ONLY), Phase 3b was NOT started.
