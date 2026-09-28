# Neighborhoods Specification

## Purpose

Reference catalog of CABA (Ciudad Autónoma de Buenos Aires) neighborhoods ("barrios") used by the properties domain for filtering and for tagging each property's location. The catalog is preloaded via migration with the 48 official CABA barrios, is publicly readable, and can be extended by staff.

## Requirements

### Requirement: Neighborhood Catalog Seeding

The system MUST ensure the `neighborhoods` table contains the 48 official CABA barrios immediately after the neighborhoods migration runs, independent of the `RUN_SEED` environment flag and independent of the `SeedService` idempotency mechanism (`seed_history`).

#### Scenario: Migration runs on an empty database

- GIVEN an empty database with no rows in `neighborhoods`
- WHEN the neighborhoods migration executes
- THEN the `neighborhoods` table contains exactly 48 rows, one per official CABA barrio
- AND this insertion happens whether or not the `RUN_SEED` environment variable is set

#### Scenario: Migration does not duplicate rows on repeated deploys

- GIVEN the neighborhoods migration has already run once against the target database
- WHEN the application is deployed again without reverting the migration
- THEN the migration MUST NOT execute a second time (standard TypeORM migration tracking)
- AND the `neighborhoods` table still contains the 48 barrios exactly once each

### Requirement: Public Neighborhood Listing

The system MUST expose an unauthenticated (public) endpoint that lists all neighborhoods currently in the catalog.

#### Scenario: Anonymous caller lists neighborhoods

- GIVEN no Authorization header is sent
- WHEN the caller requests the public neighborhoods listing endpoint
- THEN the response is `200 OK`
- AND the response body contains every neighborhood currently in the `neighborhoods` table, including at minimum its id and name

#### Scenario: Newly created neighborhood appears in the public listing

- GIVEN an admin has created a new neighborhood named "Villa Devoto Norte" that did not previously exist
- WHEN any caller (authenticated or not) requests the public neighborhoods listing endpoint
- THEN "Villa Devoto Norte" is included in the response

### Requirement: Neighborhood Creation

The system MUST allow callers authenticated with role `admin` or `manager` to create a new neighborhood by name, and MUST reject the same request from a caller with role `user` or from an unauthenticated caller.

DTO validation (class-validator, matching the codebase's existing `class-validator`/`class-transformer` convention): the create-neighborhood DTO's `name` field is REQUIRED, MUST be a non-empty string, and MUST be trimmed/normalized (e.g. via `@Transform`) before the uniqueness check runs.

#### Scenario: Admin creates a new neighborhood

- GIVEN a caller authenticated as `admin`
- WHEN they submit a create-neighborhood request with a `name` not already present in the catalog
- THEN the response is `201 Created` and includes the new neighborhood's id and name
- AND an audit log entry is recorded via `AuditLogService.record()` with action `NEIGHBORHOOD_CREATED`, the actor, and the new neighborhood's id

#### Scenario: Manager creates a new neighborhood

- GIVEN a caller authenticated as `manager`
- WHEN they submit a create-neighborhood request with a `name` not already present in the catalog
- THEN the response is `201 Created`
- AND an audit log entry is recorded with action `NEIGHBORHOOD_CREATED`

#### Scenario: User role is forbidden from creating a neighborhood

- GIVEN a caller authenticated as `user`
- WHEN they submit a create-neighborhood request
- THEN the response is `403 Forbidden`
- AND no neighborhood is created and no audit entry is recorded

#### Scenario: Anonymous caller is unauthorized

- GIVEN no Authorization header is sent
- WHEN the caller submits a create-neighborhood request
- THEN the response is `401 Unauthorized`
- AND no neighborhood is created

### Requirement: Neighborhood Name Uniqueness

The system MUST reject creation of a neighborhood whose name already exists in the catalog, without inserting a duplicate row.

#### Scenario: Duplicate name is rejected

- GIVEN a neighborhood named "Palermo" already exists in the catalog
- WHEN an admin submits a create-neighborhood request with `name` "Palermo"
- THEN the response is `400 Bad Request`
- AND no new row is inserted into `neighborhoods`
- AND no audit entry is recorded for this rejected attempt
