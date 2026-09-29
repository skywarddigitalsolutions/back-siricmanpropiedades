# Property Management Specification

## Purpose

Defines the `properties` entity, its identifiers, the admin/manager CRUD surface, the publication and deal-status lifecycles, archive-as-soft-delete, admin-only hard delete for never-published properties, and audit logging for every mutation. This is the authenticated management surface; the unauthenticated read surface is defined in `property-public-catalog`, and the neighborhood reference data is defined in `neighborhoods`.

## Requirements

### Requirement: Property Identifiers

The system MUST assign each property a UUID primary key generated at creation, a human-readable sequential `code` in the format `SP-<n>` generated from a database sequence at creation, and an SEO `slug` derived from the property's `title` at creation.

The `code` MUST be unique, MUST be assigned exactly once per property, and MUST NOT change afterward. The `slug` MUST be regenerated whenever `title` changes while the property has never been published, and MUST become immutable once `firstPublishedAt` is set.

#### Scenario: New properties receive distinct sequential codes

- GIVEN two properties are created one after the other
- WHEN both creations succeed
- THEN each receives a distinct `code` matching the pattern `SP-<n>`
- AND the second property's `n` is greater than the first property's `n`

#### Scenario: Slug is derived from title before first publish

- GIVEN a draft property titled "Departamento 2 ambientes en Palermo" that has never been published (`firstPublishedAt` is null)
- WHEN its `title` is updated to "Departamento a estrenar en Palermo"
- THEN the `slug` MUST be regenerated to reflect the new title
- AND if the derived slug collides with another property's slug, a uniqueness suffix MUST be appended

#### Scenario: Slug is frozen after first publish

- GIVEN a property that has been published at least once (`firstPublishedAt` is set)
- WHEN its `title` is updated
- THEN the `slug` MUST NOT change

### Requirement: Property Field Schema and Validation

The system MUST persist, for every property, the fields described in the proposal: `operation` (`sale|rent`), `type` (`apartment|house|ph|land|commercial|office|garage`), `title`, `description`, a `neighborhood` foreign key, `address` plus `showExactAddress` (boolean), `currency` (`USD|ARS`), `price`, `expenses` (nullable), `rooms`, `bedrooms`, `bathrooms`, `hasGarage` (boolean), `coveredArea`, `totalArea`, `age` (integer, `0` meaning brand new), `creditEligible` (boolean), `petsAllowed` (boolean), `immediateAvailability` (boolean), `marketingTag` (`new|opportunity|none`), `featured` (boolean), and five fixed service booleans: `water`, `naturalGas`, `sewer`, `electricity`, `internet`.

DTO validation (class-validator/class-transformer, matching the codebase's existing convention): every enum field (`operation`, `type`, `currency`, `marketingTag`) MUST be restricted to its declared allowed values; every numeric field (`price`, `expenses`, `rooms`, `bedrooms`, `bathrooms`, `coveredArea`, `totalArea`, `age`) MUST be validated as a non-negative number and normalized via `@Transform`; every boolean field MUST be validated as boolean and normalized via `@Transform`. The create-property DTO MUST require at least `operation`, `type`, `title`, the `neighborhood` reference, `currency`, and `price`; all other schema fields not listed as required here MAY be optional at creation, with the exact optional/required split for the remaining fields finalized in design.

#### Scenario: Creation rejects an invalid enum value

- GIVEN a create-property request whose `operation` field is `"lease"` (not `sale` or `rent`)
- WHEN the request is submitted
- THEN the response is `400 Bad Request`
- AND no property is created

#### Scenario: Creation rejects a missing required field

- GIVEN a create-property request that omits `price`
- WHEN the request is submitted
- THEN the response is `400 Bad Request`
- AND no property is created

#### Scenario: Creation rejects a negative numeric field

- GIVEN a create-property request whose `totalArea` is `-10`
- WHEN the request is submitted
- THEN the response is `400 Bad Request`
- AND no property is created

### Requirement: Property Creation

The system MUST allow callers with role `admin` or `manager` to create a new property, and MUST reject the same request from a `user` role or an unauthenticated caller. A newly created property MUST start with `publicationStatus = draft`, `dealStatus = available`, and `firstPublishedAt = null`.

#### Scenario: Admin or manager creates a draft property

- GIVEN a caller authenticated as `admin` or as `manager`
- WHEN they submit a valid create-property request
- THEN the response is `201 Created`
- AND the created property has `publicationStatus = draft`, `dealStatus = available`, and `firstPublishedAt = null`
- AND an audit log entry is recorded via `AuditLogService.record()` with action `PROPERTY_CREATED`, the actor, and the new property's id

#### Scenario: User role and anonymous callers are rejected

- GIVEN a caller authenticated as `user`, or a caller with no Authorization header
- WHEN they submit a create-property request
- THEN the response is `403 Forbidden` for the `user` role and `401 Unauthorized` for the anonymous caller
- AND no property is created and no audit entry is recorded

### Requirement: Property Update

The system MUST allow callers with role `admin` or `manager` to update an existing property's editable fields, and MUST reject the same request from a `user` role or an unauthenticated caller. `code` MUST NOT be directly settable through the update request; `slug` MUST NOT be directly settable through the update request (it is only ever derived per the Property Identifiers requirement).

An update request MAY change the property's neighborhood by submitting `neighborhoodId`, using the same rule as Property Creation: if the submitted `neighborhoodId` differs from the property's current neighborhood, the system MUST look it up and, if no neighborhood exists with that id, MUST reject the request with `400 Bad Request` without saving any change or recording an audit entry. If the submitted `neighborhoodId` matches the property's current neighborhood, it MUST be treated as unchanged (a no-op for that field).

#### Scenario: Admin or manager updates a property

- GIVEN a caller authenticated as `admin` or as `manager` and an existing property
- WHEN they submit a valid update request changing one or more editable fields
- THEN the response is `200 OK` with the updated property
- AND an audit log entry is recorded with action `PROPERTY_UPDATED`, the actor, and the property's id

#### Scenario: Update ignores an attempt to set `code` or `slug` directly

- GIVEN an existing property with `code = "SP-42"` and `slug = "casa-en-belgrano"`
- WHEN an admin submits an update request that includes `code: "SP-999"` and `slug: "otra-cosa"`
- THEN the response is `200 OK`
- AND the property's `code` remains `"SP-42"` and its `slug` is unaffected by the submitted values (still governed by the Property Identifiers requirement)

#### Scenario: Update on a nonexistent property returns 404

- GIVEN no property exists with id `00000000-0000-0000-0000-000000000000`
- WHEN an admin submits an update request for that id
- THEN the response is `404 Not Found`

#### Scenario: Update changes the property's neighborhood to an existing one

- GIVEN an existing property currently assigned to neighborhood "Palermo"
- WHEN an admin submits an update request with `neighborhoodId` set to the id of an existing neighborhood "Belgrano"
- THEN the response is `200 OK` with the property now assigned to "Belgrano"
- AND an audit log entry is recorded with action `PROPERTY_UPDATED` whose metadata's `changedFields` includes `neighborhoodId`

#### Scenario: Update rejects a change to a nonexistent neighborhood

- GIVEN an existing property
- WHEN an admin submits an update request with `neighborhoodId` set to an id that does not match any neighborhood
- THEN the response is `400 Bad Request`
- AND the property's neighborhood is not changed
- AND no audit entry is recorded

### Requirement: Property Retrieval by Id (Admin)

The system MUST allow callers with role `admin` or `manager` to retrieve any single property by id regardless of its `publicationStatus`, and MUST reject the same request from a `user` role or an unauthenticated caller. The response MUST include the property's images in ascending `position` order, each exposing its `large` and `thumb` URLs; a property with no images MUST return an empty images array.

(Previously: the response did not include any image data.)

#### Scenario: Admin retrieves a draft property by id

- GIVEN a property with `publicationStatus = draft`
- WHEN an admin requests it by id via the admin retrieval endpoint
- THEN the response is `200 OK` with the full property record

#### Scenario: Retrieval of a nonexistent property returns 404

- GIVEN no property exists with the requested id
- WHEN an admin requests it by id
- THEN the response is `404 Not Found`

#### Scenario: Admin retrieval includes the ordered images

- GIVEN a property with three images at positions 0, 1, and 2
- WHEN an admin requests it by id via the admin retrieval endpoint
- THEN the response's images array is ordered ascending by `position`
- AND each entry exposes its `large` and `thumb` URLs

#### Scenario: Admin retrieval of a property with no images returns an empty array

- GIVEN a property with no images
- WHEN an admin requests it by id via the admin retrieval endpoint
- THEN the response's images array is empty

### Requirement: Property Listing (Admin)

The system MUST allow callers with role `admin` or `manager` to list properties across every `publicationStatus` (draft, published, and archived), and MUST support filtering the list by at least `publicationStatus`. The system MUST reject the same request from a `user` role or an unauthenticated caller.

#### Scenario: Admin lists properties of every publication status

- GIVEN the database contains properties with `publicationStatus` of `draft`, `published`, and `archived`
- WHEN an admin requests the admin listing endpoint with no `publicationStatus` filter
- THEN the response includes properties of all three statuses

#### Scenario: Admin filters the list by publication status

- GIVEN the database contains both `draft` and `published` properties
- WHEN an admin requests the admin listing endpoint filtered to `publicationStatus = draft`
- THEN the response includes only `draft` properties

### Requirement: Publication Status Transitions

The system MUST expose three distinct publication actions — `publish`, `archive`, and `unpublish` — restricted to callers with role `admin` or `manager`, and MUST enforce exactly the following transition matrix:

| Action | Allowed from | Result |
|---|---|---|
| `publish` | `draft` | `publicationStatus = published`; if `firstPublishedAt` is null, set it to now (this also freezes the slug from this point forward) |
| `publish` | `archived` | `publicationStatus = published` (re-publish); `firstPublishedAt` is left unchanged (it was already set on first publish) |
| `archive` | `draft` | `publicationStatus = archived`; `firstPublishedAt` is left unchanged (still null if the property was never published) |
| `archive` | `published` | `publicationStatus = archived` (the soft delete) |
| `unpublish` | `published` | `publicationStatus = draft`; `firstPublishedAt` MUST NOT be cleared, so the slug remains frozen and hard-delete eligibility (see Hard Delete) remains blocked |
| `unpublish` | `archived` | `publicationStatus = draft`; `firstPublishedAt` MUST NOT be cleared, so the slug remains frozen and hard-delete eligibility (see Hard Delete) remains blocked |

Any action requested from a status not listed as an allowed source for that action (for example, `publish` on an already-`published` property, `archive` on an already-`archived` property, or `unpublish` on a `draft` property) MUST be rejected with `400 Bad Request` and MUST NOT change the property's state.

#### Scenario: Publishing a draft property for the first time

- GIVEN a draft property with `firstPublishedAt = null`
- WHEN an admin invokes `publish`
- THEN `publicationStatus` becomes `published`
- AND `firstPublishedAt` is set to the current time
- AND the property's `slug` becomes frozen from this point forward
- AND an audit log entry is recorded with action `PROPERTY_PUBLISHED`

#### Scenario: Re-publishing an archived property

- GIVEN an archived property whose `firstPublishedAt` was set during an earlier first publish
- WHEN an admin invokes `publish`
- THEN `publicationStatus` becomes `published`
- AND `firstPublishedAt` is unchanged
- AND an audit log entry is recorded with action `PROPERTY_PUBLISHED`

#### Scenario: Archiving a draft property

- GIVEN a draft property that has never been published (`firstPublishedAt = null`)
- WHEN an admin invokes `archive`
- THEN `publicationStatus` becomes `archived`
- AND `firstPublishedAt` remains `null`
- AND an audit log entry is recorded with action `PROPERTY_ARCHIVED`

#### Scenario: Archiving a published property

- GIVEN a published property
- WHEN an admin invokes `archive`
- THEN `publicationStatus` becomes `archived`
- AND an audit log entry is recorded with action `PROPERTY_ARCHIVED`
- AND the property immediately stops appearing in the public catalog

#### Scenario: Unpublishing a published property directly to draft

- GIVEN a published property whose `firstPublishedAt` is set
- WHEN an admin invokes `unpublish`
- THEN `publicationStatus` becomes `draft`
- AND `firstPublishedAt` remains set (unchanged)
- AND an audit log entry is recorded with action `PROPERTY_UNPUBLISHED`
- AND the property immediately stops appearing in the public catalog

#### Scenario: Unpublishing an archived property back to draft

- GIVEN an archived property whose `firstPublishedAt` is set
- WHEN an admin invokes `unpublish`
- THEN `publicationStatus` becomes `draft`
- AND `firstPublishedAt` remains set (unchanged)
- AND an audit log entry is recorded with action `PROPERTY_UNPUBLISHED`

#### Scenario: Invalid transitions are rejected

- GIVEN a draft property (`publicationStatus = draft`)
- WHEN an admin invokes `unpublish` on it
- THEN the response is `400 Bad Request`
- AND the property's `publicationStatus` does not change
- AND no audit entry is recorded

#### Scenario: Publishing an already-published property is rejected

- GIVEN a published property
- WHEN an admin invokes `publish` on it again
- THEN the response is `400 Bad Request`
- AND the property's state does not change

### Requirement: Deal Status Update

The system MUST allow callers with role `admin` or `manager` to set a property's `dealStatus` to one of `available`, `reserved`, `sold`, or `rented`, independent of the property's current `publicationStatus`.

#### Scenario: Admin marks a published property as reserved

- GIVEN a published property with `dealStatus = available`
- WHEN an admin sets `dealStatus = reserved`
- THEN the response is `200 OK` with `dealStatus = reserved`
- AND an audit log entry is recorded with action `PROPERTY_DEAL_STATUS_CHANGED`

#### Scenario: Deal status update rejects an invalid value

- GIVEN an existing property
- WHEN an admin submits a deal status update with value `"pending"` (not one of the four allowed values)
- THEN the response is `400 Bad Request`
- AND the property's `dealStatus` does not change

### Requirement: Hard Delete of Never-Published Properties

The system MUST allow only callers with role `admin` (not `manager`) to permanently delete a property, and only when that property has never been published (`firstPublishedAt` is null). The system MUST reject a hard-delete request for any property whose `firstPublishedAt` is set. Hard-deleting a property MUST also delete all of its image rows and MUST attempt to delete their rendition files (see `property-images`'s Property Deletion Cascade for Images requirement); a file-deletion failure MUST be logged and MUST NOT block the property's deletion.

(Previously: hard delete removed only the property row; it did not address image rows or files.)

#### Scenario: Admin hard-deletes a never-published draft property

- GIVEN a draft property with `firstPublishedAt = null`
- WHEN an admin submits a hard-delete request for it
- THEN the response confirms deletion and the property no longer exists in the database
- AND an audit log entry is recorded with action `PROPERTY_DELETED`, the actor, and the deleted property's id

#### Scenario: Manager cannot hard-delete

- GIVEN a draft property with `firstPublishedAt = null`
- WHEN a caller authenticated as `manager` submits a hard-delete request for it
- THEN the response is `403 Forbidden`
- AND the property still exists

#### Scenario: Hard delete is rejected for any property that was ever published

- GIVEN a property whose `firstPublishedAt` is set (whether currently `published`, `archived`, or unpublished back to `draft`)
- WHEN an admin submits a hard-delete request for it
- THEN the response is `400 Bad Request`
- AND the property is not deleted
- AND no audit entry is recorded for this rejected attempt

#### Scenario: Hard delete removes the property's image rows and files

- GIVEN a never-published draft property with two images
- WHEN an admin hard-deletes it
- THEN the property row, its image rows, and both images' rendition files are all removed

### Requirement: Audit Logging of Mutations

The system MUST call `AuditLogService.record()` after every successful property mutation — creation, update, each publication transition (`publish`, `archive`, `unpublish`), deal status change, and hard delete — with the actor, the corresponding `PROPERTY_*` audit action, the entity type, and the property's id. A failure inside `AuditLogService.record()` MUST NOT cause the triggering mutation to fail or roll back, consistent with the existing audit logging behavior elsewhere in the codebase. Image uploads, reorders, and deletes also call `AuditLogService.record()` with entity type `property` and the property's id, using the `PROPERTY_IMAGE_UPLOADED`, `PROPERTY_IMAGE_REORDERED`, and `PROPERTY_IMAGE_DELETED` actions; those actions and their scenarios are defined in `property-images`'s Audit Logging of Image Mutations requirement.

(Previously: did not reference the `PROPERTY_IMAGE_*` audit actions defined by `property-images`.)

#### Scenario: Every mutation type produces exactly one matching audit entry

- GIVEN a property going through creation, an update, a `publish` transition, an `archive` transition, an `unpublish` transition, a deal status change, and (once eligible) a hard delete
- WHEN each of those operations succeeds
- THEN each operation produces exactly one audit log entry with the action matching that operation (`PROPERTY_CREATED`, `PROPERTY_UPDATED`, `PROPERTY_PUBLISHED`, `PROPERTY_ARCHIVED`, `PROPERTY_UNPUBLISHED`, `PROPERTY_DEAL_STATUS_CHANGED`, `PROPERTY_DELETED`)

#### Scenario: Audit failure does not block the mutation

- GIVEN `AuditLogService.record()` throws or fails internally for any reason
- WHEN an otherwise-valid property mutation is performed
- THEN the mutation still succeeds and its response is unaffected by the audit failure
