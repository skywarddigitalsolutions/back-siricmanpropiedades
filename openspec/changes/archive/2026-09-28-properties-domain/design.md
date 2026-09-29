# Design: Properties Domain (back)

## Technical Approach

Two new feature modules follow the existing layout (`module / controller(s) / service(s) / dto / entities`, with `helpers/` and `enums/` as already used in `src/auth/helpers` and `src/audit/enums`):

- `src/neighborhoods/`: reference catalog (48 CABA barrios inserted by migration), public list, admin/manager creation.
- `src/properties/`: property entity, admin CRUD + lifecycle (`/api/admin/properties`), public catalog (`/api/properties`).

All business rules that do not need I/O live in pure helpers (slug, code, lifecycle transitions, query builders, public mapper), so Strict TDD runs against plain functions first and services are tested with hand-mocked repositories (`getRepositoryToken`), matching `src/users/services/users.service.spec.ts`. Schema changes ship as two additive raw-SQL migrations; `InitSchema` is untouched.

Settled inputs honored here (not reopened): 1C (UUID + code + slug), 2C (publication + deal axes), 3B (archive as soft delete + narrow hard delete), 4B (filters DTO + `{ items, total }`), 5C (fixed service booleans), 6B (pure filter builder), admin + manager CRUD, admin-only hard delete of never-published properties, public GET neighborhoods, publish / archive / unpublish-to-draft transitions, 400 on price filter/sort without `currency`.

## Verified Codebase Facts

| Fact | Evidence |
|------|----------|
| `uuid-ossp` is enabled, `uuid_generate_v4()` available | `src/migrations/1751500000000-InitSchema.ts` line 7: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` |
| Migrations auto-run at boot; CLI glob is `src/migrations/*{.ts,.js}` | `src/app.module.ts` (`migrationsRun: true`), `src/data-source.ts` |
| Audit action values are dot-notation strings; `audit_logs.action` is `varchar(50)`, `entity_id` is `uuid` | `src/audit/enums/audit-action.enum.ts`, InitSchema |
| `AuditLogService.record({ actor, action, entityType, entityId, metadata })`; actor is `{ id, userName }` | `src/audit/audit-log.service.ts`, `src/audit/interfaces/audit-actor.interface.ts` |
| `UserRoleGuard` reads roles from the handler first, then the class (handler overrides class) | `src/auth/guards/user-role/user-role.guard.ts` lines 21-23 |
| Global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, prefix `/api`; no `enableImplicitConversion` | `src/main.ts` |
| Global `ThrottlerGuard` at 20 req / 60 s per client | `src/app.module.ts` |
| Business-rule violations use `BadRequestException` (duplicate user name, last admin) | `src/users/services/users.service.ts` |
| No slug library installed; no new dependency needed | `package.json` |

## Architecture Decisions

### Decision: Module and controller split

**Choice**: `NeighborhoodsModule` with one controller (public `GET`, method-level `@Auth(admin, manager)` on `POST`). `PropertiesModule` with two controllers: `AdminPropertiesController` (`@Controller('admin/properties')`, class-level `@Auth(ValidRoles.admin, ValidRoles.manager)`) and `PublicPropertiesController` (`@Controller('properties')`, no guards). Two services: `PropertiesService` (admin CRUD + lifecycle) and `PublicPropertiesService` (read-only published catalog).
**Alternatives considered**: single controller with per-method guards (easy to forget a guard on a new admin route); separate `admin` module (extra wiring, no benefit).
**Rationale**: the guard boundary is visible at class level; the public surface is a separate class whose only dependency is a read-only service that always forces `published`.

### Decision: Hard delete guard uses method-level `@RoleProtected(ValidRoles.admin)`

**Choice**: `DELETE /api/admin/properties/:id` keeps the class-level `@Auth(admin, manager)` guards and adds `@RoleProtected(ValidRoles.admin)` plus `@ApiForbiddenResponse` on the handler.
**Alternatives considered**: a second method-level `@Auth(ValidRoles.admin)` (works, but runs the JWT and role guards twice).
**Rationale**: `UserRoleGuard` resolves handler metadata before class metadata, so the handler-level role list `['admin']` overrides `['admin','manager']` with a single guard pass. A unit test asserts the metadata so a refactor of the guard cannot silently widen access.

### Decision: Human-readable `code` from a Postgres sequence, reserved by the service

**Choice**: `CREATE SEQUENCE property_code_seq START WITH 101`, `OWNED BY properties.code`. The column also has `DEFAULT ('SP-' || nextval('property_code_seq'))` for manual SQL inserts. On create, the service reserves the number explicitly: `SELECT nextval('property_code_seq') AS value` via `propertyRepository.query`, then sets `code = formatPropertyCode(n)` (`SP-101`) before saving. `code` is `UNIQUE`, never updatable (`update: false`, not present in any DTO).
**Alternatives considered**: `MAX(code)+1` in app code (race conditions); relying only on the DB default (slug needs the code before insert, and TypeORM RETURNING of non-generated defaults is fragile).
**Rationale**: the code is known before insert, so the slug can embed it (next decision). Starting at 101 matches the mock (`SP-101`). Gaps after a failed insert are acceptable: the code must be unique and increasing, not gapless.

### Decision: Slug = `slugify(title)` + code suffix, frozen by `firstPublishedAt`

**Choice**: `buildPropertySlug(title, code)` returns `${slugify(title).slice(0, 80)}-${code.toLowerCase()}` (e.g. `departamento-3-ambientes-en-palermo-sp-101`). `slugify` (in `src/common/utils/slugify.ts`) does: NFD normalize, strip combining marks, lowercase, `ñ` handled by NFD, replace non `[a-z0-9]` runs with `-`, trim leading/trailing `-`. The slug is never accepted from clients. On `update`, if `title` changes AND `firstPublishedAt IS NULL`, the slug is regenerated with the same code; once `firstPublishedAt` is set the slug never changes. `slug` has a `UNIQUE` constraint.
**Alternatives considered**: numeric suffix with a uniqueness retry loop (extra queries, race-prone); client-provided slug (validation and collision burden); regenerate always (breaks published URLs).
**Rationale**: the code suffix makes the slug unique by construction (no retry loop), keeps it human-readable, and gives the front a stable URL after first publish.

### Decision: Publication transition matrix

**Choice**: a pure `assertPublicationTransition(from, action)` returning the target status or throwing `BadRequestException`:

| Action (endpoint) | Allowed from | To | Side effects | Audit |
|---|---|---|---|---|
| `publish` | `draft`, `archived` | `published` | set `firstPublishedAt = now` only if it is still null (first publish); unchanged on re-publish | `PROPERTY_PUBLISHED` `{ code, from, firstPublish }` |
| `archive` | `draft`, `published` | `archived` | none | `PROPERTY_ARCHIVED` `{ code, from }` |
| `unpublish` | `published`, `archived` | `draft` | none (`firstPublishedAt` kept) | `PROPERTY_UNPUBLISHED` `{ code, from }` |

Every other combination (including same-state, e.g. `draft -> draft` via `unpublish`, or `published -> published` via `publish`) is a 400 with a message naming the current status.
**Alternatives considered**: free-form `PATCH { publicationStatus }` (unaudited semantics, no rules); a narrower matrix with a single path into `published` (rejected: the product decision is the broad matrix above, where `publish` is valid from both `draft` and `archived`).
**Rationale**: explicit verbs map 1:1 to audit actions; draft can be archived so managers (who cannot hard delete) can remove unwanted drafts; every status has a direct path back to `published` or to `draft` without a forced intermediate hop.

### Decision: Deal status independent of publication

**Choice**: `PATCH /:id/deal-status { dealStatus }` allows any `available|reserved|sold|rented` value in any publication status; setting the current value again is a 400. Audited as `PROPERTY_DEAL_STATUS_CHANGED` `{ code, from, to }`. New properties start `available`.
**Alternatives considered**: tying `sold/rented` to operation (`rented` only for `rent`). Rejected for now: not requested, and it blocks correcting data entry mistakes. Noted as an open question.
**Rationale**: matches the mock (badge on published listings) with the least rule surface.

### Decision: Hard delete eligibility = `firstPublishedAt IS NULL`

**Choice**: admin-only; if `firstPublishedAt` is not null, throw `BadRequestException('Property was published at least once; archive it instead')`. Deletion records `PROPERTY_DELETED` `{ code, title }` after `remove`. Response `204 No Content`.
**Alternatives considered**: `ForbiddenException` (semantically an authorization error; the caller is authorized, the resource state is wrong).
**Rationale**: follows the existing convention of `BadRequestException` for business-rule violations (`User is already active`, last admin).

### Decision: Enums as native Postgres enum types

**Choice**: `CREATE TYPE` for `property_operation_enum`, `property_type_enum`, `property_currency_enum`, `property_publication_status_enum`, `property_deal_status_enum`, `property_marketing_tag_enum`; entity uses `type: 'enum', enum: X, enumName: '...'` so TypeORM metadata matches the migration.
**Alternatives considered**: `varchar` + `CHECK` (easier to remove values later).
**Rationale**: aligns with the proposal rollback plan (drop enum types) and gives DB-level integrity; PG16 supports `ALTER TYPE ... ADD VALUE` in later additive migrations if the catalog grows.

### Decision: Money and areas as `numeric` with a number transformer

**Choice**: `price numeric(14,2)`, `expenses numeric(12,2) NULL`, `covered_area`/`total_area numeric(10,2)`. A shared `numericTransformer` (`src/common/transformers/numeric.transformer.ts`) maps DB strings to `number` and back.
**Alternatives considered**: `integer`/`bigint` (loses cents for ARS expenses; bigint also returns strings); `float` (rounding).
**Rationale**: exact decimal storage; `numeric(14,2)` holds ARS prices up to ~10^12. Responses expose numbers, not strings.

### Decision: Pure query builders returning a query spec

**Choice**: `buildPublicPropertyQuery(filters)` and `buildAdminPropertyQuery(filters)` in `src/properties/helpers/property-query.builder.ts` return a `PropertyQuerySpec` (where clauses with named params, order list, take/skip). The service applies the spec to `createQueryBuilder('property').innerJoinAndSelect('property.neighborhood','neighborhood')` and calls `getManyAndCount()`.
**Alternatives considered**: building the query inside the service (requires mocking the whole query-builder chain to test every filter); TypeORM `FindOptionsWhere` objects (awkward for `>=` and optional currency scoping, and `innerJoin` filtering by neighborhood slug).
**Rationale**: every filter, the forced `published` clause, and the currency rule are asserted on plain objects. The service spec only checks the spec is applied and the envelope is `{ items, total }`.

### Decision: Currency rule enforced in the DTO, re-asserted in the builder

**Choice**: `PublicPropertyFiltersDto` uses a custom class-validator decorator `@RequiresCurrency()` on `priceMin`, `priceMax` and `sort` (fails when the value is price-related and `currency` is undefined), plus `@IsGreaterThanOrEqualTo('priceMin')` on `priceMax`. The ValidationPipe turns both into 400. `buildPublicPropertyQuery` re-checks and throws `BadRequestException` so non-HTTP callers cannot mix currencies. When `currency` is present, results are always scoped to it, even without price filters.
**Alternatives considered**: `@ValidateIf` on `currency` (skips enum validation of `currency` when no price param is present); service-only check (400 happens after validation, message format differs).
**Rationale**: consistent ValidationPipe error shape for the front, with a defensive guarantee at the pure layer.

### Decision: Neighborhood identity in filters and uniqueness

**Choice**: neighborhoods get a `slug` column (`UNIQUE`). The public property filter takes `neighborhood=<slug>` (shareable URLs such as `?neighborhood=palermo`); admin DTOs take `neighborhoodId` (UUID). Creating a neighborhood checks uniqueness by slug (catches `palermo` vs `Palermo` vs `Pálermo`) and `name` has its own `UNIQUE` constraint; a DB `23505` from a race is mapped to the same 400.
**Alternatives considered**: filter by UUID (opaque URLs); `lower(name)` unique index without accent folding (lets `Nunez` duplicate `Núñez`).
**Rationale**: accent/case-insensitive uniqueness without the `unaccent` extension, and readable public URLs.

### Decision: Public projection via a pure mapper

**Choice**: `toPublicProperty(property)` returns `PublicPropertyResponse`; `address` is `null` when `showExactAddress = false`; internal fields (`publicationStatus`, `showExactAddress`, `createdAt`, `updatedAt`, `neighborhood.id`) are omitted; service booleans are grouped into `services`. Used for list items and detail. Admin endpoints return the entity (with `neighborhood`) unchanged.
**Alternatives considered**: `class-transformer` `@Exclude` groups on the entity (privacy depends on remembering serialization groups, and hiding is conditional on a field value).
**Rationale**: an explicit whitelist is the safest way to never leak the exact address; unit tests cover both flag values.

### Decision: Update semantics

**Choice**: `UpdatePropertyDto = PartialType(CreatePropertyDto)` (`@nestjs/swagger`). `code`, `slug`, `publicationStatus`, `dealStatus`, `firstPublishedAt` are not in any write DTO, so `forbidNonWhitelisted` rejects them with 400. The service computes `changedFields`; if empty, it returns the property without saving or auditing. Otherwise it saves and records `PROPERTY_UPDATED` `{ code, changedFields }`. Published properties remain editable (only the slug is frozen). `neighborhoodId` is resolved separately from the generic scalar-field diff (it maps to the `neighborhood` relation, not a column): if submitted and different from the property's current neighborhood, it is looked up with the same rule as `create()` (`neighborhoodRepository.findOne`; missing → `BadRequestException('Neighborhood not found')`, no save, no audit); if it matches the current neighborhood, it is a no-op for that field (no lookup). A successful change adds `'neighborhoodId'` to `changedFields`.
**Rationale**: status changes only through audited verbs; no noise audit entries. `neighborhoodId` reuses `create()`'s exact validation rule (same error message, same "not found" semantics) instead of introducing a second way to fail on a missing neighborhood.

## Data Flow

Admin create:

```
POST /api/admin/properties
  -> AuthGuard('jwt') -> UserRoleGuard [admin|manager]
  -> ValidationPipe(CreatePropertyDto)
  -> PropertiesService.create(dto, actor)
       neighborhoodRepository.findOne(id) --(missing)--> 400
       propertyRepository.query(nextval) -> n
       code = formatPropertyCode(n); slug = buildPropertySlug(title, code)
       propertyRepository.save({ ...dto, code, slug, draft, available })
       auditLogService.record(PROPERTY_CREATED)
       findOne(id) (with neighborhood) -> response
```

Public list:

```
GET /api/properties?operation=sale&currency=USD&sort=price_asc&priceMin=100000
  -> ValidationPipe(PublicPropertyFiltersDto)   [400 if price w/o currency]
  -> PublicPropertiesService.findAll(filters)
       spec = buildPublicPropertyQuery(filters)  [forces published]
       qb = createQueryBuilder('property').innerJoinAndSelect(neighborhood)
       apply spec.where / spec.orderBy / take / skip
       [rows, total] = qb.getManyAndCount()
  -> { items: rows.map(toPublicProperty), total }
```

Lifecycle:

```
PATCH /api/admin/properties/:id/publish
  -> PropertiesService.publish(id, actor)
       findOne(id) --(missing)--> 404
       to = assertPublicationTransition(from, 'publish')  --(invalid)--> 400
       firstPublishedAt ??= now ; save ; record(PROPERTY_PUBLISHED)
```

## Schema

### Migration 1: `src/migrations/1790500000000-CreateNeighborhoods.ts`

Generated with `npm run migration:create`; the timestamp shown is indicative, but it MUST sort after `1751500000000` and before the properties migration.

```sql
CREATE TABLE "neighborhoods" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar(100) NOT NULL,
  "slug" varchar(120) NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_neighborhoods_name" UNIQUE ("name"),
  CONSTRAINT "UQ_neighborhoods_slug" UNIQUE ("slug"),
  CONSTRAINT "PK_neighborhoods" PRIMARY KEY ("id")
);
INSERT INTO "neighborhoods" ("name", "slug") VALUES (...48 rows...);
-- down(): DROP TABLE "neighborhoods";
```

The migration exports `CABA_NEIGHBORHOODS: ReadonlyArray<{ name: string; slug: string }>` and builds the `INSERT` from it with parameter placeholders (`$1, $2, ...`), so the data is testable. The spec lives in `src/neighborhoods/caba-neighborhoods.spec.ts` (NOT under `src/migrations/`, because the migrations glob `migrations/*{.ts,.js}` would load a spec file as a migration in the ts-node CLI).

#### The 48 official CABA barrios

Source: Ley 1777 (CABA, 2005, Comunas) as published in the GCBA "Barrios" dataset (Buenos Aires Data). Confidence: high for the set of 48; medium for display spelling, since the dataset uses uppercase short forms (`BOCA`, `PATERNAL`, `NUÑEZ`, `MONSERRAT`). This list was compiled from domain knowledge and was not re-fetched from the dataset during design; it must be reviewed before the slice-1 PR merges. Display names use the common forms "La Boca" and "La Paternal" and the official "Monserrat" spelling.

| # | Name | Slug | # | Name | Slug |
|---|------|------|---|------|------|
| 1 | Agronomía | agronomia | 25 | Parque Chas | parque-chas |
| 2 | Almagro | almagro | 26 | Parque Patricios | parque-patricios |
| 3 | Balvanera | balvanera | 27 | Puerto Madero | puerto-madero |
| 4 | Barracas | barracas | 28 | Recoleta | recoleta |
| 5 | Belgrano | belgrano | 29 | Retiro | retiro |
| 6 | Boedo | boedo | 30 | Saavedra | saavedra |
| 7 | Caballito | caballito | 31 | San Cristóbal | san-cristobal |
| 8 | Chacarita | chacarita | 32 | San Nicolás | san-nicolas |
| 9 | Coghlan | coghlan | 33 | San Telmo | san-telmo |
| 10 | Colegiales | colegiales | 34 | Vélez Sarsfield | velez-sarsfield |
| 11 | Constitución | constitucion | 35 | Versalles | versalles |
| 12 | Flores | flores | 36 | Villa Crespo | villa-crespo |
| 13 | Floresta | floresta | 37 | Villa del Parque | villa-del-parque |
| 14 | La Boca | la-boca | 38 | Villa Devoto | villa-devoto |
| 15 | La Paternal | la-paternal | 39 | Villa General Mitre | villa-general-mitre |
| 16 | Liniers | liniers | 40 | Villa Lugano | villa-lugano |
| 17 | Mataderos | mataderos | 41 | Villa Luro | villa-luro |
| 18 | Monte Castro | monte-castro | 42 | Villa Ortúzar | villa-ortuzar |
| 19 | Monserrat | monserrat | 43 | Villa Pueyrredón | villa-pueyrredon |
| 20 | Nueva Pompeya | nueva-pompeya | 44 | Villa Real | villa-real |
| 21 | Núñez | nunez | 45 | Villa Riachuelo | villa-riachuelo |
| 22 | Palermo | palermo | 46 | Villa Santa Rita | villa-santa-rita |
| 23 | Parque Avellaneda | parque-avellaneda | 47 | Villa Soldati | villa-soldati |
| 24 | Parque Chacabuco | parque-chacabuco | 48 | Villa Urquiza | villa-urquiza |

Informal areas commonly marketed as neighborhoods (for example "Palermo Soho", "Barrio Norte", "Las Cañitas") are intentionally excluded; admins/managers can add them through `POST /api/neighborhoods`.

### Migration 2: `src/migrations/1790500000001-CreateProperties.ts`

```sql
CREATE TYPE "property_operation_enum" AS ENUM ('sale','rent');
CREATE TYPE "property_type_enum" AS ENUM ('apartment','house','ph','land','commercial','office','garage');
CREATE TYPE "property_currency_enum" AS ENUM ('USD','ARS');
CREATE TYPE "property_publication_status_enum" AS ENUM ('draft','published','archived');
CREATE TYPE "property_deal_status_enum" AS ENUM ('available','reserved','sold','rented');
CREATE TYPE "property_marketing_tag_enum" AS ENUM ('new','opportunity','none');
CREATE SEQUENCE "property_code_seq" START WITH 101;
CREATE TABLE "properties" ( ...columns below...,
  CONSTRAINT "PK_properties" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_properties_code" UNIQUE ("code"),
  CONSTRAINT "UQ_properties_slug" UNIQUE ("slug"),
  CONSTRAINT "FK_properties_neighborhood" FOREIGN KEY ("neighborhood_id")
    REFERENCES "neighborhoods"("id") ON DELETE RESTRICT );
ALTER SEQUENCE "property_code_seq" OWNED BY "properties"."code";
-- indexes below
-- down(): DROP TABLE "properties" (drops the owned sequence); DROP SEQUENCE IF EXISTS "property_code_seq";
--         DROP TYPE x6 in reverse order.
```

#### Columns (entity `Property`, `@Entity({ name: 'properties' })`)

| Property | Column | SQL type | Null / default | Notes |
|---|---|---|---|---|
| id | id | uuid | `uuid_generate_v4()` | `@PrimaryGeneratedColumn('uuid')` |
| code | code | varchar(20) | NOT NULL, default `'SP-' \|\| nextval(...)` | unique, `update: false` |
| slug | slug | varchar(120) | NOT NULL | unique |
| operation | operation | property_operation_enum | NOT NULL | |
| type | type | property_type_enum | NOT NULL | |
| title | title | varchar(150) | NOT NULL | |
| description | description | text | NULL | |
| neighborhood | neighborhood_id | uuid FK | NOT NULL | `@ManyToOne(() => Neighborhood, { nullable: false })` + `@JoinColumn` |
| address | address | varchar(200) | NOT NULL | never public when hidden |
| showExactAddress | show_exact_address | boolean | NOT NULL DEFAULT false | privacy by default |
| currency | currency | property_currency_enum | NOT NULL | |
| price | price | numeric(14,2) | NOT NULL | numericTransformer |
| expenses | expenses | numeric(12,2) | NULL | null = none |
| rooms | rooms | smallint | NOT NULL | ambientes |
| bedrooms | bedrooms | smallint | NOT NULL | |
| bathrooms | bathrooms | smallint | NOT NULL | |
| hasGarage | has_garage | boolean | NOT NULL DEFAULT false | |
| coveredArea | covered_area | numeric(10,2) | NOT NULL | m² |
| totalArea | total_area | numeric(10,2) | NOT NULL | m² |
| age | age | smallint | NOT NULL | 0 = brand new |
| creditEligible | credit_eligible | boolean | NOT NULL DEFAULT false | |
| petsAllowed | pets_allowed | boolean | NOT NULL DEFAULT false | |
| immediateAvailability | immediate_availability | boolean | NOT NULL DEFAULT false | |
| marketingTag | marketing_tag | property_marketing_tag_enum | NOT NULL DEFAULT 'none' | |
| featured | featured | boolean | NOT NULL DEFAULT false | |
| hasWater | has_water | boolean | NOT NULL DEFAULT false | service |
| hasNaturalGas | has_natural_gas | boolean | NOT NULL DEFAULT false | service |
| hasSewer | has_sewer | boolean | NOT NULL DEFAULT false | service |
| hasElectricity | has_electricity | boolean | NOT NULL DEFAULT false | service |
| hasInternet | has_internet | boolean | NOT NULL DEFAULT false | service |
| publicationStatus | publication_status | property_publication_status_enum | NOT NULL DEFAULT 'draft' | |
| dealStatus | deal_status | property_deal_status_enum | NOT NULL DEFAULT 'available' | |
| firstPublishedAt | first_published_at | timestamp without time zone | NULL | slug freeze + delete eligibility + "newest" sort |
| createdAt | created_at | timestamp without time zone | NOT NULL DEFAULT now() | `@CreateDateColumn` |
| updatedAt | updated_at | timestamp without time zone | NOT NULL DEFAULT now() | `@UpdateDateColumn` |

`Neighborhood` entity: `id`, `name`, `slug`, `createdAt`, same conventions; no inverse `@OneToMany` (not needed).

#### Indexes (filter and sort paths)

| Index | Columns | Serves |
|---|---|---|
| `IDX_properties_pub_status_first_published_at` | (`publication_status`, `first_published_at`) | default public list, `sort=newest` |
| `IDX_properties_currency_price` | (`currency`, `price`) | currency scope, `priceMin`/`priceMax`, price sorts |
| `IDX_properties_pub_status_operation_type` | (`publication_status`, `operation`, `type`) | most common public filters |
| `IDX_properties_neighborhood_id` | (`neighborhood_id`) | FK + neighborhood filter + `RESTRICT` checks |
| `IDX_properties_created_at` | (`created_at`) | admin list ordering |

`code` and `slug` are indexed by their unique constraints. Boolean/room/area filters are not indexed (low selectivity, small table: hundreds of rows).

## Interfaces / Contracts

### Endpoints and guards

| Method | Route | Guard | Success | Errors |
|---|---|---|---|---|
| GET | `/api/neighborhoods` | public | 200 `{ id, name, slug }[]` ordered by name | - |
| POST | `/api/neighborhoods` | `@Auth(admin, manager)` | 201 neighborhood | 400 validation / duplicate, 401, 403 |
| POST | `/api/admin/properties` | class `@Auth(admin, manager)` | 201 property | 400, 401, 403 |
| GET | `/api/admin/properties` | class | 200 `{ items, total }` | 400 |
| GET | `/api/admin/properties/:id` | class | 200 property | 400 (uuid), 404 |
| PATCH | `/api/admin/properties/:id` | class | 200 property | 400, 404 |
| PATCH | `/api/admin/properties/:id/publish` | class | 200 property | 400 transition, 404 |
| PATCH | `/api/admin/properties/:id/archive` | class | 200 property | 400 transition, 404 |
| PATCH | `/api/admin/properties/:id/unpublish` | class | 200 property | 400 transition, 404 |
| PATCH | `/api/admin/properties/:id/deal-status` | class | 200 property | 400, 404 |
| DELETE | `/api/admin/properties/:id` | class guards + `@RoleProtected(admin)` | 204 | 400 ever published, 403 manager, 404 |
| GET | `/api/properties` | public | 200 `{ items: PublicProperty[], total }` | 400 |
| GET | `/api/properties/:slug` | public | 200 `PublicProperty` | 404 missing or not published |

MFA stays mandatory for `admin` only (unchanged); `manager` operates without MFA (settled, flagged for feature 5). Actor for audit is built as in `UsersController`: `{ id: user.id, userName: user.userName }` from `@GetUser()`.

### DTOs (class-validator)

- `CreateNeighborhoodDto`: `name` `@Transform(trim + collapse spaces) @IsString @Length(2, 100)`.
- `CreatePropertyDto`: `operation @IsEnum`, `type @IsEnum`, `title @IsString @Length(5,150)` (trimmed), `description? @IsOptional @IsString @MaxLength(5000)`, `neighborhoodId @IsUUID('4')`, `address @IsString @Length(3,200)`, `showExactAddress? @IsBoolean`, `currency @IsEnum`, `price @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive @Max(999999999999)`, `expenses? @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)` (nullable), `rooms/bedrooms/bathrooms @IsInt @Min(0) @Max(50)`, `coveredArea/totalArea @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000)`, `age @IsInt @Min(0) @Max(300)`, optional booleans `hasGarage, creditEligible, petsAllowed, immediateAvailability, featured, hasWater, hasNaturalGas, hasSewer, hasElectricity, hasInternet` (`@IsOptional @IsBoolean`, DB default false), `marketingTag? @IsEnum`. JSON body, so no string coercion needed.
- `UpdatePropertyDto = PartialType(CreatePropertyDto)`.
- `UpdateDealStatusDto`: `dealStatus @IsEnum(DealStatus)`.
- `AdminPropertyFiltersDto` (query): `publicationStatus?`, `dealStatus?`, `operation?`, `type?`, `neighborhoodId? @IsUUID`, `q? @IsString @MaxLength(100)` (ILIKE on `title` or `code`), `limit? @Type(() => Number) @IsInt @Min(1) @Max(100)` default 20, `offset? @Type(() => Number) @IsInt @Min(0)` default 0.
- `PublicPropertyFiltersDto` (query): `operation?`, `type?`, `neighborhood? @IsString @MaxLength(120)` (slug), `minRooms?/minBedrooms?/minBathrooms? @Type(() => Number) @IsInt @Min(0)`, `hasGarage?/creditEligible?/petsAllowed?` via `@Transform(toQueryBoolean) @IsBoolean` (`'true'|'false'` only; applied literally), `currency? @IsEnum(Currency)`, `priceMin?/priceMax? @Type(() => Number) @IsNumber @Min(0)` + `@RequiresCurrency()`, `priceMax` + `@IsGreaterThanOrEqualTo('priceMin')`, `minCoveredArea?/minTotalArea? @Type(() => Number) @IsNumber @Min(0)`, `sort? @IsIn(['newest','price_asc','price_desc'])` + `@RequiresCurrency()` (only fails for price sorts), `limit?` default 12 max 50, `offset?` default 0. No `featured` query field: the spec's Public Listing Filters requirement does not list a public `featured` filter, and adding one is an open product decision (see Open Questions) — out of scope for this change's implementation.

`@Type(() => Number)` is required on every numeric query field because `enableImplicitConversion` is not enabled globally.

### Pure helper contracts

```ts
// src/common/utils/slugify.ts
export function slugify(input: string): string;

// src/properties/helpers/property-identifiers.ts
export function formatPropertyCode(sequenceValue: number): string;      // 101 -> 'SP-101'
export function buildPropertySlug(title: string, code: string): string; // -> '<slug(title)[0..80]>-sp-101'

// src/properties/helpers/property-lifecycle.ts
export type PublicationAction = 'publish' | 'archive' | 'unpublish';
export function assertPublicationTransition(
  from: PublicationStatus,
  action: PublicationAction,
): PublicationStatus; // throws BadRequestException on invalid transition

// src/properties/helpers/property-query.builder.ts
export interface WhereClause { sql: string; params: Record<string, unknown>; }
export interface OrderClause { column: string; direction: 'ASC' | 'DESC'; }
export interface PropertyQuerySpec {
  where: WhereClause[];   // applied with qb.andWhere(sql, params), in order
  orderBy: OrderClause[]; // first -> orderBy, rest -> addOrderBy
  take: number;
  skip: number;
}
export const PROPERTY_ALIAS = 'property';
export const NEIGHBORHOOD_ALIAS = 'neighborhood';
export function buildPublicPropertyQuery(f: PublicPropertyFiltersDto): PropertyQuerySpec;
export function buildAdminPropertyQuery(f: AdminPropertyFiltersDto): PropertyQuerySpec;
```

`buildPublicPropertyQuery` rules:

1. First clause is always `property.publicationStatus = :publicationStatus` with `'published'`; no filter field can override it.
2. Throws `BadRequestException` if (`priceMin` or `priceMax` defined, or `sort` is `price_asc|price_desc`) and `currency` is undefined; throws if `priceMax < priceMin`.
3. Equality clauses: `operation`, `type`, `currency`, `neighborhood.slug = :neighborhoodSlug`, and each defined boolean toggle.
4. Minimum clauses (`>=`): `rooms`, `bedrooms`, `bathrooms`, `coveredArea`, `totalArea`, `price` (`priceMin`); `price <= :priceMax`.
5. Each clause uses a unique parameter name; undefined filters produce no clause.
6. Ordering: `newest` (default) -> `property.firstPublishedAt DESC`, `property.id DESC`; `price_asc` -> `property.price ASC`, `property.id ASC`; `price_desc` -> `property.price DESC`, `property.id DESC`. The `id` tiebreaker keeps pagination stable.
7. `take = limit ?? 12`, `skip = offset ?? 0`.

`buildAdminPropertyQuery`: no forced status; equality on the enum/uuid filters; `q` becomes `(property.title ILIKE :q OR property.code ILIKE :q)` with `%` wrapping and `%`/`_` escaped; order `property.createdAt DESC, property.id DESC`; `take = limit ?? 20`.

### Public response

```ts
// src/properties/helpers/public-property.mapper.ts
export interface PublicPropertyResponse {
  id: string; code: string; slug: string;
  operation: Operation; type: PropertyType;
  title: string; description: string | null;
  neighborhood: { name: string; slug: string };
  address: string | null;            // null when showExactAddress = false
  currency: Currency; price: number; expenses: number | null;
  rooms: number; bedrooms: number; bathrooms: number; hasGarage: boolean;
  coveredArea: number; totalArea: number; age: number;
  creditEligible: boolean; petsAllowed: boolean; immediateAvailability: boolean;
  marketingTag: MarketingTag; featured: boolean; dealStatus: DealStatus;
  services: { water: boolean; naturalGas: boolean; sewer: boolean; electricity: boolean; internet: boolean };
  publishedAt: Date | null;          // firstPublishedAt
}
export function toPublicProperty(p: Property): PublicPropertyResponse;
export interface Paginated<T> { items: T[]; total: number; } // src/common/interfaces/paginated.interface.ts
```

`id` is exposed because feature 8 (leads) will reference properties from the public site.

### Audit actions (added to `src/audit/enums/audit-action.enum.ts`)

| Enum key | Value | entityType | metadata |
|---|---|---|---|
| `NEIGHBORHOOD_CREATED` | `neighborhood.created` | `neighborhood` | `{ name, slug }` |
| `PROPERTY_CREATED` | `property.created` | `property` | `{ code, title }` |
| `PROPERTY_UPDATED` | `property.updated` | `property` | `{ code, changedFields }` |
| `PROPERTY_PUBLISHED` | `property.published` | `property` | `{ code, from, firstPublish }` |
| `PROPERTY_ARCHIVED` | `property.archived` | `property` | `{ code, from }` |
| `PROPERTY_UNPUBLISHED` | `property.unpublished` | `property` | `{ code, from }` |
| `PROPERTY_DEAL_STATUS_CHANGED` | `property.deal_status_changed` | `property` | `{ code, from, to }` |
| `PROPERTY_DELETED` | `property.deleted` | `property` | `{ code, title }` |

`record()` is awaited after the successful mutation, same as `UsersService`. All values fit `varchar(50)`.

### Error mapping

| Condition | Exception | Status |
|---|---|---|
| DTO validation, unknown/forbidden field (`slug`, `code`, `publicationStatus` in body) | ValidationPipe | 400 |
| Price filter or price sort without `currency`; `priceMax < priceMin` | ValidationPipe (DTO) / `BadRequestException` (builder) | 400 |
| Invalid publication transition or same-state | `BadRequestException` | 400 |
| Same `dealStatus` | `BadRequestException` | 400 |
| `neighborhoodId` does not exist (create/update) | `BadRequestException('Neighborhood not found')` | 400 |
| Duplicate neighborhood (slug pre-check or `23505`) | `BadRequestException` | 400 |
| Hard delete of a property with `firstPublishedAt` set | `BadRequestException` | 400 |
| Invalid UUID path param | `ParseUUIDPipe` | 400 |
| No/invalid token | `AuthGuard('jwt')` | 401 |
| Role not allowed (`user`; `manager` on DELETE) | `UserRoleGuard` | 403 |
| Property id not found (admin) | `NotFoundException('Property not found')` | 404 |
| Slug not found or not `published` (public) | `NotFoundException` | 404 |

## File Changes

| File | Action | Description |
|---|---|---|
| `src/common/utils/slugify.ts` (+ `.spec.ts`) | Create | Accent-folding slug helper |
| `src/common/transformers/numeric.transformer.ts` (+ `.spec.ts`) | Create | `numeric` string <-> number |
| `src/common/interfaces/paginated.interface.ts` | Create | `Paginated<T>` |
| `src/migrations/1790500000000-CreateNeighborhoods.ts` | Create | Table + 48 barrios, exported `CABA_NEIGHBORHOODS` |
| `src/migrations/1790500000001-CreateProperties.ts` | Create | Enum types, sequence, table, FK, indexes |
| `src/neighborhoods/neighborhoods.module.ts` | Create | `TypeOrmModule.forFeature([Neighborhood])`, imports `AuthModule`, `AuditModule`; exports service + TypeOrmModule |
| `src/neighborhoods/neighborhoods.controller.ts` | Create | `GET` public, `POST` `@Auth(admin, manager)` |
| `src/neighborhoods/neighborhoods.service.ts` (+ `.spec.ts`) | Create | `findAll`, `create` (uniqueness, audit), `findById` for properties |
| `src/neighborhoods/entities/neighborhood.entity.ts` | Create | Entity |
| `src/neighborhoods/dto/create-neighborhood.dto.ts`, `dto/index.ts` | Create | DTO |
| `src/neighborhoods/caba-neighborhoods.spec.ts` | Create | 48 entries, unique names/slugs, `slug === slugify(name)` |
| `src/properties/properties.module.ts` | Create | Imports `TypeOrmModule.forFeature([Property])`, `NeighborhoodsModule`, `AuthModule`, `AuditModule` |
| `src/properties/enums/property.enums.ts` | Create | `Operation`, `PropertyType`, `Currency`, `PublicationStatus`, `DealStatus`, `MarketingTag` |
| `src/properties/entities/property.entity.ts` | Create | Entity (table above) |
| `src/properties/controllers/admin-properties.controller.ts` (+ `.spec.ts` for role metadata) | Create | Admin routes |
| `src/properties/controllers/public-properties.controller.ts` (+ `.spec.ts` for no-guard metadata) | Create | Public routes |
| `src/properties/services/properties.service.ts` (+ `.spec.ts`) | Create | CRUD, lifecycle, deal status, delete, audit |
| `src/properties/services/public-properties.service.ts` (+ `.spec.ts`) | Create | List/detail of published |
| `src/properties/dto/*.ts` | Create | `create-property`, `update-property`, `update-deal-status`, `admin-property-filters`, `public-property-filters`, `index` |
| `src/properties/dto/validators/price-filter.validators.ts` (+ `.spec.ts`) | Create | `@RequiresCurrency`, `@IsGreaterThanOrEqualTo` |
| `src/properties/helpers/property-identifiers.ts` (+ `.spec.ts`) | Create | Code and slug |
| `src/properties/helpers/property-lifecycle.ts` (+ `.spec.ts`) | Create | Transition matrix |
| `src/properties/helpers/property-query.builder.ts` (+ `.spec.ts`) | Create | Public and admin query specs |
| `src/properties/helpers/public-property.mapper.ts` (+ `.spec.ts`) | Create | Public projection |
| `src/audit/enums/audit-action.enum.ts` | Modify | Additive values (table above) |
| `src/app.module.ts` | Modify | Register `NeighborhoodsModule`, `PropertiesModule` |
| `src/migrations/1751500000000-InitSchema.ts` | Untouched | Never edited |

## Testing Strategy

Strict TDD: each unit starts with a failing spec (RED) run through `npm test`, then minimal code (GREEN), then refactor. Unit-only, no DB, no HTTP, consistent with `openspec/config.yaml` (`integration: false`, `e2e: false`).

| Layer | What to test | Approach |
|---|---|---|
| Pure | `slugify` (accents, ñ, punctuation, repeated separators, trimming) | table-driven cases |
| Pure | `CABA_NEIGHBORHOODS` (exactly 48, unique names and slugs, slug equals `slugify(name)`) | import constant from the migration file |
| Pure | `formatPropertyCode`, `buildPropertySlug` (truncation at 80, code suffix) | direct calls |
| Pure | `assertPublicationTransition`: all 9 from x action combinations | `it.each` over the matrix |
| Pure | `buildPublicPropertyQuery`: forced `published`, each filter clause, currency scoping, 400 without currency for `priceMin`/`priceMax`/price sorts, `priceMax < priceMin`, sort orders + tiebreaker, defaults | assert on returned spec |
| Pure | `buildAdminPropertyQuery`: filters, `q` escaping, defaults | assert on spec |
| Pure | `toPublicProperty`: `address` null when `showExactAddress=false`, present when true, internal fields absent, services grouping, numbers | direct |
| DTO | `PublicPropertyFiltersDto` currency rule, numeric/boolean coercion, `forbidNonWhitelisted`-relevant fields; `CreatePropertyDto` key constraints | `plainToInstance` + `validate` |
| Transformer | `numericTransformer` from/to, null passthrough | direct |
| Service | `NeighborhoodsService.create` duplicate slug -> 400, `23505` -> 400, audit call; `findAll` order | mocked repository via `getRepositoryToken` |
| Service | `PropertiesService.create` (nextval query, code/slug, missing neighborhood 400, audit), `update` (slug regenerated only pre-publish, no-op without changes, audit `changedFields`), `publish` (first publish sets date once), `archive`, `unpublish`, `updateDealStatus`, `remove` (ever-published 400, audit), `findOne` 404 | mocked repositories + `AuditLogService` mock; assert `record()` per mutation |
| Service | `PublicPropertiesService.findAll` applies spec and returns `{ items, total }` mapped; `findBySlug` 404 | chainable query-builder mock (`andWhere`, `orderBy`, `addOrderBy`, `take`, `skip`, `innerJoinAndSelect` return `this`; `getManyAndCount` resolves) |
| Controller metadata | DELETE handler roles `['admin']`; admin class roles `['admin','manager']`; public controller has no guards | `Reflect.getMetadata(META_ROLES, ...)` / `'__guards__'` |
| Integration / E2E | Not in scope (no infrastructure). Migrations verified manually: `migration:run` on an empty DB and on current schema, `migration:revert` twice | manual, recorded in verify |

Quality gates per slice: `npm test`, `npm run lint`, `npx tsc -p tsconfig.build.json --noEmit`, `npm run build`.

## Threat Matrix

N/A: no routing-to-shell, shell command, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. (HTTP authorization and data-exposure risks are covered above by the guard metadata tests and the public mapper tests.)

## Migration / Rollout

1. Deploy runs both migrations automatically (`migrationsRun: true`). Take an ad-hoc `pg_dump` before the first production deploy.
2. Rollback order: `npm run migration:revert` twice (properties, then neighborhoods) BEFORE deploying reverted code. Reverting properties drops all property rows, the sequence, and the six enum types.
3. `DB_SYNCHRONIZE` must remain off; entity metadata (enum names, column types, `numeric` precision) mirrors the migration so a local synchronize run would not diverge, but migrations remain the source of truth.

## PR Slice Plan

Aligned with the proposal's 5-slice forecast; slices 3 and 5 are split to stay near 400 authored changed lines (tests included). Each slice leaves `npm test`, lint, typecheck and build green.

| Slice | Content | Est. lines | Note |
|---|---|---|---|
| 1 | `slugify` + spec; neighborhoods migration (48 rows) + catalog spec; entity, DTO, service + spec, controller, module; `NEIGHBORHOOD_CREATED`; `app.module` | ~400-440 | May slightly exceed 400 because of the 48-row data table; data is low review cost |
| 2 | Property enums, `numericTransformer` + spec, properties migration, `Property` entity, `PropertiesModule` skeleton registered in `app.module` | ~380-420 | Mostly declarative |
| 3a | `property-identifiers` + spec, create/update DTOs, `PropertiesService.create/update/findOne` + spec, admin controller (create/get/update), `PROPERTY_CREATED/UPDATED`, `Paginated<T>` | ~400-450 | Borderline |
| 3b | `AdminPropertyFiltersDto`, `buildAdminPropertyQuery` + spec, `findAll` + spec, admin `GET` list | ~220-260 | |
| 4 | `property-lifecycle` + spec, publish/archive/unpublish/deal-status/remove in service + spec, controller routes incl. `@RoleProtected(admin)` + metadata spec, remaining `PROPERTY_*` actions | ~380-420 | |
| 5a | `PublicPropertyFiltersDto` + validators + specs, `buildPublicPropertyQuery` + spec | ~380-420 | |
| 5b | `toPublicProperty` + spec, `PublicPropertiesService` + spec, public controller + metadata spec | ~280-330 | |

Total ~2,450-2,700 (slightly above the proposal's forecast because of the split test files). Slices 1 and 3a may exceed 400 by a small margin; `sdd-tasks` should either trim (for example, move `Paginated<T>` to 3b) or record a `size:exception`.

## Open Questions

- [ ] Throttling of public endpoints: the global `ThrottlerGuard` allows 20 req/min per client IP. If the Next.js front fetches server-side (single IP) or the API sits behind a reverse proxy without `trust proxy`, the public catalog will be throttled for all visitors. Not blocking for this change; must be decided before feature 6 (options: `@Throttle` override on public controllers, `@SkipThrottle`, or `trust proxy` configuration).
- [ ] Public filter query parameter names are now aligned with the spec (`priceMin`/`priceMax` replace the earlier `pmin`/`pmax` draft). The public `featured` filter in `PublicPropertyFiltersDto` is NOT part of the spec's Public Listing Filters requirement; whether the public catalog should expose a `featured` toggle is an open product decision, not resolved by this reconciliation. Until decided, `sdd-tasks`/`sdd-apply` MUST NOT implement the public `featured` filter as part of this change's public contract.
- [ ] Barrio display spellings (`La Boca`, `La Paternal`, `Monserrat`) need a human review against the GCBA dataset before slice 1 merges.
- [ ] Whether `sold` should only be allowed for `sale` and `rented` only for `rent` (currently not enforced).
