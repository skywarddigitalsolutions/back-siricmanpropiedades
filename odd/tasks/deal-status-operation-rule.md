# Feature 11 — Enforce deal status vs operation in the back

**Objective:** the back guarantees that `sold` only exists on `sale` properties and `rented` only on `rent` properties, whichever endpoint tries to break it.

**Problem / why:** the rule is enforced only in the admin panel (feature 6). Anyone calling the API directly can set `sold` on a rent property, and the regular edit endpoint lets the operation change while the property is `sold`/`rented`, producing "rent + sold". The back must own its invariants.

## Scope

- In (back): `PATCH /admin/properties/:id/deal-status` rejects an incompatible deal status with 400; `PATCH /admin/properties/:id` rejects changing `operation` when the current deal status would become incompatible (400). One shared rule helper.
- In (front): the property editor shows the operation-change rejection as a clear Spanish message next to the operation field (today the panel never offers incompatible deal statuses, so the deal-status endpoint error only appears with stale data and keeps its existing handling).
- Out: data migration of existing inconsistent rows (none expected; the panel already restricted it). Creation is unaffected: new properties always start `available`.

## Constraints and decisions

- User decision (2026-10-01): full version — also block operation changes, not only the deal-status endpoint. To re-list a sold sale property for rent: first set it back to `available`/`reserved`, then change the operation.
- `available` and `reserved` are valid for both operations.
- Back error messages stay in English (existing convention); the front translates.
- Rejected requests do not save and do not write an audit entry.

## TDD

- Mode: strict TDD enabled (source: user global orchestrator config). Runners: back `npm test` (Jest), front `npm test`. RED observed before GREEN.

## Tasks

| ID | Task | Repo | Route | Status | Commit |
|----|------|------|-------|--------|--------|
| T1 | Rule helper + enforce in `updateDealStatus` and `update` (operation change) with unit tests | back | delegated (writer trigger: 2+ files, two repos) | ✅ | a78da41 |
| T2 | Editor: map the operation-change 400 to a Spanish message on the operation field, with tests | front | delegated | ✅ | a88ba60 (front) |

## Acceptance criteria

- Back: `sold` on a rent property → 400; `rented` on a sale property → 400; `available`/`reserved` always allowed; changing `operation` of a `sold` sale property to `rent` → 400 with no save/audit; changing operation of an `available`/`reserved` property still works.
- Front: submitting that operation change shows a clear message on the operation field and keeps the form values.
- `npm run lint`, `npm test`, `npm run build` green in both repos.

## Progress

- 2026-10-01: feature started, branches `feat/deal-status-operation-rule` in both repos, doc created. RDD: off (default).
- 2026-10-01 T1 (back, a78da41): RED = helper spec failed (module missing) + 3 service tests failed ("promise resolved instead of rejected"); GREEN = 227 tests in src/properties, full suite 445 pass, build ok.
- 2026-10-01 T2 (front, a88ba60): RED = 2 tests failed (operation message undefined; deal-status 400 showed "ya tiene ese estado"); GREEN = 610 tests pass, lint 0 errors, build ok.

## Next step

Push, PRs (back first), deploy.
