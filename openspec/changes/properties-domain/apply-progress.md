# Apply Progress: Properties Domain (back)

## Scope of this batch

Phase 5b only (PR slice 5b: Public Mapper, Service, Controller), tasks
5b.1–5b.7 — the final slice (7 of 7) of the `properties-domain` change.
Phase 1 (Neighborhoods), Phase 2 (Property Schema Foundation), Phase 3a
(Admin Create/Update/Get), Phase 3b (Admin Filters and List), Phase 4
(Lifecycle, Deal Status, Hard Delete), and Phase 5a (Public Filters DTO and
Query Builder) were completed in prior batches (see below). PR #9
(`feat/properties-5a-public-filters`) was open, not yet merged, when this
batch started, stacked on PR #8 (`feat/properties-4-lifecycle`, also open)
→ PR #7 (`feat/properties-3b-admin-list`, also open) — this batch stacks on
top of PR #9's tip per the `stacked-to-main` chain strategy, on branch
`feat/properties-5b-public-catalog`.

**Previous "Scope of this batch" (Phase 5a, for reference)**: Phase 5a only
(PR slice 5a: Public Filters DTO and Query Builder), tasks 5a.1–5a.7. PR #8
(`feat/properties-4-lifecycle`) was open, not yet merged, when that batch
started, stacked on PR #7 (`feat/properties-3b-admin-list`, also open) —
that batch stacked on top of PR #8's tip per the `stacked-to-main` chain
strategy, on branch `feat/properties-5a-public-filters`. Phase 5b was NOT
started in that batch.

## Mode

**Strict TDD Mode** (`npm test`, jest + ts-jest, `rootDir: src`).

## Branch / Commit State

Branch: `feat/properties-3a-admin-crud` (from `main`, after PR 1/neighborhoods
and PR 2/property-schema merged). Starting commit `5b396d7` (merge of PR 2).
This apply batch adds one implementation commit (`ec05f7d` —
"feat(properties): add admin create/update/get for properties") on top; the
docs commit for `tasks.md`/`apply-progress.md` follows separately, same
pattern as Phase 2. No push, no PR, no branch switch performed.

**Phase 3b branch/commit state**: `feat/properties-3b-admin-list`, stacked
on `feat/properties-3a-admin-crud` (PR #6, open, not yet merged), per
`stacked-to-main`. Starting point: tip of `feat/properties-3a-admin-crud`
at the time this batch started (commit `7e10eb9` — "docs(properties-domain):
record neighborhoodId-on-update fix in apply progress"). This batch adds
implementation commit `269bbf4` — "feat(properties): add admin filters and
list endpoint"; the docs commit for `tasks.md`/`apply-progress.md` follows
separately, same pattern as prior batches. No push, no PR, no branch switch
performed.

**Phase 4 branch/commit state**: `feat/properties-4-lifecycle`, stacked on
`feat/properties-3b-admin-list` (PR #7, open, not yet merged; PR 3a already
merged to `main` by this point), per `stacked-to-main`. Starting point: tip
of `feat/properties-3b-admin-list` at the time this batch started (commit
`e121817` — "docs(properties-domain): mark phase 3b tasks complete, record
apply progress"). This batch adds implementation commit `5f3c5d4` —
"feat(properties): add lifecycle, deal status, and hard delete"; the docs
commit for `tasks.md`/`apply-progress.md` follows separately, same pattern
as prior batches. No push, no PR, no branch switch performed.

**Phase 5a branch/commit state**: `feat/properties-5a-public-filters`,
stacked on `feat/properties-4-lifecycle` (PR #8, open, not yet merged),
which is itself stacked on `feat/properties-3b-admin-list` (PR #7, open,
not yet merged), per `stacked-to-main`. Starting point: tip of
`feat/properties-4-lifecycle` at the time this batch started (commit
`7f82c58` — "docs(properties-domain): mark phase 4 tasks complete, record
apply progress"). This batch adds implementation commit `d481474` —
"feat(properties): add public filters DTO and query builder"; the docs
commit for `tasks.md`/`apply-progress.md` follows separately, same pattern
as prior batches. No push, no PR, no branch switch performed.

**Phase 5b branch/commit state**: `feat/properties-5b-public-catalog`,
stacked on `feat/properties-5a-public-filters` (PR #9, open, not yet
merged), which is itself stacked on `feat/properties-4-lifecycle` (PR #8,
open, not yet merged) → `feat/properties-3b-admin-list` (PR #7, open, not
yet merged), per `stacked-to-main`. Starting point: tip of
`feat/properties-5a-public-filters` at the time this batch started (the
commit recording Phase 5a's tasks/apply-progress). This batch adds
implementation commit `a7f509f` — "feat(properties): add public mapper,
service, and controller"; the docs commit for `tasks.md`/`apply-progress.md`
follows separately, same pattern as prior batches. No push, no PR, no
branch switch performed.

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
2. **`neighborhoodId` is not an editable field in `update()`** — **RESOLVED in the follow-up batch below** (see "Follow-up: `neighborhoodId` on Update"). Originally: `design.md` listed `neighborhoodId` as part of `CreatePropertyDto`, and `UpdatePropertyDto = PartialType(CreatePropertyDto)` therefore typed it as an optional update field, but task 3a.10's enumerated test scenarios did not include a neighborhood-change scenario, and `design.md`'s prose for `update()` only described slug regeneration, the no-op case, and `changedFields` — it did not specify how a neighborhood change should be resolved. `PropertiesService.update()` originally excluded `neighborhoodId` from the diffed/applied fields entirely, so it was silently ignored on `PATCH`. Now implemented using the same lookup-or-reject rule as `create()`.
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

## Follow-up: `neighborhoodId` on Update (same batch/branch, after initial Phase 3a handoff)

Resolves the "real gap" flagged in Deviation 2 above, per explicit orchestrator follow-up instruction. Same branch (`feat/properties-3a-admin-crud`), same rules (Strict TDD, no push/PR/branch switch, no AI attribution).

**Rule implemented** (identical to `create()`'s neighborhood-lookup rule): when `UpdatePropertyDto.neighborhoodId` is present and differs from the property's current neighborhood id, `PropertiesService.update()` looks it up via `neighborhoodRepository.findOne({ where: { id } })`; if not found, throws `BadRequestException('Neighborhood not found')` with no save and no audit; if found, reassigns `property.neighborhood` and includes `'neighborhoodId'` in the audited `changedFields`. If the submitted `neighborhoodId` equals the current neighborhood's id, it is a no-op for that field — no repository lookup is made at all.

### RED → GREEN evidence

| Test | RED | GREEN |
|---|---|---|
| "applies a neighborhood change: looks up the new neighborhood, sets the relation, and records neighborhoodId in changedFields" | ✅ Failed — `neighborhoodRepository.findOne` never called (0 calls), because `neighborhoodId` was previously ignored entirely | ✅ Passed after adding the lookup-and-reassign branch |
| "rejects a neighborhood change to a nonexistent neighborhood, without saving or auditing" | ✅ Failed — `rejects.toThrow()` saw a resolved promise instead (previously a silent no-op, since `neighborhoodId` wasn't diffed) | ✅ Passed — `BadRequestException` thrown, `save`/`record` not called |
| "treats submitting the current neighborhoodId as a no-op for that field (no lookup, no save, no audit)" | ➖ Already passed before the fix (the old code ignored `neighborhoodId` unconditionally, so this specific assertion set held trivially); kept as regression-safety triangulation alongside the two RED cases above, per strict-tdd guidance that a test-extension batch's overall RED state is what gates the cycle, not every single assertion in isolation | ✅ Still passes post-fix — the new same-value branch also produces zero lookup calls |

All 3 new tests + the 9 pre-existing `PropertiesService` tests re-run green together (12/12) after the implementation.

### Test Summary (follow-up)
- Tests added: 3 (`update` → neighborhood change, missing neighborhood, same-value no-op)
- Full suite after this fix: **172/172 passing**, 20 suites (up from 169/20)

### Documentation updated
- `specs/property-management/spec.md` → **Property Update** requirement: added a paragraph on `neighborhoodId` update semantics, plus two new scenarios ("Update changes the property's neighborhood to an existing one", "Update rejects a change to a nonexistent neighborhood").
- `design.md` → **Decision: Update semantics**: added the `neighborhoodId` resolution rule (separate from the generic scalar-field diff, same lookup-or-reject as `create()`) to the Choice and Rationale.
- `UPDATABLE_FIELDS`'s doc comment in `properties.service.ts` updated to explain `neighborhoodId` is handled by a dedicated branch (relation, not a scalar column) rather than "not editable".

### Verification (foreground, observed)
| Command | Observed result |
|---|---|
| `npm test` | **PASS** — 20 test suites, 172 tests, 0 failed. Exit code 0. |
| `npm run lint` | **PASS** — `eslint "src/**/*.ts" --fix`, exit code 0, no errors, no output. |
| `npx tsc -p tsconfig.build.json --noEmit` | **PASS** — no output, exit code 0. |
| `npm run build` | **PASS** — `nest build`, no output, exit code 0. |

### Commit
`fix(properties): apply neighborhood changes on update` (implementation + spec/design docs in one commit; task-tracking commit for `apply-progress.md` follows separately, same pattern as prior batches). See exact hash and updated `git diff --stat main...HEAD -- . ':!openspec'` totals reported by the executor alongside this artifact.

## Completed Tasks — Phase 3b (7/7)

- [x] 3b.1 GREEN `src/properties/dto/admin-property-filters.dto.ts` (+ `dto/index.ts` export)
- [x] 3b.2 RED `src/properties/helpers/property-query.builder.spec.ts` (`buildAdminPropertyQuery`)
- [x] 3b.3 GREEN `src/properties/helpers/property-query.builder.ts` (`WhereClause`/`OrderClause`/`PropertyQuerySpec`, `PROPERTY_ALIAS`/`NEIGHBORHOOD_ALIAS`, `buildAdminPropertyQuery`)
- [x] 3b.4 RED extend `properties.service.spec.ts` (`findAll`)
- [x] 3b.5 GREEN `PropertiesService.findAll()`
- [x] 3b.6 GREEN `GET /` route on `AdminPropertiesController`
- [x] 3b.7 Verify slice — all four gates green (see Verification Evidence below)

## TDD Cycle Evidence (Phase 3b)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3b.1 | N/A — purely declarative query-param DTO (decorator list mirrors `design.md`'s DTO contract 1:1, no branching logic); its behavior is exercised indirectly by 3b.2/3b.4's tests against the query builder and service | N/A | N/A | N/A | N/A | Triangulation skipped: single possible output, no branching/logic (matches the precedent set for `Paginated<T>` in Phase 3a) | N/A |
| 3b.2/3b.3 | `src/properties/helpers/property-query.builder.spec.ts` | Unit (pure) | N/A (new) | ✅ Written first — failed with `TS2307: Cannot find module './property-query.builder'` (confirmed by running `npm test -- src/properties/helpers/property-query.builder` before creating the implementation file) | ✅ 11/11 passed after implementing `buildAdminPropertyQuery` | ✅ 11 cases: no-clause baseline, one case per equality filter (`publicationStatus`, `dealStatus`, `operation`, `type`, `neighborhoodId`) with unique param names, all-filters-combined uniqueness check, `q` `%`-wrapping + `%`/`_` escaping, default order, default `take`/`skip`, explicit `take`/`skip` from `limit`/`offset` | ➖ None needed — single-pass declarative clause list, no branching to simplify |
| 3b.4/3b.5 | extend `properties.service.spec.ts` (`findAll`) | Unit (mocked repository + chainable query-builder mock) | ✅ 12/12 (`create`+`update`+`findOne`) re-run green before extending | ✅ Written first — failed with `TS2339: Property 'findAll' does not exist on type 'PropertiesService'` (confirmed via `npm test -- src/properties/services/properties.service` before implementing) | ✅ 3/3 new tests passed after implementing `findAll()` | ✅ 3 cases: full clause/order/take/skip application with `{ items, total }` shape (also proves "Admin filters the list by publication status" — the DRAFT filter produces exactly one `andWhere` call), no-filter case returning rows of all three publication statuses (proves "Admin lists properties of every publication status"), and a single-filter case asserting no extra `andWhere` calls beyond the one requested | ➖ None needed — `findAll()` is a direct, linear application of the spec returned by `buildAdminPropertyQuery` |
| 3b.6 | N/A — route wiring only, no new branching logic (delegates directly to the already-tested `findAll()`) | N/A | N/A | N/A | N/A | Triangulation skipped: single possible output, no branching/logic (matches the precedent set for `create`/`findOne`/`update` route wiring in Phase 3a, whose HTTP-level behavior is proven by class-level guard-metadata tests, not per-route unit tests) | N/A |

### Test Summary (Phase 3b)
- **Total tests written this batch**: 14 (11 query-builder, 3 service `findAll`)
- **Total tests passing**: 14/14 (batch), 186/186 (full suite after this batch)
- **Layers used**: Unit only — no integration/e2e harness exists in this project (`openspec/config.yaml`: `integration: false`, `e2e: false`), matching the Suggested Work Units table's "N/A — unit-only" note for unit 3b. The service test uses a hand-built chainable query-builder mock (`andWhere`/`orderBy`/`addOrderBy`/`take`/`skip`/`innerJoinAndSelect` all returning `this`, `getManyAndCount` resolving `[rows, total]`), matching `design.md`'s Testing Strategy row for `PublicPropertiesService.findAll` (same mock shape, reused here one phase earlier for the admin path).
- **Approval tests** (refactoring): None — no pre-existing behavior was changed; `create`/`update`/`findOne` and their 12 existing tests re-run unchanged and green throughout.
- **Pure functions created**: 1 (`buildAdminPropertyQuery`), triangulated with 11 cases covering every filter, the `q` escaping rule, ordering, and defaults. `escapeLikePattern` is a private, un-exported helper inside the same pure function's module — not separately triangulated by name, but fully exercised by the `q` escaping test case (`'50%_off'` → `'%50\\%\\_off%'`).

## Deviations from Design (Phase 3b)

None — implementation matches `design.md`'s query-builder contract (`WhereClause`/`OrderClause`/`PropertyQuerySpec`, `PROPERTY_ALIAS`/`NEIGHBORHOOD_ALIAS`, `buildAdminPropertyQuery`'s equality/`q`/order/default rules) and `AdminPropertyFiltersDto`'s field list exactly. One implementation-level note: `AdminPropertyFiltersDto.limit`/`.offset` are declared without class-field default initializers (matching `CreatePropertyDto`'s existing convention of not assigning JS defaults on optional decorated fields); the `limit ?? 20` / `offset ?? 0` defaulting described by `design.md` and by task 3b.1's wording is applied inside `buildAdminPropertyQuery` (task 3b.3), which is the same division of responsibility `design.md`'s "Pure query builders returning a query spec" decision already assigns to the builder rather than the DTO.

## Work Unit Evidence (Phase 3b)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- src/properties/dto/admin-property-filters.dto src/properties/helpers/property-query.builder src/properties/services/properties.service` → **2 suites, 26 tests, all passed** (the `dto/admin-property-filters.dto` path matches no spec file — the DTO is purely declarative per the Deviations note above, so its `glob` produces zero additional suites; the other two paths cover the batch's actual test additions) |
| Runtime harness command/scenario and exact result | **N/A** — unit-only (mocked repository + chainable query-builder mock via `getRepositoryToken`, no DB/HTTP harness in this project per `openspec/config.yaml`'s `integration: false`/`e2e: false`), as forecast in `tasks.md`'s Suggested Work Units table for unit 3b. No schema change in this slice. |
| Rollback boundary | Revert commit `269bbf4`: drops `src/properties/dto/admin-property-filters.dto.ts`, `src/properties/helpers/property-query.builder.ts(+.spec)`, the `PropertiesService.findAll()` method and its imports, the `GET /` route on `AdminPropertiesController` and its imports, and the `admin-property-filters.dto` export line in `dto/index.ts`. Independent of Phase 3a's `create`/`update`/`findOne` routes and of Phase 4/5b work (not yet started). No migration/schema change in this slice, so no DB rollback is needed. |

## Verification Evidence (Task 3b.7)

| Command | Observed result |
|---|---|
| `npm test` | **PASS** — 21 test suites, 186 tests, 0 failed. Exit code 0. |
| `npm run lint` | **PASS** — `eslint "src/**/*.ts" --fix`, exit code 0, no reported errors. Auto-fixed two redundant `as any` type assertions in the new `findAll` service tests (flagged by `@typescript-eslint/no-unnecessary-type-assertion` — the object literals were already structurally compatible with `AdminPropertyFiltersDto` since every field is optional); no other changes. |
| `npx tsc -p tsconfig.build.json --noEmit` | **PASS** — no output, exit code 0. |
| `npm run build` | **PASS** — `nest build`, no output, exit code 0. |

## Files Changed (Phase 3b)

| File | Action |
|------|--------|
| `src/properties/dto/admin-property-filters.dto.ts` | Created |
| `src/properties/dto/index.ts` | Modified (additive export) |
| `src/properties/helpers/property-query.builder.ts` (+ `.spec.ts`) | Created |
| `src/properties/services/properties.service.ts` (+ extended `.spec.ts`) | Modified (adds `findAll()`) |
| `src/properties/controllers/admin-properties.controller.ts` | Modified (adds `GET /` route) |

## Review Budget (Phase 3b)

`git diff --stat feat/properties-3a-admin-crud...HEAD -- . ':!openspec'` for this batch's implementation commit (`269bbf4`) against the tip of `feat/properties-3a-admin-crud`: **456 insertions(+), 3 deletions(-)** across 7 files (459 total authored changed lines).

This is **above** `tasks.md`'s own forecast for this slice (~220-260 lines) and **above** the session's 400-line review budget, by 59 lines. No content was cut, compressed, or restyled to fit — per the apply skill's explicit instruction, the slice was implemented honestly and the overage is reported rather than iterated against. The main drivers: the 11-case `property-query.builder.spec.ts` (128 lines) and the 3-case `findAll` extension to `properties.service.spec.ts` (90 lines) both needed one assertion block per filter/behavior to triangulate the pure builder and the chainable-query-builder mock, and `admin-property-filters.dto.ts` (75 lines) carries 8 fields at 2-4 decorator lines each — the same per-field DTO-verbosity cost noted in Phase 3a. **Recommendation**: treat PR 3b as `size:exception` under the `ask-on-risk` delivery strategy, same as PR 3a — this slice is already the smallest cohesive unit for "admin filters and list" (splitting the filters DTO from the query builder it feeds, or the query builder from the `findAll()` that applies it, would leave an intermediate commit that doesn't compile or doesn't test its own behavior), and the orchestrator/user already accepted a 7-PR stacked chain with two individually-borderline slices (1, 3a) noted in `tasks.md` itself.

## Completed Tasks — Phase 4 (16/16)

- [x] 4.1 `AuditAction.PROPERTY_PUBLISHED` / `PROPERTY_ARCHIVED` / `PROPERTY_UNPUBLISHED` / `PROPERTY_DEAL_STATUS_CHANGED` / `PROPERTY_DELETED` added (additive)
- [x] 4.2 RED `src/properties/helpers/property-lifecycle.spec.ts` (`assertPublicationTransition`, `it.each` over all 9 `(from, action)` combinations)
- [x] 4.3 GREEN `src/properties/helpers/property-lifecycle.ts`
- [x] 4.4 RED extend `properties.service.spec.ts` (`publish`)
- [x] 4.5 GREEN `PropertiesService.publish()`
- [x] 4.6 RED extend `properties.service.spec.ts` (`archive`)
- [x] 4.7 GREEN `PropertiesService.archive()`
- [x] 4.8 RED extend `properties.service.spec.ts` (`unpublish`)
- [x] 4.9 GREEN `PropertiesService.unpublish()`
- [x] 4.10 RED extend `properties.service.spec.ts` (`updateDealStatus`)
- [x] 4.11 GREEN `PropertiesService.updateDealStatus()`
- [x] 4.12 RED extend `properties.service.spec.ts` (`remove`)
- [x] 4.13 GREEN `PropertiesService.remove()`
- [x] 4.14 RED extend `admin-properties.controller.spec.ts` (`DELETE /:id` method-level `@RoleProtected(admin)` metadata)
- [x] 4.15 GREEN `src/properties/dto/update-deal-status.dto.ts` + 5 new `AdminPropertiesController` routes (`publish`/`archive`/`unpublish`/`deal-status`/`DELETE`)
- [x] 4.16 Verify slice — all four gates green (see Verification Evidence below)

## TDD Cycle Evidence (Phase 4)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1 | N/A — purely structural (five additive enum members) | N/A | N/A | N/A | N/A | Triangulation skipped: single possible output, no branching/logic (matches the precedent set in 1.6/3a.4) | N/A |
| 4.2/4.3 | `src/properties/helpers/property-lifecycle.spec.ts` | Unit (pure) | N/A (new) | ✅ Written first — failed with `TS2307: Cannot find module './property-lifecycle'` (confirmed by running `npm test -- src/properties/helpers/property-lifecycle` before creating the implementation file) | ✅ 9/9 passed after implementing `assertPublicationTransition` | ✅ `it.each` over all 9 `(from, action)` combinations of the reconciled matrix: 6 valid transitions (each asserting the exact target status) + 3 invalid combinations (each asserting `BadRequestException` naming the current status) — this is the full scenario space of the spec's transition matrix, not a subset | ➖ None needed — single-pass lookup table, no branching to simplify |
| 4.4/4.5 | extend `properties.service.spec.ts` (`publish`) | Unit (mocked repositories) | ✅ 16/16 (create+update+findOne+findAll) re-run green before extending | ✅ Written first — failed with `TS2339: Property 'publish' does not exist on type 'PropertiesService'` (confirmed via `npm test -- src/properties/services/properties.service` before implementing) | ✅ 4/4 new tests passed after implementing `publish()` | ✅ 4 cases: first publish sets `firstPublishedAt` + `firstPublish: true`, re-publish from `archived` leaves `firstPublishedAt` unchanged + `firstPublish: false`, invalid transition (already `published`) rejected without save/audit, missing id → `NotFoundException` | ➖ None needed |
| 4.6/4.7 | extend `properties.service.spec.ts` (`archive`) | Unit (mocked repositories) | ✅ 20/20 re-run green before extending | ✅ Written first — failed with `TS2339: Property 'archive' does not exist on type 'PropertiesService'` | ✅ 2/2 new tests passed after implementing `archive()` | ✅ 2 cases: valid archive from `published` (saves + audits `{ code, from }`), invalid archive from already-`archived` (rejected, no save/audit) | ➖ None needed |
| 4.8/4.9 | extend `properties.service.spec.ts` (`unpublish`) | Unit (mocked repositories) | ✅ 22/22 re-run green before extending | ✅ Written first — failed with `TS2339: Property 'unpublish' does not exist on type 'PropertiesService'` | ✅ 2/2 new tests passed after implementing `unpublish()` | ✅ 2 cases: valid unpublish from `published` (`firstPublishedAt` unchanged, saves + audits), invalid unpublish from `draft` (rejected, no save/audit) | ➖ None needed |
| 4.10/4.11 | extend `properties.service.spec.ts` (`updateDealStatus`) | Unit (mocked repositories) | ✅ 24/24 re-run green before extending | ✅ Written first — failed with `TS2339: Property 'updateDealStatus' does not exist on type 'PropertiesService'` | ✅ 2/2 new tests passed after implementing `updateDealStatus()` | ✅ 2 cases: valid change (`available` → `reserved`, saves + audits `{ code, from, to }`), same-value rejection (`sold` → `sold`, no save/audit) | ➖ None needed |
| 4.12/4.13 | extend `properties.service.spec.ts` (`remove`) | Unit (mocked repositories) | ✅ 26/26 re-run green before extending | ✅ Written first — failed with `TS2339: Property 'remove' does not exist on type 'PropertiesService'` | ✅ 2/2 new tests passed after implementing `remove()` | ✅ 2 cases: never-published property (`firstPublishedAt = null`) deletes via `propertyRepository.delete(id)` + audits `{ code, title }`; ever-published property (`firstPublishedAt` set) rejected without deleting or auditing | ➖ None needed |
| 4.14/4.15 | `admin-properties.controller.spec.ts` (extend) | Unit (class/method metadata) | ✅ 1/1 (class-level roles test) re-run green before extending | ✅ Written first — failed with `TS2339: Property 'remove' does not exist on type 'AdminPropertiesController'` (confirmed via `npm test -- src/properties/controllers/admin-properties.controller` before implementing) | ✅ 1/1 new test passed after adding `@RoleProtected(ValidRoles.admin)` on the `remove` handler alongside the other 4 new routes | ➖ Single scenario — method-level role metadata has one expected value (`[admin]`), same precedent as the class-level test; the guard-boundary resolution itself (`UserRoleGuard`'s handler-overrides-class lookup) is existing, already-tested infrastructure | ➖ None needed |

### Test Summary (Phase 4)
- **Total tests written this batch**: 22 — 9 lifecycle (`property-lifecycle.spec.ts`, new file), 12 service (`publish`×4, `archive`×2, `unpublish`×2, `updateDealStatus`×2, `remove`×2, extending `properties.service.spec.ts` from 15→27 tests), 1 controller (extending `admin-properties.controller.spec.ts` from 1→2 tests)
- **Total tests passing**: 22/22 new this batch (confirmed by executed per-file counts: lifecycle 9/9, service 27/27 total, controller 2/2 total), **208/208 (full suite after this batch, up from 186 pre-batch)**
- **Layers used**: Unit only — no integration/e2e harness exists in this project (`openspec/config.yaml`: `integration: false`, `e2e: false`), matching the Suggested Work Units table's "N/A — unit-only" note for unit 4. `property-lifecycle.spec.ts` is a pure-function test (no mocks); the service tests use the same hand-mocked-repository pattern as `create`/`update`/`findOne`/`findAll`; the controller test uses `Reflect.getMetadata`, matching the existing class-level pattern.
- **Approval tests** (refactoring): None — no pre-existing behavior was changed; `create`/`update`/`findOne`/`findAll` and their 26 existing tests, plus the pre-existing controller class-metadata test, all re-run unchanged and green throughout.
- **Pure functions created**: 1 (`assertPublicationTransition`), triangulated with all 9 cases in the spec's transition matrix (6 valid + 3 invalid) — the full scenario space, not a sample.

## Deviations from Design (Phase 4)

None — implementation matches `design.md`'s transition matrix table (Decision: Publication transition matrix), the deal-status rule (Decision: Deal status independent of publication), the hard-delete eligibility rule (Decision: Hard delete eligibility = `firstPublishedAt IS NULL`), and the `DELETE` guard decision (Decision: Hard delete guard uses method-level `@RoleProtected(ValidRoles.admin)`) exactly. One implementation-level note: `remove()` uses `propertyRepository.delete(id)` (criteria-based) rather than `repository.remove(entity)` (entity-based) — matching the existing codebase convention for hard deletes (`revokedTokenRepository.delete(...)`, `backupCodeRepository.delete(...)`, `auditLogRepository.delete(...)` in `retention.service.ts`/`mfa.service.ts`/`auth.service.ts`); `design.md` does not specify which TypeORM method, only the business rule and response shape (`204 No Content`), both of which are satisfied.

## Work Unit Evidence (Phase 4)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- src/properties/helpers/property-lifecycle src/properties/services/properties.service src/properties/controllers/admin-properties.controller` → **3 suites, 38 tests, all passed** (9 lifecycle + 27 service + 2 controller) |
| Runtime harness command/scenario and exact result | **N/A** — unit-only (mocked repositories via `getRepositoryToken`, no DB/HTTP harness in this project per `openspec/config.yaml`'s `integration: false`/`e2e: false`), as forecast in `tasks.md`'s Suggested Work Units table for unit 4. No schema/migration change in this slice. |
| Rollback boundary | Revert commit `5f3c5d4`: drops `src/properties/helpers/property-lifecycle.ts(+.spec)`, `src/properties/dto/update-deal-status.dto.ts`, the `publish`/`archive`/`unpublish`/`updateDealStatus`/`remove` methods and their imports in `properties.service.ts`, the 5 new routes on `AdminPropertiesController` and their imports, the `update-deal-status.dto` export line in `dto/index.ts`, and the 5 additive `PROPERTY_*` audit actions. Additive to Phase 3a/3b's `create`/`update`/`findOne`/`findAll` routes — no other module depends on this slice's new methods yet (Phase 5a/5b are unstarted). No migration/schema change in this slice, so no DB rollback is needed. |

## Verification Evidence (Task 4.16)

| Command | Observed result |
|---|---|
| `npm test` | **PASS** — 22 test suites, 208 tests, 0 failed. Exit code 0. |
| `npm run lint` | **PASS** — `eslint "src/**/*.ts" --fix`, exit code 0, no reported errors. Auto-reformatted `property-lifecycle.spec.ts`'s `it.each` array literals (multi-line object formatting via Prettier); re-ran `npm test` after the fix — still 22 suites, 208 tests, all green. |
| `npx tsc -p tsconfig.build.json --noEmit` | **PASS** — no output, exit code 0. |
| `npm run build` | **PASS** — `nest build`, no output, exit code 0. |

## Files Changed (Phase 4)

| File | Action |
|------|--------|
| `src/audit/enums/audit-action.enum.ts` | Modified (additive: `PROPERTY_PUBLISHED`, `PROPERTY_ARCHIVED`, `PROPERTY_UNPUBLISHED`, `PROPERTY_DEAL_STATUS_CHANGED`, `PROPERTY_DELETED`) |
| `src/properties/helpers/property-lifecycle.ts` (+ `.spec.ts`) | Created |
| `src/properties/dto/update-deal-status.dto.ts` | Created |
| `src/properties/dto/index.ts` | Modified (additive export) |
| `src/properties/services/properties.service.ts` (+ extended `.spec.ts`) | Modified (adds `publish`, `archive`, `unpublish`, `updateDealStatus`, `remove`) |
| `src/properties/controllers/admin-properties.controller.ts` (+ extended `.spec.ts`) | Modified (adds `PATCH :id/publish`, `PATCH :id/archive`, `PATCH :id/unpublish`, `PATCH :id/deal-status`, `DELETE :id`) |

## Review Budget (Phase 4)

`git diff --stat feat/properties-3b-admin-list...HEAD -- . ':!openspec'` for this batch's implementation commit (`5f3c5d4`) against the tip of `feat/properties-3b-admin-list`: **663 insertions(+), 4 deletions(-)** across 9 files (667 total authored changed lines).

This is **above** `tasks.md`'s own forecast for this slice (~380-420 lines) and **above** the session's 400-line review budget, by 247–287 lines relative to the forecast. No content was cut, compressed, or restyled to fit — per the apply skill's explicit instruction, the slice was implemented honestly and the overage is reported rather than iterated against. The main drivers: `admin-properties.controller.ts` (123 lines added) carries 5 new routes each with 5-8 lines of Swagger `@Api*` decorators (matching the existing per-route documentation density from Phase 3a/3b, not incidental bloat), and full TDD coverage across 5 new service methods added 275 lines to `properties.service.spec.ts` (12 new test cases, each needing its own fixture + assertion block to triangulate a distinct business rule: first-publish-vs-republish, 3 invalid-transition rejections, same-value rejection, ever-published rejection) plus 68 lines for the lifecycle helper's 9-case `it.each` matrix. **Recommendation**: treat PR 4 as `size:exception` under the `ask-on-risk` delivery strategy, consistent with PR 3a (821 lines) and PR 3b (459 lines) — this slice is already the smallest cohesive unit for "lifecycle + deal status + hard delete" per `tasks.md`'s own Suggested Work Units table (splitting the 3 lifecycle verbs from deal-status/delete would leave an intermediate commit exercising only part of the reconciled transition matrix), and the orchestrator/user already accepted a 7-PR stacked chain for this change with two other slices already carrying the same recommendation.

## Completed Tasks — Phase 5a (7/7)

- [x] 5a.1 RED `src/properties/dto/validators/price-filter.validators.spec.ts`
- [x] 5a.2 GREEN `src/properties/dto/validators/price-filter.validators.ts` (`RequiresCurrency`, `IsGreaterThanOrEqualTo`)
- [x] 5a.3 RED `src/properties/dto/public-property-filters.dto.spec.ts`
- [x] 5a.4 GREEN `src/properties/dto/public-property-filters.dto.ts` (+ `dto/index.ts` export)
- [x] 5a.5 RED extend `src/properties/helpers/property-query.builder.spec.ts` (public half, `buildPublicPropertyQuery`)
- [x] 5a.6 GREEN `buildPublicPropertyQuery` in `src/properties/helpers/property-query.builder.ts` (same file as `buildAdminPropertyQuery`)
- [x] 5a.7 Verify slice — all four gates green (see Verification Evidence below)

## TDD Cycle Evidence (Phase 5a)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5a.1/5a.2 | `src/properties/dto/validators/price-filter.validators.spec.ts` | Unit (custom class-validator decorators, no mocks) | N/A (new) | ✅ Written first — failed with `TS2307: Cannot find module './price-filter.validators'` (confirmed via `npm test -- src/properties/dto/validators/price-filter.validators` before creating the implementation file) | ✅ 9/9 passed after implementing `RequiresCurrency`/`IsGreaterThanOrEqualTo` | ✅ 9 cases: `RequiresCurrency` default predicate (fails without currency, passes with currency, passes when own value undefined), custom predicate for `sort` (fails only for `price_asc`, passes for `newest`, passes with currency present), `IsGreaterThanOrEqualTo` (less-than fails, equal passes, greater passes, either-undefined passes) | ➖ None needed — first use of `registerDecorator` in this codebase (no existing custom-decorator pattern to follow); kept both decorators generic (`isPriceRelated` predicate, `relatedPropertyName` string) rather than hardcoding `priceMin`/`priceMax`/`sort`, since `design.md` reuses `RequiresCurrency` across three different fields with different "is price-related" rules |
| 5a.3/5a.4 | `src/properties/dto/public-property-filters.dto.spec.ts` | Unit (DTO validation + transformation) | N/A (new) | ✅ Written first — failed with `TS2307: Cannot find module './public-property-filters.dto'` (confirmed via `npm test -- src/properties/dto/public-property-filters.dto` before creating the implementation file) | ✅ 25/25 passed after implementing `PublicPropertyFiltersDto` | ✅ 25 cases: empty filter set, invalid `operation`/`type`/`sort` enum values, non-numeric `priceMin` with currency set, `priceMin` without currency, `sort=price_asc` without/with currency, boolean-toggle coercion for `hasGarage`/`creditEligible`/`petsAllowed` (`'true'`/`'false'` × 3 fields = 6 cases) plus a rejected non-literal value, numeric coercion for 7 fields (`minRooms`, `minBedrooms`, `minBathrooms`, `minCoveredArea`, `minTotalArea`, `limit`, `offset`), `priceMin`/`priceMax` coercion with currency, no-currency-required baseline, and `featured` rejected via the full `ValidationPipe` (whitelist + forbidNonWhitelisted) — proving the public `featured` filter is genuinely absent per the reconciliation note | ➖ None needed — declarative decorator list plus the reused `toQueryBoolean` transform, no branching logic to simplify |
| 5a.5/5a.6 | extend `src/properties/helpers/property-query.builder.spec.ts` (`buildPublicPropertyQuery`) | Unit (pure) | ✅ 11/11 (`buildAdminPropertyQuery`) re-run green before extending | ✅ Written first — failed with `TS2724: '"./property-query.builder"' has no exported member named 'buildPublicPropertyQuery'` (confirmed via `npm test -- src/properties/helpers/property-query.builder` before implementing) | ✅ 27/27 new tests passed after implementing `buildPublicPropertyQuery` | ✅ 27 cases: forced `publicationStatus = published` always first (with and without other filters), one case per equality/`>=` filter (`operation`, `type`, `neighborhood.slug`, `minRooms`/`minBedrooms`/`minBathrooms`/`minCoveredArea`/`minTotalArea` via `it.each`, `hasGarage`/`creditEligible`/`petsAllowed` via `it.each`), omitted-filter-produces-no-clause, currency equality scoping with and without a price filter, `priceMin`/`priceMax` `>=`/`<=` clauses, all-filters-combined unique-param-name check, 4 `BadRequestException` cases (`priceMin` alone, `priceMax` alone, `sort=price_asc`/`price_desc` alone, `priceMax < priceMin`), no-throw for `sort=newest` without currency, 3 ordering cases (`newest` default, `price_asc`, `price_desc`), and default/explicit `take`/`skip` — the full scenario space from `tasks.md`'s 5a.5 description, not a subset | ➖ None needed — single-pass declarative clause list mirroring `buildAdminPropertyQuery`'s existing shape, no branching to simplify |

### Test Summary (Phase 5a)
- **Total tests written this batch**: 61 (9 validators, 25 DTO, 27 query-builder)
- **Total tests passing**: 61/61 (batch), **269/269 (full suite after this batch, up from 208)**
- **Layers used**: Unit only — no integration/e2e harness exists in this project (`openspec/config.yaml`: `integration: false`, `e2e: false`), matching the Suggested Work Units table's "N/A — unit-only" note for unit 5a. No route is wired yet (public controller/service are Phase 5b), so there is no HTTP-layer test in this slice.
- **Approval tests** (refactoring): None — no pre-existing behavior was changed. `buildAdminPropertyQuery` and its 11 existing tests re-run unchanged and green throughout; `properties.dto/index.ts` was extended additively (two new export lines).
- **Pure functions created**: 3 (`RequiresCurrency`, `IsGreaterThanOrEqualTo` as decorator factories; `buildPublicPropertyQuery` as the query-spec builder), all triangulated with their full scenario space per the TDD Cycle Evidence table above.

## Deviations from Design (Phase 5a)

None — implementation matches `design.md`'s DTO contract (`PublicPropertyFiltersDto` field list, `@RequiresCurrency`/`@IsGreaterThanOrEqualTo` placement, no `featured` field), the currency-rule decision (DTO-level `@RequiresCurrency`, re-asserted defensively in `buildPublicPropertyQuery`), and `buildPublicPropertyQuery`'s 7 numbered rules (forced `published` first, currency/range 400s, equality clauses, `>=` clauses, unique param names, ordering, `take`/`skip` defaults) exactly. One implementation-level note not specified by `design.md`: `RequiresCurrency`'s default predicate is `(value) => value !== undefined` (used for `priceMin`/`priceMax`) and a custom predicate `(value) => value === 'price_asc' || value === 'price_desc'` is passed explicitly for `sort` — `design.md`'s prose describes this behavior ("fails when the value is price-related... only fails for price sorts") without specifying the decorator's exact signature, so the predicate-parameter design was chosen to keep one implementation shared by both use sites rather than two near-duplicate decorators.

## Work Unit Evidence (Phase 5a)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- src/properties/dto/public-property-filters.dto src/properties/dto/validators/price-filter.validators src/properties/helpers/property-query.builder` → **3 suites, 61 tests, all passed** |
| Runtime harness command/scenario and exact result | **N/A** — unit-only (pure functions and DTO validation, no repository/DB/HTTP harness in this project per `openspec/config.yaml`'s `integration: false`/`e2e: false`), as forecast in `tasks.md`'s Suggested Work Units table for unit 5a. No schema/migration change in this slice, and no route is wired yet (purely additive helpers/DTO, per the Rollback boundary note in `tasks.md`). |
| Rollback boundary | Revert commit `d481474`: drops `src/properties/dto/public-property-filters.dto.ts(+.spec)`, `src/properties/dto/validators/price-filter.validators.ts(+.spec)`, and the two additive export lines in `src/properties/dto/index.ts`; also reverts the `buildPublicPropertyQuery` function, its supporting constants (`PUBLIC_DEFAULT_LIMIT`, `PUBLIC_DEFAULT_OFFSET`, `PRICE_SORTS`, `publicOrderBy`), and its new imports in `src/properties/helpers/property-query.builder.ts` back to the Phase 3b state (admin-only). `buildAdminPropertyQuery` and its 11 tests are untouched. No route/controller/service depends on this slice's exports yet (Phase 5b builds on top in the next batch). |

## Verification Evidence (Task 5a.7)

| Command | Observed result |
|---|---|
| `npm test` | **PASS** — 24 test suites, 269 tests, 0 failed. Exit code 0. |
| `npm run lint` | **PASS** — `eslint "src/**/*.ts" --fix`, exit code 0, no reported errors, no output. Prettier auto-reformatted the three new/extended spec files' multi-line call formatting (line-wrapping only); re-ran `npm test` after the fix — still 24 suites, 269 tests, all green. |
| `npx tsc -p tsconfig.build.json --noEmit` | **PASS** — no output, exit code 0. |
| `npm run build` | **PASS** — `nest build`, no output, exit code 0. |

## Files Changed (Phase 5a)

| File | Action |
|------|--------|
| `src/properties/dto/validators/price-filter.validators.ts` (+ `.spec.ts`) | Created |
| `src/properties/dto/public-property-filters.dto.ts` (+ `.spec.ts`) | Created |
| `src/properties/dto/index.ts` | Modified (additive: `public-property-filters.dto`, `validators/price-filter.validators` exports) |
| `src/properties/helpers/property-query.builder.ts` (+ extended `.spec.ts`) | Modified (adds `buildPublicPropertyQuery`, `publicOrderBy`, `PUBLIC_DEFAULT_LIMIT`/`PUBLIC_DEFAULT_OFFSET`/`PRICE_SORTS`) |

## Review Budget (Phase 5a)

`git diff --stat feat/properties-4-lifecycle...HEAD -- . ':!openspec'` for this batch's implementation commit (`d481474`) against the tip of `feat/properties-4-lifecycle`: **962 insertions(+), 0 deletions(-)** across 7 files (962 total authored changed lines).

This is **above** `tasks.md`'s own forecast for this slice (~380-420 lines) and **above** the session's 400-line review budget, by 542–582 lines relative to the forecast — the largest overage of any slice so far in this change. No content was cut, compressed, or restyled to fit — per the apply skill's explicit instruction, the slice was implemented honestly and the overage is reported rather than iterated against. The main drivers: `public-property-filters.dto.ts` (172 lines) carries 17 fields, several needing 5-6 decorator/comment lines each (the custom `@RequiresCurrency`/`@IsGreaterThanOrEqualTo` decorators plus `@Type`/`@Transform` for query-string coercion, on top of the usual `@ApiPropertyOptional`/`@IsOptional`/validator lines); `property-query.builder.ts`'s public half (177 lines added) has 13 independently-testable filter branches versus the admin builder's 5; and full TDD coverage across 3 new/extended production surfaces added 535 lines of test code (143 DTO + 140 validators + 252 query-builder extension), each filter/rule needing its own assertion to triangulate per the exhaustive scenario list in task 5a.5's own wording. **Recommendation**: treat PR 5a as `size:exception` under the `ask-on-risk` delivery strategy, consistent with PR 3a (821 lines), PR 3b (459 lines), and PR 4 (667 lines) — this slice is already the smallest cohesive unit for "public filters DTO + query builder" per `tasks.md`'s own Suggested Work Units table (the DTO and the builder that consumes it cannot be split further without leaving an intermediate commit where one doesn't compile against the other), and the orchestrator/user already accepted a 7-PR stacked chain with three other slices already carrying the same recommendation.

## Completed Tasks — Phase 5b (7/7)

- [x] 5b.1 RED `src/properties/helpers/public-property.mapper.spec.ts`
- [x] 5b.2 GREEN `src/properties/helpers/public-property.mapper.ts` (`toPublicProperty`, `PublicPropertyResponse`)
- [x] 5b.3 RED `src/properties/services/public-properties.service.spec.ts`
- [x] 5b.4 GREEN `src/properties/services/public-properties.service.ts` (`PublicPropertiesService.findAll`, `.findBySlug`)
- [x] 5b.5 RED `src/properties/controllers/public-properties.controller.spec.ts`
- [x] 5b.6 GREEN `src/properties/controllers/public-properties.controller.ts` (+ wired into `src/properties/properties.module.ts`)
- [x] 5b.7 Verify slice — all four gates green, plus an authorized end-to-end smoke test (see Verification Evidence and Smoke Test Evidence below)

## TDD Cycle Evidence (Phase 5b)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5b.1/5b.2 | `src/properties/helpers/public-property.mapper.spec.ts` | Unit (pure) | N/A (new) | ✅ Written first — failed with `TS2307: Cannot find module './public-property.mapper'` (confirmed via `npm test -- src/properties/helpers/public-property.mapper` before creating the implementation file) | ✅ 7/7 passed after implementing `toPublicProperty`/`PublicPropertyResponse` | ✅ 7 cases: address hidden when `showExactAddress=false`, address shown when `true` (the two-value triangulation for the privacy flag), internal fields (`publicationStatus`/`showExactAddress`/`createdAt`/`updatedAt`/`neighborhood.id`) absent, `services` grouping of the 5 booleans, numeric fields pass through as plain numbers, `publishedAt` mirrors a set `firstPublishedAt`, `publishedAt` is `null` when never published | ➖ None needed — single-pass explicit-whitelist object literal, no branching to simplify |
| 5b.3/5b.4 | `src/properties/services/public-properties.service.spec.ts` | Unit (mocked repository + chainable query-builder mock, same shape as `PropertiesService.findAll`'s spec) | N/A (new) | ✅ Written first — failed with `TS2307: Cannot find module './public-properties.service'` (confirmed via `npm test -- src/properties/services/public-properties.service` before creating the implementation file) | ✅ 5/5 passed after implementing `PublicPropertiesService.findAll`/`.findBySlug` | ✅ 5 cases: `findAll` applies the forced-`published` clause + every spec clause/order/take/skip and returns `{ items: rows.map(toPublicProperty), total }`, `findAll` returns `{ items: [], total: 0 }` on no matches, `findBySlug` returns the mapped property scoped by `{ slug, publicationStatus: 'published' }`, `findBySlug` throws `NotFoundException` for a draft/archived slug, `findBySlug` throws `NotFoundException` for a nonexistent slug (the last two share one `findOne` mock behavior — `null` — proving the query-level restriction makes both cases indistinguishable to the caller, per `specs/property-public-catalog/spec.md`'s Public Property Detail by Slug requirement) | ➖ None needed — `findAll` mirrors `PropertiesService.findAll`'s already-established shape, `findBySlug` is a direct `findOne` + map + 404 |
| 5b.5/5b.6 | `src/properties/controllers/public-properties.controller.spec.ts` | Unit (class metadata) | N/A (new) | ✅ Written first — failed with `TS2307: Cannot find module './public-properties.controller'` | ✅ 1/1 passed after implementing the controller with no `@Auth`/guard decorator anywhere | ➖ Single scenario — class carries no role/guard metadata at all, matching `NeighborhoodsController`'s public-`GET`-route precedent; the guard absence itself is proven by `Reflect.getMetadata` returning `undefined` for both `META_ROLES` and `__guards__` | ➖ None needed |

### Test Summary (Phase 5b)
- **Total tests written this batch**: 13 (7 mapper, 5 service, 1 controller)
- **Total tests passing**: 13/13 (batch), **282/282 (full suite after this batch, up from 269)**
- **Layers used**: Unit only — no integration/e2e harness exists in this project (`openspec/config.yaml`: `integration: false`, `e2e: false`), matching the Suggested Work Units table's "N/A — unit-only" note for unit 5b. This slice additionally received an authorized end-to-end smoke test against the throwaway `siricman-migtest` Postgres container (real HTTP + real DB, no mocks) — see Smoke Test Evidence below, which is a stronger proof of the full request/response cycle than any unit test could provide.
- **Approval tests** (refactoring): None — no pre-existing behavior was changed. `buildPublicPropertyQuery` and its 27 existing tests, and `AdminPropertiesController`'s 2 existing metadata tests, re-run unchanged and green throughout; `src/properties/properties.module.ts` was modified additively (new controller + provider registered alongside the existing admin ones, nothing removed).
- **Pure functions created**: 1 (`toPublicProperty`), triangulated with 7 cases covering every mapping rule from `design.md`'s `PublicPropertyResponse` contract (address privacy both flag values, internal-field omission, services grouping, numeric pass-through, `publishedAt` both defined and `null`).

## Deviations from Design (Phase 5b)

None — implementation matches `design.md`'s `PublicPropertyResponse` field list and mapping rules exactly (address privacy, omitted internal fields, `services` grouping, `publishedAt` = `firstPublishedAt`), `PublicPropertiesService.findAll`/`.findBySlug`'s data-flow description (spec applied to a joined query builder; 404 scoped by the `where` clause itself, not a post-fetch status check), and the public controller's route/guard shape (`@Controller('properties')`, no guards, `GET /` + `GET /:slug`) exactly. One implementation-level note not specified by name in `design.md`: `findBySlug` resolves both "slug doesn't exist" and "slug resolves to a draft/archived property" through the same `propertyRepository.findOne({ where: { slug, publicationStatus: 'published' } })` call rather than a two-step fetch-then-check — this was chosen because it is the same query-level-restriction pattern `buildPublicPropertyQuery` already uses for the listing endpoint (the spec's "restricted by the query itself" principle applied consistently to the detail endpoint too), and it means a caller cannot distinguish "never existed" from "exists but not published" from response content alone.

## Work Unit Evidence (Phase 5b)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- src/properties/helpers/public-property.mapper src/properties/services/public-properties.service src/properties/controllers/public-properties.controller` → **3 suites, 13 tests, all passed** |
| Runtime harness command/scenario and exact result | **Executed** — authorized end-to-end smoke test against `siricman-migtest` (127.0.0.1:55432): real Postgres rows, a real running Nest app, real HTTP requests. See Smoke Test Evidence below for the full scenario list and observed results, all matching expectations. |
| Rollback boundary | Revert commit `a7f509f`: drops `src/properties/helpers/public-property.mapper.ts(+.spec)`, `src/properties/services/public-properties.service.ts(+.spec)`, `src/properties/controllers/public-properties.controller.ts(+.spec)`, and reverts the additive `PublicPropertiesController`/`PublicPropertiesService` registration in `properties.module.ts` back to the Phase 4 admin-only state. This is the only slice that exposes the unauthenticated `/api/properties` surface, so reverting it alone removes public read access without touching any admin CRUD/lifecycle route from Phases 3a/3b/4. No migration/schema change in this slice, so no DB rollback is needed. |

## Smoke Test Evidence (Task 5b.7)

Executed against `siricman-migtest` (127.0.0.1:55432, db `migtest`, all migrations already applied, 48 neighborhoods seeded). `properties` table was empty at the start of this batch (confirmed via `SELECT count(*) FROM properties` → `0`).

**Fixtures inserted via direct SQL** (not through the app, since no authenticated admin session was set up for this smoke test — the public endpoints only need rows to exist):

| Code | Slug | Status | Currency | Price | showExactAddress | Neighborhood |
|---|---|---|---|---|---|---|
| SP-101 | `depto-en-palermo-sp-101` | `published` | USD | 150000 | `false` | Palermo |
| SP-102 | `casa-en-belgrano-sp-102` | `published` | ARS | 80000000 | `true` | Belgrano |
| SP-103 | `ph-en-caballito-sp-103` | `draft` | USD | 900 | `false` | Caballito |

App started via `node dist/main.js` (built by `npm run build` earlier in this batch) with inline env vars: `DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=postgres DB_PASSWORD=migtest DB_NAME=migtest RUN_SEED=false JWT_SECRET=<32+ char dummy> MFA_ENCRYPTION_KEY=<64-char hex dummy> SWAGGER_ENABLED=false PORT=3055`. No `.env` file created or read. App started cleanly (`Nest application successfully started`), mapping `PublicPropertiesController {/api/properties}` with `GET /api/properties` and `GET /api/properties/:slug`.

| Request | Expected | Observed |
|---|---|---|
| `GET /api/properties` | 200, only the 2 published properties, draft excluded, address hidden for SP-101 / shown for SP-102 | **PASS** — `200`, `total: 2`, items = SP-102 (`address: "Av. Cabildo 2500"`) and SP-101 (`address: null`); SP-103 (draft) absent |
| `GET /api/properties?currency=USD&sort=price_asc` | 200, only USD properties, ascending price | **PASS** — `200`, `total: 1`, only SP-101 (the only published USD property) |
| `GET /api/properties?sort=price_asc` (no currency) | 400 | **PASS** — `400`, `{"message":["sort requires currency to be set"],"error":"Bad Request","statusCode":400}` |
| `GET /api/properties/depto-en-palermo-sp-101` (published, `showExactAddress=false`) | 200, `address: null` | **PASS** — `200`, `address: null`, `neighborhood` still present (`Palermo`) |
| `GET /api/properties/casa-en-belgrano-sp-102` (published, `showExactAddress=true`) | 200, exact `address` present | **PASS** — `200`, `address: "Av. Cabildo 2500"` |
| `GET /api/properties/ph-en-caballito-sp-103` (draft) | 404 | **PASS** — `404`, `{"message":"Property not found","error":"Not Found","statusCode":404}` |
| `GET /api/neighborhoods` | 200, existing 48-barrio catalog | **PASS** — `200`, list starting with Agronomía/Almagro/Balvanera, unaffected by this batch |

App stopped afterward (`taskkill` on the `node dist/main.js` process listening on port 3055; confirmed down via a subsequent `curl` timing out with no response). The 3 inserted fixture rows were deleted (`DELETE FROM properties WHERE code IN ('SP-101','SP-102','SP-103')`); `SELECT count(*) FROM properties` confirmed `0` afterward, restoring the container to its pre-smoke-test state. No other container or database was touched. `property_code_seq` was not touched either (fixtures used explicit `code` values, not `nextval()`).

## Verification Evidence (Task 5b.7)

| Command | Observed result |
|---|---|
| `npm test` | **PASS** — 27 test suites, 282 tests, 0 failed. Exit code 0. |
| `npm run lint` | **PASS** — `eslint "src/**/*.ts" --fix`, exit code 0, no reported errors. Prettier auto-reformatted line-wrapping in the new controller and the two new spec files (multi-line `@ApiOperation`/import formatting); re-ran `npm test` after the fix — still 27 suites, 282 tests, all green. |
| `npx tsc -p tsconfig.build.json --noEmit` | **PASS** — no output, exit code 0. |
| `npm run build` | **PASS** — `nest build`, no output, exit code 0. |

## Files Changed (Phase 5b)

| File | Action |
|------|--------|
| `src/properties/helpers/public-property.mapper.ts` (+ `.spec.ts`) | Created |
| `src/properties/services/public-properties.service.ts` (+ `.spec.ts`) | Created |
| `src/properties/controllers/public-properties.controller.ts` (+ `.spec.ts`) | Created |
| `src/properties/properties.module.ts` | Modified (additive: registers `PublicPropertiesController` + `PublicPropertiesService` alongside the existing admin controller/service) |

## Review Budget (Phase 5b)

`git diff --stat feat/properties-5a-public-filters...HEAD -- . ':!openspec'` for this batch's implementation commit (`a7f509f`) against the tip of `feat/properties-5a-public-filters`: **574 insertions(+), 5 deletions(-)** across 7 files (579 total authored changed lines).

This is **above** `tasks.md`'s own forecast for this slice (~280-330 lines) and **above** the session's 400-line review budget, by 249–299 lines relative to the forecast. No content was cut, compressed, or restyled to fit — per the apply skill's explicit instruction, the slice was implemented honestly and the overage is reported rather than iterated against. The main drivers: `public-properties.service.spec.ts` (190 lines) needed a full chainable-query-builder fixture plus a `propertyFixture()` helper mirroring every `Property` field (mapper and service specs each define their own fixture rather than sharing one, since they live in different directories and the codebase has no shared test-fixture module yet), and `public-property.mapper.spec.ts` (147 lines) needed one assertion block per mapping rule to triangulate the whitelist projection (7 cases, each verifying a distinct field-level guarantee from `design.md`'s contract). **Recommendation**: treat PR 5b as `size:exception` under the `ask-on-risk` delivery strategy, consistent with PR 3a (821 lines), PR 3b (459 lines), PR 4 (667 lines), and PR 5a (962 lines) — this is the smallest of the five oversized slices, already the smallest cohesive unit for "public mapper + service + controller" per `tasks.md`'s own Suggested Work Units table (the mapper, the service that calls it, and the controller that calls the service form one coherent, dependency-ordered unit that cannot be split without an intermediate commit exposing an incomplete public API), and it is the final slice of a 7-PR stacked chain the orchestrator/user already accepted.

## Open Items Carried Forward

- Task 1.5 (manual barrio-spelling review) — already signed off in a prior batch (2026-09-27); not re-verified this batch.
- ~~`neighborhoodId` changes via `PATCH` were silently ignored~~ — **RESOLVED** in the follow-up batch above (Phase 3a).
- PR 3a's authored line count exceeds both `tasks.md`'s forecast and the 400-line review budget — flagged for a `size:exception` decision before/at review time; not re-splittable without breaking cohesion. Merge status as of this batch: unknown to the executor (session instructions state PR 3a is "already merged to main" as of Phase 4's start — see Scope of this batch above).
- PR 3b's authored line count (459) also exceeds both `tasks.md`'s forecast (~220-260) and the 400-line review budget — flagged for the same `size:exception` decision; merge status as of this batch: unknown to the executor.
- PR 4's authored line count (667) also exceeds both `tasks.md`'s forecast (~380-420) and the 400-line review budget — flagged for the same `size:exception` decision; see Phase 4's Review Budget above.
- PR 5a's authored line count (962) also exceeds both `tasks.md`'s forecast (~380-420) and the 400-line review budget, by the widest margin of any slice — flagged for the same `size:exception` decision; see Review Budget above.
- PR 5b's authored line count (579) also exceeds both `tasks.md`'s forecast (~280-330) and the 400-line review budget — flagged for the same `size:exception` decision; see Review Budget above. This is the last of the 7 planned slices.
- The public `featured` filter, throttling of public endpoints, and the `dealStatus`/`operation` coupling remain open product decisions (see `tasks.md`'s Open Questions Carried Forward) — not resolved by this change, unchanged by this batch.

## Next Step

All 7 phases (1, 2, 3a, 3b, 4, 5a, 5b — every task in `tasks.md` except the
open product-decision items under "Open Questions Carried Forward", which
are explicitly out of scope for this change) are now complete and verified.
`tasks.md` has every phase task marked `[x]`. Full suite: 27 test suites,
282 tests, all green (`npm test`, `npm run lint`, `npx tsc --noEmit`,
`npm run build` all pass); an authorized end-to-end smoke test against a
real Postgres instance additionally confirmed the public catalog's HTTP
behavior end to end. This `sdd-apply` work is done for the
`properties-domain` change — ready for `sdd-verify` and/or `sdd-archive`.
All 5 oversized slices (PR 3a: 821, PR 3b: 459, PR 4: 667, PR 5a: 962, PR
5b: 579 authored lines) still carry an unresolved `size:exception`
recommendation awaiting the maintainer's decision under `ask-on-risk`; none
of that is blocking for apply completion, since the chain strategy
(`stacked-to-main`) and the exception recommendation were already the
accepted plan for this change.
