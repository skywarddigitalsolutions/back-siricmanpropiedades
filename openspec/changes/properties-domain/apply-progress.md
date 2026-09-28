# Apply Progress: Properties Domain (back)

## Scope of this batch

Phase 2 only (PR slice 2: Property Schema Foundation), tasks 2.1–2.9. Phase 1
(Neighborhoods) was completed and merged in a prior batch (see below).
Phases 3a–5b are NOT started.

## Mode

**Strict TDD Mode** (`npm test`, jest + ts-jest, `rootDir: src`).

## Branch / Commit State

Branch: `feat/properties-2-schema` (from `main`, after PR 1/neighborhoods
merged). Starting commit `ae5adeb` (pre-existing fix to `src/data-source.ts`
so the TypeORM CLI resolves a single `DataSource` export). This apply batch
adds one implementation commit (`b4dfe09`) on top. No push, no PR, no branch
switch performed.

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

## Deviations from Design

None functionally — implementation matches `design.md`'s column table, index list, enum definitions, and migration shape exactly. See the noted narrower-scope deviation in Migration Evidence above (only the properties migration was reverted this session, per explicit orchestrator instruction; neighborhoods was left applied).

## Open Items Carried Forward

- Task 1.5 (manual barrio-spelling review) — already signed off in a prior batch (2026-09-27); not re-verified this batch.
- Phase 3a onward — NOT started.

## Next Step

Phase 2 (tasks 2.1–2.9) is complete and verified, including the manual migration run/revert/run against a real Postgres instance. Ready for the next `sdd-apply` batch to start Phase 3a once PR 2 is reviewed/merged per the `stacked-to-main` chain strategy. This batch did NOT start Phase 3a.
