# Exploration: Properties domain (back)

Entity, migrations, admin CRUD, public listing with filters.

## Settled product decisions

1. Neighborhoods: `neighborhoods` table seeded with the 48 official CABA barrios; properties reference it by FK; admins can also create new neighborhoods.
2. Prices: amount + currency (USD | ARS). No currency conversion. Sorting and price-range filtering happen within one currency.

## Current State

Greenfield feature: no `properties`/`neighborhoods` module exists yet. The repo has one migration (`src/migrations/1751500000000-InitSchema.ts`) creating `roles`, `users`, `user_roles`, `seed_history`, `revoked_tokens`, `audit_logs`, `mfa_backup_codes`.

Conventions observed:

- **Module layout**: `src/<domain>/{module.ts, controller.ts, service.ts, dto/, entities/}`. Entities use uuid PK (`uuid_generate_v4()`), explicit snake_case `@Column({name:'...'})`, `timestamp without time zone` with `default: () => 'now()'` (see `src/roles/entities/role.entity.ts`, `src/users/entities/user.entity.ts`).
- **Migrations**: raw SQL via `queryRunner.query`, one file per change named `<epoch>-<PascalName>.ts`, auto-run (`migrationsRun: true` in `app.module.ts`); `synchronize` is env-gated (`DB_SYNCHRONIZE`), off by default. `InitSchema` must never be edited; schema work is additive.
- **Auth/roles**: `@Auth(...ValidRoles[])` (`src/auth/decorators/auth.decorator.ts`) = `RoleProtected` + `UseGuards(AuthGuard('jwt'), UserRoleGuard)` + Swagger docs. `ValidRoles` = `admin | manager | user`. Every existing protected controller (`UsersController`, `RolesController`, `AuditLogController`) uses `@Auth(ValidRoles.admin)` only. `manager` exists in the seed and the `Auth()` JSDoc example but has no real usage.
- **DTOs**: `class-validator` + `class-transformer` + `@ApiProperty`, normalized via `@Transform` (see `src/users/dto/create-user.dto.ts`); global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform).
- **Pagination**: no shared abstraction. `UsersService.findAll` and `AuditLogService.findAll` build their own `createQueryBuilder`, apply conditional `.andWhere(...)`, `.take/.skip` only if provided, and return a plain array (no total count, no envelope).
- **Errors**: `NotFoundException`, `BadRequestException`, `ForbiddenException`. No custom global exception filter.
- **Audit**: `AuditLogService.record()` never throws; called after every sensitive mutation with `{actor, action, entityType, entityId, metadata}`. `AuditAction` (`src/audit/enums/audit-action.enum.ts`) is a flat string enum scoped to user/role/mfa actions.
- **Seed**: `SeedService` (`OnModuleInit`) runs once, gated by `RUN_SEED=true` + a `seed_history` idempotency row, upserts roles/users. The 48 barrios are functional reference data, a new kind of seed.
- **Soft delete**: no precedent. The only deactivation pattern is `User.isActive` toggled via `PATCH /:id/activate|deactivate`, audited, with a business-rule guard. No entity uses `@DeleteDateColumn`.
- **Testing**: 10 unit-only specs using `Test.createTestingModule` + hand-mocked repositories via `getRepositoryToken`. No integration/e2e, no test DB, no supertest.

## Public design mock fields

From `front-siricmanpropiedades/design/sitio-web-v2.dc.html` (grepped):

- Property: `code` (`SP-101`), operation (Venta | Alquiler), type (Departamento | Casa | PH | Terreno | Local | Oficina | Cochera), `title`, neighborhood, `address` + `exact` (show exact address vs approximate zone), currency (USD | ARS), `price`, expensas (0 = none), ambientes / dormitorios / baños, cochera (bool), m² cubiertos / totales, antigüedad (0 = a estrenar), apto crédito (bool), acepta mascotas (bool), disponibilidad inmediata (bool), services (fixed 5: Agua corriente, Gas natural, Cloacas, Luz, Internet), marketing tag (Nueva | Oportunidad | none), deal status (none | Reservada | Vendida | Alquilada), featured (bool), photos (feature 4).
- Public filters: operation, type, neighborhood, ambientes / dormitorios / baños as "N+", cochera / crédito / mascotas toggles, price min/max scoped to one currency (`fcur` toggle), minimum surface (any / 40+ / 70+ / 100+ m²), sort (newest | lowest price | highest price).
- The "Dirección y barrio" text input belongs to the Tasaciones form, out of scope.

## Affected Areas (all new)

- `src/properties/` — new module (entity, controller, service, dto/).
- `src/neighborhoods/` — lookup table module + seed of the 48 CABA barrios.
- `src/migrations/` — new additive migration(s).
- `src/seed/` — possibly extended for barrios.
- `src/audit/enums/audit-action.enum.ts` — `PROPERTY_*` actions if audited.
- `src/app.module.ts` — register new modules.

## Approaches

1. **Identifiers** — (A) human `code` only; (B) SEO `slug` only; (C) UUID PK + `code` + `slug`.
2. **Publication status** — (A) boolean `isPublished`; (B) enum draft/published/archived; (C) two axes: `publicationStatus` + `dealStatus` matching the mock.
3. **Soft delete** — (A) `@DeleteDateColumn` (new pattern); (B) `archived` status as soft delete, plus a narrow hard delete.
4. **Query strategy** — (A) per-service query builder returning arrays; (B) shared pagination DTO + filters DTO + `{ items, total }`.
5. **Services/amenities** — (A) `text[]`; (B) lookup + join table; (C) fixed boolean columns.
6. **Testing** — (A) existing mocked-repository convention; (B) same + extract filter assembly into a pure, unit-testable function.

## Recommendation

Leaning 1C, 2C, 3B, 4B, 5C (5B if admin-editable), 6B, pending open product questions.

## Risks

- No precedent for `manager` role usage.
- Address privacy (`exact` flag) is easy to drop.
- Price sort without a currency filter must not silently mix USD/ARS; make it explicit in the API contract.
- Additive-only migrations; barrio seed data accuracy is a data-quality risk.
- `AuditAction` extension easy to forget.
- `DB_SYNCHRONIZE` can cause local schema drift during development.

## Open product questions

1. Roles allowed to manage properties (admin only, or admin + manager; full CRUD or subset).
2. Publication status only, or also a separate deal status.
3. Archive as the only delete, or also a hard delete.
4. `code` in addition to `slug`; slug frozen after first publish or regenerated.
5. Services: fixed closed list or admin-editable catalog.
6. Audit property mutations.
7. Total count for public pagination.
8. Barrio seed via `SeedModule`/`RUN_SEED` or always-on.
