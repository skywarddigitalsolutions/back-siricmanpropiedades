# Apply Progress: Properties Domain (back)

## Scope of this batch

Phase 3b only (PR slice 3b: Admin Filters and List), tasks 3b.1–3b.7.
Phase 1 (Neighborhoods), Phase 2 (Property Schema Foundation), and Phase 3a
(Admin Create/Update/Get) were completed in prior batches (see below); Phase
3a's branch/PR (`feat/properties-3a-admin-crud`, PR #6) was open but not
yet merged when this batch started — this batch stacks on top of it per the
`stacked-to-main` chain strategy, on branch `feat/properties-3b-admin-list`.
Phases 4–5b are NOT started.

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

## Open Items Carried Forward

- Task 1.5 (manual barrio-spelling review) — already signed off in a prior batch (2026-09-27); not re-verified this batch.
- ~~`neighborhoodId` changes via `PATCH` were silently ignored~~ — **RESOLVED** in the follow-up batch above (Phase 3a).
- PR 3a's authored line count exceeds both `tasks.md`'s forecast and the 400-line review budget — flagged for a `size:exception` decision before/at review time; not re-splittable without breaking cohesion. PR 3a is still open (not merged) as of this batch.
- PR 3b's authored line count (459) also exceeds both `tasks.md`'s forecast (~220-260) and the 400-line review budget — flagged for the same `size:exception` decision; see Review Budget above.
- Phase 4 onward — NOT started.

## Next Step

Phase 3b (tasks 3b.1–3b.7) is complete and verified (`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` all green: 21 suites, 186 tests). Ready for the next `sdd-apply` batch to start Phase 4 (Lifecycle, Deal Status, Hard Delete) once PR 3a and PR 3b are reviewed/merged (or explicitly continued) per the `stacked-to-main` chain strategy. Per this batch's explicit scope (Phase 3b ONLY), Phase 4 was NOT started. Both PR 3a and PR 3b carry a recommended `size:exception` (821 and 459 authored lines respectively) awaiting the maintainer's decision.
