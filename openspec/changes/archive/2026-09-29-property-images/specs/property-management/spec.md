# Delta for Property Management

## MODIFIED Requirements

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
