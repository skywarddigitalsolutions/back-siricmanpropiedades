# Proposal: Properties Domain (back)

## Intent

The back end has auth, users, roles, and audit, but no real-estate domain yet. The public site (feature 6/7) and the admin panel both need a persistent, filterable property catalog. This change introduces the `properties` and `neighborhoods` domain: schema, admin CRUD with a publication lifecycle, and an unauthenticated public listing/detail API with the filters from the public design mock.

Why now: it is the core dependency for images (feature 4), the admin panel property screens, the public site listing, and leads (feature 8, which references properties).

Success: an admin or manager can create, edit, publish, archive and (when allowed) delete properties; the public API returns only published properties, filtered, sorted and paginated as `{ items, total }`, without ever mixing currencies in price sort or price-range filters, and without leaking hidden exact addresses.

## Scope

### In Scope
- **Neighborhoods**
  - `neighborhoods` table; the migration itself inserts the 48 official CABA barrios (always present, not gated by `RUN_SEED`).
  - Public read endpoint listing neighborhoods (needed to build the public filter UI).
  - Admin/manager endpoint to create a new neighborhood (unique name), audited as `NEIGHBORHOOD_CREATED`.
- **Property schema**
  - UUID PK, human-readable sequential `code` (`SP-101` style, DB sequence-backed), SEO `slug` frozen after first publish.
  - Fields: operation (sale|rent), type (apartment|house|ph|land|commercial|office|garage), title, description, neighborhood FK, address + `showExactAddress`, currency (USD|ARS), price, expenses (nullable), rooms, bedrooms, bathrooms, hasGarage, coveredArea, totalArea, age (0 = brand new), creditEligible, petsAllowed, immediateAvailability, marketingTag (new|opportunity|none), featured, 5 service booleans (water, naturalGas, sewer, electricity, internet).
  - Two status axes: `publicationStatus` (draft|published|archived) and `dealStatus` (available|reserved|sold|rented).
  - A first-publish marker (e.g. `firstPublishedAt`) that drives slug freezing and hard-delete eligibility.
- **Admin API** (`@Auth(ValidRoles.admin, ValidRoles.manager)`)
  - Create, update, get by id, list (all publication statuses, admin filters).
  - Publication transitions: publish, archive (the soft delete), unarchive/unpublish back to draft (exact transition matrix settled in spec/design).
  - Deal status update.
  - Hard delete: admin-only, and only when the property was never published; otherwise `BadRequestException`/`ForbiddenException`.
  - All mutations audited via `AuditLogService.record()` with new `PROPERTY_*` actions.
- **Public API** (unauthenticated)
  - List of `published` properties with filters: operation, type, neighborhood, rooms/bedrooms/bathrooms minimums, garage/credit/pets toggles, currency-scoped price range, min covered/total surface, sort (newest|price asc|price desc), pagination; response `{ items, total }`.
  - Detail by slug (published only; 404 otherwise).
  - Contract rule: `pmin`/`pmax` and price sorts REQUIRE `currency`; when present, results are scoped to that currency. Missing `currency` with a price filter/sort is a 400, never a silent mix.
  - Public response DTO omits the exact address when `showExactAddress = false` (neighborhood only).
- **Filter assembly** extracted into a pure, unit-testable function (filters DTO -> query conditions/order), per the testing decision.
- **Migrations**: additive only (new files; `InitSchema` untouched), with working `down()`.
- Unit tests (mocked repositories) written test-first under Strict TDD (`npm test`).

### Out of Scope
- Property images/photos and storage (feature 4).
- Admin login flow and token strategy changes, refresh tokens (feature 5).
- Leads / contact inbox (feature 8).
- Front-end public site and admin panel UI (features 6/7).
- Currency conversion or cross-currency price sorting.
- Editing/deleting neighborhoods; admin-editable services catalog.
- Tasaciones (valuation) form.
- Integration/e2e test infrastructure.

## Capabilities

> No existing specs in `openspec/specs/`; everything is new.

### New Capabilities
- `neighborhoods`: reference catalog of CABA barrios (48 preloaded by migration), public listing, admin/manager creation with uniqueness and audit.
- `property-management`: property schema, identifiers (UUID, sequential code, frozen slug), admin/manager CRUD, publication and deal status lifecycles, archive-as-soft-delete, admin-only hard delete of never-published properties, audit of mutations.
- `property-public-catalog`: unauthenticated listing/detail of published properties, filters, currency-scoped price rules, sorting, `{ items, total }` pagination, and address privacy in public responses.

### Modified Capabilities
- None (no existing specs). Note: `AuditAction` enum gains `PROPERTY_*` / `NEIGHBORHOOD_*` values; this is an additive implementation change, not a requirement change to an existing spec.

## Approach

Follow the exploration recommendation (1C, 2C, 3B, 4B, 5C, 6B), now fully settled:

- **Modules**: `src/neighborhoods/` and `src/properties/` following the existing layout (`module/controller/service/dto/entities`), registered in `app.module.ts`. Separate admin and public controllers inside `properties` so guards are applied at controller level and the public surface is obviously unauthenticated.
- **Schema**: two additive migrations (neighborhoods + 48-barrio insert; properties + enums + `code` sequence + indexes on filter/sort columns such as `publication_status`, `operation`, `type`, `neighborhood_id`, `(currency, price)`, `created_at`). Raw SQL via `queryRunner.query`, matching `InitSchema` conventions (snake_case, `uuid_generate_v4()`, `timestamp without time zone`).
- **Identifiers**: `code` from a Postgres sequence formatted `SP-<n>`; `slug` generated from title (+ uniqueness suffix) and immutable once `firstPublishedAt` is set.
- **Query strategy**: a shared filters DTO (class-validator, `@Transform` for numbers/booleans) feeds a pure `buildPublicPropertyQuery(filters)` function that returns where-conditions, parameters and ordering; the service applies it to a `createQueryBuilder` and uses `getManyAndCount()` for `{ items, total }`. Cross-field rule (price filter/sort requires `currency`) validated in the DTO/pure function.
- **Public projection**: a mapper to a public response DTO that strips internal fields and hides the exact address when `showExactAddress = false`.
- **Audit**: extend `AuditAction` with `PROPERTY_CREATED`, `PROPERTY_UPDATED`, `PROPERTY_PUBLISHED`, `PROPERTY_ARCHIVED`, `PROPERTY_UNPUBLISHED`, `PROPERTY_DEAL_STATUS_CHANGED`, `PROPERTY_DELETED`, `NEIGHBORHOOD_CREATED` (final list in design); call `record()` after each successful mutation.
- **Auth/roles impact**: first real usage of `manager`: `@Auth(ValidRoles.admin, ValidRoles.manager)` on admin property and neighborhood-creation endpoints; hard delete stays `@Auth(ValidRoles.admin)`. MFA remains mandatory for `admin` only (existing behavior, unchanged); managers operate without MFA. No change to JWT or login.
- **Testing**: Strict TDD; unit specs for services (mocked repositories via `getRepositoryToken`), the pure filter builder, slug/code helpers, lifecycle transition rules, and public mapper.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/neighborhoods/` | New | Entity, module, service, controller, DTOs, specs |
| `src/properties/` | New | Entity, enums, module, service, admin + public controllers, DTOs, filter builder, public mapper, specs |
| `src/migrations/<epoch>-CreateNeighborhoods.ts` | New | Table + 48 CABA barrios insert |
| `src/migrations/<epoch>-CreateProperties.ts` | New | Enums, `code` sequence, table, FK, indexes |
| `src/audit/enums/audit-action.enum.ts` | Modified | Additive `PROPERTY_*` / `NEIGHBORHOOD_*` values |
| `src/app.module.ts` | Modified | Register new modules |
| `src/migrations/1751500000000-InitSchema.ts` | Untouched | Must never be edited |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Change exceeds the 400-line review budget (forecast ~1,900-2,300 lines) | High | Deliver as chained PR slices (see forecast); decision required before apply under `ask-on-risk` |
| Price sort/filter silently mixes USD and ARS | Med | Contract requires `currency`; enforced in DTO + pure builder; unit-tested |
| Exact address leaked on public endpoints | Med | Dedicated public mapper; explicit unit tests for `showExactAddress = false` |
| Draft/archived properties exposed publicly | Med | `publication_status = 'published'` forced in the public builder, not caller-supplied; tested |
| Slug changes after publish break SEO links | Low | Freeze on `firstPublishedAt`; update path rejects/ignores slug change; tested |
| Barrio data accuracy (names/spelling of the 48) | Med | Single reviewed list in the migration; admins can add missing ones; uniqueness on name |
| `manager` has CRUD without MFA (first real usage of the role) | Med | Settled decision; flagged for feature 5 (auth hardening); hard delete remains admin-only |
| `DB_SYNCHRONIZE=true` locally drifts from migrations | Low | Keep synchronize off; migrations are the source of truth |
| Forgetting audit calls on some mutation | Low | Service specs assert `record()` per mutation |
| Query performance of filters without indexes | Low | Indexes on filter/sort columns in the migration |

## Rollback Plan

- **Code**: all new code lives in new modules plus additive enum/module-registration lines; revert the slice commit(s) or PR(s). Existing auth/users/audit behavior is not modified.
- **Database**: each migration ships a working `down()`. Roll back in reverse order: `npm run typeorm migration:revert` (properties first: drop table, sequence, enum types; then neighborhoods: drop table incl. seeded barrios). Because `migrationsRun: true`, revert the migrations BEFORE deploying the reverted code, or the old code will not re-run them.
- **Data loss warning**: reverting the properties migration drops all property rows. In production, take a `pg_dump` (daily backup already exists; take an ad-hoc one before the first deploy) before reverting.
- **Audit enum**: extra `AuditAction` values are harmless if code is reverted; existing `audit_logs` rows with those actions remain as historical strings.
- **Partial rollback**: because slices are chained, a later slice (e.g. public catalog) can be reverted without touching earlier ones (schema, admin CRUD).

## Review Workload Forecast

Estimated authored changed lines (additions + deletions), tests included:

| Slice | Content | Est. lines |
|-------|---------|-----------|
| 1 | Neighborhoods: migration (+48 barrios), entity, module, service, public list + create endpoint, audit values, specs | ~350-400 |
| 2 | Property schema: migration (enums, sequence, indexes), entity, enums, code/slug helpers + specs | ~350-400 |
| 3 | Admin CRUD: create/update/get/list DTOs, admin controller, service, audit, specs | ~450-550 |
| 4 | Lifecycle: publish/archive/unpublish, deal status, hard-delete rules, slug freeze, specs | ~300-400 |
| 5 | Public catalog: filters DTO, pure filter builder, public controller, mapper, `{ items, total }`, specs | ~450-550 |
| **Total** | | **~1,900-2,300** |

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
400-line budget risk: High
```

Delivery strategy is `ask-on-risk`: the orchestrator must ask the user for the chain strategy (`stacked-to-main` or `feature-branch-chain`) before `sdd-apply`. Slices 3 and 5 may still exceed 400 lines; `sdd-tasks` should split them further (e.g. create/update vs. list/get; DTO+builder vs. controller+mapper) or record an explicit `size:exception`.

## Dependencies

- Existing `AuditLogService`, `@Auth` decorator, `ValidRoles`, global `ValidationPipe`, TypeORM migration setup (`migrationsRun: true`).
- `uuid-ossp` extension already enabled by `InitSchema` (confirm in design).
- Authoritative list of the 48 official CABA barrios.
- No new npm packages expected (slug generation can be a small local helper; design may choose otherwise).

## Success Criteria

- [ ] Migrations apply cleanly on an empty DB and on the current schema; `down()` reverts both cleanly; `InitSchema` unchanged.
- [ ] After migration, `neighborhoods` contains exactly the 48 CABA barrios without running the seed.
- [ ] admin and manager can create/update/publish/archive properties and create neighborhoods; `user` role and anonymous callers get 401/403 on admin endpoints.
- [ ] Hard delete succeeds only for admin on never-published properties; all other cases are rejected.
- [ ] Every property/neighborhood mutation writes an audit log entry with the new actions.
- [ ] Public list returns only `published` properties, supports every mock filter and sort, and returns `{ items, total }`.
- [ ] Price range or price sort without `currency` returns 400; with `currency`, results contain only that currency.
- [ ] Public responses never include the exact address when `showExactAddress = false`.
- [ ] Slug cannot change once the property has been published; `code` is unique and sequential (`SP-<n>`).
- [ ] `npm test`, `npm run lint`, `npx tsc -p tsconfig.build.json --noEmit` and `npm run build` pass; new logic developed test-first.
