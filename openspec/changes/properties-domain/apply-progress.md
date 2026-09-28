# Apply Progress: Properties Domain (back)

## Scope of this batch

Phase 1 only (PR slice 1: Neighborhoods), tasks 1.1–1.16. Phases 2–5b are NOT started.

## Mode

**Strict TDD Mode** (`npm test`, jest + ts-jest, `rootDir: src`).

## Branch / Commit State

Branch: `feat/properties-1-neighborhoods` (from `main`). Planning artifacts (proposal/specs/design/tasks) already committed as `a871bf7` before this apply run. This apply batch adds implementation commits on top of that same branch. No push, no PR, no branch switch performed.

## Completed Tasks (16/17 in Phase 1; 1.5 intentionally left open)

- [x] 1.1 RED `src/common/utils/slugify.spec.ts`
- [x] 1.2 GREEN `src/common/utils/slugify.ts`
- [x] 1.3 RED `src/neighborhoods/caba-neighborhoods.spec.ts`
- [x] 1.4 GREEN `src/migrations/1790500000000-CreateNeighborhoods.ts` (+ `CABA_NEIGHBORHOODS`)
- [ ] **1.5 MANUAL — NOT DONE.** Human review of the 48 barrio display spellings (`La Boca`, `La Paternal`, `Monserrat`) against the GCBA dataset. Left unchecked per orchestrator instruction. Must be signed off in the PR description before merge.
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
- [x] 1.16 Verify slice — all four gates green (see Verification Evidence)

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1/1.2 | `src/common/utils/slugify.spec.ts` | Unit (pure) | N/A (new) | ✅ Written — failed with `TS2307: Cannot find module './slugify'` | ✅ 14/14 passed after implementing `slugify.ts` | ✅ 14 cases (accents, ñ, punctuation, repeated separators, leading/trailing trim, full á-é-í-ó-ú-ñ set) | ➖ None needed — implementation is already minimal (normalize/strip/lowercase/replace/trim) |
| 1.3/1.4 | `src/neighborhoods/caba-neighborhoods.spec.ts` | Unit (pure, data) | N/A (new) | ✅ Written — failed with `TS2307: Cannot find module '../migrations/1790500000000-CreateNeighborhoods'` | ✅ 51/51 passed (3 structural + 48 `slug === slugify(name)`) after adding the migration + `CABA_NEIGHBORHOODS` | ✅ Triangulated intrinsically: 48 distinct name/slug pairs, each independently asserted via `it.each` | ➖ None needed |
| 1.7/1.8 | `src/neighborhoods/dto/create-neighborhood.dto.spec.ts` | Unit (DTO validation) | N/A (new) | ✅ Written — failed with `TS2307: Cannot find module './create-neighborhood.dto'` | ✅ 4/4 passed after implementing the DTO | ✅ 4 cases: empty, whitespace-only, irregular-spacing (trim+collapse), valid | ➖ None needed |
| 1.10/1.11 | `src/neighborhoods/neighborhoods.service.spec.ts` | Unit (mocked repo via `getRepositoryToken`) | N/A (new) | ✅ Written — failed with `TS2307: Cannot find module './neighborhoods.service'` | ✅ 4/4 passed after implementing `findAll`/`create` | ✅ 4 cases: `findAll` ordering, `create` success + audit, duplicate rejection (no save/audit), `23505` race mapped to `BadRequestException` (no audit) | ➖ None needed — logic is already a single, small pure branch structure |
| 1.12/1.13 | `src/neighborhoods/neighborhoods.controller.spec.ts` | Unit (metadata reflection) | N/A (new) | ✅ Written — failed with `TS2307: Cannot find module './neighborhoods.controller'` | ✅ 2/2 passed after implementing the controller | ➖ Single (2 scenarios: POST has role metadata, GET has none) — matches the 2 controller-metadata scenarios in tasks.md | ➖ None needed |
| 1.6, 1.9, 1.14, 1.15 | N/A — purely structural/declarative (enum literal add, entity mirroring migration columns 1:1, module wiring, app registration) | N/A | N/A | N/A | N/A | Triangulation skipped: single possible output, no branching/logic (enum constant, column mapping, module `imports`/`providers`/`exports` arrays) | N/A |

### Test Summary
- **Total tests written this batch**: 75 (14 slugify + 51 caba-neighborhoods + 4 DTO + 4 service + 2 controller)
- **Total tests passing**: 75/75 (batch), 141/141 (full suite after this batch)
- **Layers used**: Unit only — no integration/e2e harness exists in this project (`openspec/config.yaml`: `integration: false`, `e2e: false`)
- **Approval tests** (refactoring): None — no pre-existing files were modified except two purely additive edits (`audit-action.enum.ts`, `app.module.ts`), neither needed approval tests (both are additive-only, no behavior change to existing code paths, confirmed by the full-suite safety-net run below)
- **Pure functions created**: 1 (`slugify`)

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm test -- src/neighborhoods src/common/utils/slugify` → **5 suites, 75 tests, all passed** |
| Runtime harness command/scenario and exact result | **Not executed.** No local DB was authorized for this run. The suggested manual harness (`npm run migration:run` then `npm run migration:revert` against an empty DB) was NOT run — reported honestly, not simulated. |
| Rollback boundary | Revert this batch's commit(s): drops `src/common/utils/slugify.ts(+.spec)`, `src/neighborhoods/**`, the `1790500000000-CreateNeighborhoods.ts` migration, the additive `NEIGHBORHOOD_CREATED` enum value, and the additive `NeighborhoodsModule` import/registration in `app.module.ts`. No other module depends on `neighborhoods` yet, so this reverts cleanly with no dependents. |

## Verification Evidence (Task 1.16)

| Command | Observed result |
|---|---|
| `npm test` | **PASS** — 15 test suites, 141 tests, 0 failed. Exit code 0. (One benign jest infra warning: "worker process has failed to exit gracefully" — pre-existing async-handle-teardown noise unrelated to this change; test results themselves are 141/141 green.) |
| `npm run lint` | **PASS** — `eslint "src/**/*.ts" --fix`, exit code 0, no reported errors. Autofix removed two redundant `as any` casts in `neighborhoods.service.spec.ts` (structurally unnecessary once the DTO shape matched); re-ran the focused test file afterward to confirm the autofix did not change behavior — still 75/75 green. |
| `npx tsc -p tsconfig.build.json --noEmit` | **PASS** — no output, exit code 0. |
| `npm run build` | **PASS** — `nest build`, no output, exit code 0. `dist/neighborhoods/**` compiled artifacts confirmed present. |

**Migrations**: `npm run migration:run` / `migration:revert` were **NOT executed** against any database — no local DB was authorized for this session. This is an outstanding manual step (same as task 1.5) that must be performed by a human with DB access before/at PR merge, per the tasks list's own "Manual" framing for the equivalent Phase 2 task (2.8). It is not part of task 1.16's automated verify gates (which are only test/lint/typecheck/build), but is flagged here for visibility.

## Files Changed

| File | Action |
|------|--------|
| `src/common/utils/slugify.ts` | Created |
| `src/common/utils/slugify.spec.ts` | Created |
| `src/migrations/1790500000000-CreateNeighborhoods.ts` | Created |
| `src/neighborhoods/caba-neighborhoods.spec.ts` | Created |
| `src/neighborhoods/entities/neighborhood.entity.ts` | Created |
| `src/neighborhoods/dto/create-neighborhood.dto.ts` | Created |
| `src/neighborhoods/dto/create-neighborhood.dto.spec.ts` | Created |
| `src/neighborhoods/dto/index.ts` | Created |
| `src/neighborhoods/neighborhoods.service.ts` | Created |
| `src/neighborhoods/neighborhoods.service.spec.ts` | Created |
| `src/neighborhoods/neighborhoods.controller.ts` | Created |
| `src/neighborhoods/neighborhoods.controller.spec.ts` | Created |
| `src/neighborhoods/neighborhoods.module.ts` | Created |
| `src/audit/enums/audit-action.enum.ts` | Modified (additive: `NEIGHBORHOOD_CREATED`) |
| `src/app.module.ts` | Modified (additive: `NeighborhoodsModule` import + registration) |

## Deviations from Design

None — implementation matches `design.md`'s Decision blocks (slugify algorithm, migration shape, entity column mapping, module/controller/service split, slug-based uniqueness with `23505` race mapping) and `specs/neighborhoods/spec.md` exactly.

## Open Items Carried Forward

- Task 1.5 (manual barrio-spelling review) — NOT done, by design; requires human sign-off before PR 1 merges.
- Migration run/revert against a real DB — NOT executed this session (no DB authorized); must be verified manually before merge.

## Next Step

Phase 1 (tasks 1.1–1.16, excluding manual 1.5) is complete and verified. Ready for `sdd-archive`-adjacent handling of this slice per the orchestrator's chained-PR plan (PR 1), or for the next `sdd-apply` batch to start Phase 2 once PR 1 is reviewed/merged per the `stacked-to-main` chain strategy. This batch did NOT start Phase 2.
