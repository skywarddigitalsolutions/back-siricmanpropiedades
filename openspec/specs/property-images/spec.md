# Property Images Specification

## Purpose

Defines image management for a property: upload validation and processing, storage through a storage port, ordering and cover semantics, deletion with file cleanup, admin/manager authorization, audit logging of image mutations, and the public URL scheme used to serve converted image files. This capability extends `property-management` (which exposes the ordered image list to admins and cascades deletion into image cleanup) and `property-public-catalog` (which exposes the cover image and gallery to anonymous callers).

## Requirements

### Requirement: Image Upload Authorization and Preconditions

The system MUST allow only callers with role `admin` or `manager` to upload an image to a property, and MUST reject the same request from a `user` role or an unauthenticated caller. The system MUST reject an upload request targeting a property id that does not exist, without writing any file or row.

#### Scenario: Admin or manager uploads an image to an existing property

- GIVEN a caller authenticated as `admin` or as `manager`, and an existing property
- WHEN they submit a valid image upload for that property
- THEN the response is `201 Created` with the new image, including its `large` and `thumb` URLs

#### Scenario: User role and anonymous callers are rejected

- GIVEN a caller authenticated as `user`, or a caller with no Authorization header
- WHEN they submit an image upload request
- THEN the response is `403 Forbidden` for the `user` role and `401 Unauthorized` for the anonymous caller
- AND no file or row is created

#### Scenario: Upload targeting a nonexistent property returns 404

- GIVEN no property exists with the requested id
- WHEN an admin submits an image upload for that id
- THEN the response is `404 Not Found`
- AND no file or row is created

### Requirement: Image Upload Validation

The system MUST accept exactly one file per upload request, submitted as multipart form data in the field `file`. The system MUST reject any file whose size exceeds 15 MB with `413 Payload Too Large`, without writing any file or row. The system MUST verify the file's real image content by decoding it (not by trusting the client-supplied `Content-Type` header) and MUST reject undecodable content or a decoded format outside `jpeg`, `png`, `webp` with `400 Bad Request`, without writing any file or row. The system MUST reject an upload for a property that already has 30 images with `400 Bad Request`, without writing any file or row.

#### Scenario: Oversized file is rejected

- GIVEN a file larger than 15 MB
- WHEN it is submitted as an image upload
- THEN the response is `413 Payload Too Large`
- AND no file or row is created

#### Scenario: Non-image content is rejected regardless of the declared Content-Type

- GIVEN a file whose bytes do not decode as an image, sent with `Content-Type: image/jpeg`
- WHEN it is submitted as an image upload
- THEN the response is `400 Bad Request`
- AND no file or row is created

#### Scenario: An unsupported but valid image format is rejected

- GIVEN a valid GIF file
- WHEN it is submitted as an image upload
- THEN the response is `400 Bad Request`
- AND no file or row is created

#### Scenario: The 31st image on a property is rejected

- GIVEN a property that already has 30 images
- WHEN a valid jpeg is submitted as an image upload for that property
- THEN the response is `400 Bad Request`
- AND the property still has exactly 30 images
- AND no file is written

#### Scenario: Each supported format is accepted within the cap

- GIVEN a property with fewer than 30 images
- WHEN a valid jpeg, png, or webp file up to 15 MB is submitted
- THEN the response is `201 Created` with the new image

### Requirement: Image Processing and Renditions

Upon accepting a valid upload, the system MUST auto-orient the image according to its embedded orientation, MUST strip all EXIF/GPS and other metadata from both renditions, MUST normalize color to sRGB, and MUST produce exactly two WebP renditions: `large` (max width 1920 px) and `thumb` (max width 480 px). Neither rendition MUST upscale an image narrower than its target max width; the produced width MUST equal the minimum of the original width and the target max width. The system MUST enforce a maximum decodable input-pixel count and MUST reject any file exceeding it with `400 Bad Request` (decompression-bomb guard), without writing any file or row.

#### Scenario: A rotated JPEG is auto-oriented before renditions are generated

- GIVEN a JPEG with an EXIF orientation tag indicating a 90-degree rotation
- WHEN it is uploaded
- THEN both produced renditions are visually upright, matching the intended orientation

#### Scenario: Renditions contain no EXIF or GPS metadata

- GIVEN a JPEG with EXIF GPS coordinates embedded
- WHEN it is uploaded and converted
- THEN neither the `large` nor the `thumb` rendition file contains EXIF or GPS metadata

#### Scenario: A narrow source image is not upscaled

- GIVEN a source image 300 px wide
- WHEN it is uploaded
- THEN the `thumb` rendition width equals 300 px, not 480 px
- AND the `large` rendition width equals 300 px, not 1920 px

#### Scenario: A file exceeding the decodable-pixel limit is rejected

- GIVEN a file whose decoded pixel dimensions exceed the configured input-pixel limit
- WHEN it is submitted as an image upload
- THEN the response is `400 Bad Request`
- AND no file or row is created

### Requirement: Image Storage and Upload Compensation

The system MUST persist each rendition through a storage port using a storage key that is relative and adapter-agnostic, grouped under the owning property's id, and MUST generate a new random identifier for every uploaded image so that no two images — including a re-upload of the same photo — share a storage key. The system MUST write both renditions to storage before inserting the image row, and MUST assign the new row the position `max(existing positions) + 1`, or `0` when the property currently has no images. If the row insert fails after the renditions were written, the system MUST delete the written rendition files as compensation before returning the error.

#### Scenario: A successful upload writes files then inserts one row

- GIVEN a property with two existing images at positions 0 and 1
- WHEN a new valid image is uploaded
- THEN both rendition files are written to storage
- AND exactly one new image row is inserted at position 2

#### Scenario: The first image uploaded to a property is inserted at position 0

- GIVEN a property with no images
- WHEN a valid image is uploaded
- THEN the new image row is inserted at position 0

#### Scenario: A row-insert failure after files were written triggers compensation

- GIVEN the renditions were successfully written to storage
- WHEN the subsequent database insert of the image row fails
- THEN both written rendition files are deleted
- AND no orphaned image row exists

### Requirement: Image Position and Cover Semantics

The system MUST treat the image at `position = 0` for a given property as that property's cover image. The system MUST keep the set of positions within a property contiguous, zero-based, and gap-free after any successful upload, reorder, or delete.

#### Scenario: The position-0 image is the cover in both admin and public responses

- GIVEN a property with three images
- WHEN the property is retrieved through the admin endpoint or the public catalog
- THEN the image at position 0 is the one identified as the cover in each response

#### Scenario: Deleting the cover promotes the next image

- GIVEN a property with three images where the image at position 0 is deleted
- WHEN the deletion completes
- THEN the image that was previously at position 1 is now at position 0 and is the new cover

### Requirement: Image Reordering

The system MUST allow only callers with role `admin` or `manager` to reorder a property's images via a request body containing `imageIds` (array of UUID strings, validated with `@IsArray()` and `@IsUUID('4', { each: true })`). The system MUST accept the request only when `imageIds` is an exact permutation of the property's current image ids — same set, same length, no duplicates, no missing or foreign ids; any other input MUST be rejected with `400 Bad Request` without changing any position. On acceptance, the system MUST rewrite each image's `position` to its index in `imageIds` (0-based) atomically, in a single transaction, so that a concurrent reader never observes a partial reorder.

#### Scenario: Reordering with the exact current image ids succeeds

- GIVEN a property with three images
- WHEN an admin submits `imageIds` containing exactly those three ids in a new order
- THEN the response is `200 OK`
- AND each image's `position` matches its index in the submitted order

#### Scenario: Reorder including a foreign image id is rejected

- GIVEN a property's current image ids, plus one image id belonging to a different property
- WHEN an admin submits that combined list as `imageIds`
- THEN the response is `400 Bad Request`
- AND no position changes for any image

#### Scenario: Reorder omitting one current image id is rejected

- GIVEN a property with three images
- WHEN an admin submits `imageIds` containing only two of the three current ids
- THEN the response is `400 Bad Request`
- AND no position changes for any image

#### Scenario: Reorder with a duplicated image id is rejected

- GIVEN a property with three images
- WHEN an admin submits `imageIds` containing one of the ids twice and omitting another
- THEN the response is `400 Bad Request`
- AND no position changes for any image

#### Scenario: Reorder request failing DTO validation is rejected

- GIVEN a property with existing images
- WHEN an admin submits `imageIds` containing a non-UUID string
- THEN the response is `400 Bad Request`
- AND no position changes for any image

### Requirement: Image Deletion

The system MUST allow only callers with role `admin` or `manager` to delete a single image by id, and MUST reject the same request from a `user` role or an unauthenticated caller. The system MUST reject a delete request for an image id that does not belong to the specified property with `404 Not Found`. On a successful delete, the system MUST remove the image's row, MUST compact the remaining images' positions to stay contiguous and zero-based, and MUST attempt to delete both rendition files; a failure to delete the files MUST be logged and MUST NOT fail the request, since the row deletion already succeeded.

#### Scenario: Admin deletes the middle image and remaining images are renumbered

- GIVEN a property with five images at positions 0 through 4
- WHEN an admin deletes the image at position 2
- THEN the response confirms deletion
- AND the remaining four images keep their relative order and are renumbered 0 through 3

#### Scenario: Deleting an image id that belongs to a different property is rejected

- GIVEN an image id that belongs to property A
- WHEN an admin submits a delete request for that image id scoped to property B
- THEN the response is `404 Not Found`
- AND the image row is not removed

#### Scenario: User role and anonymous callers are rejected

- GIVEN a caller authenticated as `user`, or a caller with no Authorization header
- WHEN they submit an image delete request
- THEN the response is `403 Forbidden` for the `user` role and `401 Unauthorized` for the anonymous caller
- AND the image row is not removed

#### Scenario: A file-deletion failure does not block the row deletion response

- GIVEN an image row whose rendition files are unexpectedly missing on disk
- WHEN an admin deletes that image
- THEN the row is removed and the response still confirms deletion
- AND the file-deletion failure is logged

### Requirement: Property Deletion Cascade for Images

When a property is permanently deleted (per `property-management`'s Hard Delete of Never-Published Properties requirement), the system MUST delete all of that property's image rows and MUST attempt to delete every associated rendition file. The `property_images` foreign key to `properties` MUST be configured `ON DELETE CASCADE`, so the rows are removed even if the deleting code path changes.

#### Scenario: Hard-deleting a property removes its image rows and files

- GIVEN a never-published draft property with two images
- WHEN an admin hard-deletes that property
- THEN both image rows are removed
- AND both images' rendition files are removed

#### Scenario: A best-effort file-deletion failure does not block property deletion

- GIVEN a never-published draft property whose image rendition files are unexpectedly missing on disk
- WHEN an admin hard-deletes that property
- THEN the property row and its image rows are still removed
- AND the file-deletion failure is logged

### Requirement: Audit Logging of Image Mutations

The system MUST call `AuditLogService.record()` after every successful image upload, reorder, and delete, using entity type `property`, entity id equal to the property's id, the actor, the corresponding action (`PROPERTY_IMAGE_UPLOADED`, `PROPERTY_IMAGE_REORDERED`, `PROPERTY_IMAGE_DELETED`), and metadata identifying the affected image id(s). A failure inside `AuditLogService.record()` MUST NOT cause the triggering mutation to fail or roll back, consistent with the existing audit logging behavior elsewhere in the codebase.

#### Scenario: A successful upload produces exactly one matching audit entry

- GIVEN a valid image upload
- WHEN it succeeds
- THEN exactly one audit log entry is recorded with action `PROPERTY_IMAGE_UPLOADED`, entity type `property`, the property's id, and the new image's id in metadata

#### Scenario: A successful reorder produces exactly one matching audit entry

- GIVEN a valid reorder request
- WHEN it succeeds
- THEN exactly one audit log entry is recorded with action `PROPERTY_IMAGE_REORDERED`, entity type `property`, the property's id, and the new order in metadata

#### Scenario: A successful delete produces exactly one matching audit entry

- GIVEN a valid image delete request
- WHEN it succeeds
- THEN exactly one audit log entry is recorded with action `PROPERTY_IMAGE_DELETED`, entity type `property`, the property's id, and the deleted image's id in metadata

#### Scenario: Audit failure does not block any image mutation

- GIVEN `AuditLogService.record()` throws or fails internally for any reason
- WHEN an otherwise-valid image upload, reorder, or delete is performed
- THEN the mutation still succeeds and its response is unaffected by the audit failure

### Requirement: Public Media URL Scheme and Caching

The system MUST expose each rendition to callers only as a fully-qualified, immutable public URL, built from a configured public base URL plus the storage key, and MUST NOT expose raw filesystem paths in any API response. Every served rendition file MUST be returned with cache headers marking it as long-lived and immutable (`Cache-Control: public, max-age=31536000, immutable`). Because a new image always receives a new random identifier, no mutation — including reordering — MUST change an existing image's URL. Serving a media URL MUST NOT require authentication and MUST NOT re-check the owning property's publication status.

#### Scenario: The same image exposes an identical URL in admin and public responses

- GIVEN an image belonging to a published property
- WHEN it is retrieved through the admin endpoint and through the public catalog
- THEN both responses expose the identical `large` URL and the identical `thumb` URL for that image

#### Scenario: Reordering does not change any image's URL

- GIVEN a property with three images
- WHEN their order is changed via a reorder request
- THEN none of the three images' `large` or `thumb` URLs change

#### Scenario: A served rendition is returned with immutable cache headers

- GIVEN a valid media URL for an existing rendition
- WHEN it is requested
- THEN the response includes `Cache-Control: public, max-age=31536000, immutable`

#### Scenario: A media URL is fetchable without authentication regardless of publication status

- GIVEN a media URL belonging to an image of a `draft` or `archived` property
- WHEN it is requested without any Authorization header
- THEN the file is served successfully (no publication check at serve time); this is an accepted risk documented in the proposal
