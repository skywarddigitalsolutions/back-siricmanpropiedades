# Design: Property Images

## Technical Approach

Property photos are handled by a hexagonal split:

- A new, domain-agnostic **`MediaModule`** (`src/media/`) owns the infrastructure: configuration (`MEDIA_*` env vars), the `StoragePort` with its `LocalDiskStorage` adapter, the `ImageProcessor` port with its `SharpImageProcessor` adapter, and the `MediaUrlBuilder`. It knows nothing about properties.
- **`PropertiesModule`** (`src/properties/`) owns the domain: the `PropertyImage` entity, a `PropertyImagesRepository` (all transactional SQL in one place), `PropertyImagesService` (orchestration: cap, processing, storage, compensation, audit), a new `AdminPropertyImagesController`, and the extended public mapper.

Uploads are single-file multipart requests buffered in memory by multer (15 MiB cap). The buffer is decoded and re-encoded by sharp into two WebP renditions (`lg` max 1920 px wide, `thumb` max 480 px wide, never upscaled, metadata stripped, sRGB). Files are written first, then the row is inserted inside a transaction that locks the parent property row; if the transaction fails, the written files are deleted (compensation). Deletes run the other way round: DB first, files best effort. Files are served publicly by Caddy `file_server` from a named Docker volume shared read-only with Caddy; Nest only serves them in local development behind `MEDIA_SERVE_STATIC=true`.

This implements the proposal's approach with the orchestrator's accepted decisions (Caddy `file_server` on `/media/*`, relative storage keys `properties/{propertyId}/{imageId}-lg.webp|-thumb.webp`, media URLs public regardless of publication status, HTTP codes 400/400/413). Specs (`property-images`, `property-management` delta, `property-public-catalog` delta) are being written in parallel; where this design names response fields, the specs are authoritative on naming and the design adapts.

## Architecture Decisions

### Decision: Module placement — generic `MediaModule` + domain code inside `PropertiesModule`

**Choice**: Adapters and config in `src/media/` (exports provider tokens). Entity, repository, service, controller, DTO and mappers in `src/properties/` (subfolder `src/properties/images/` for the service and repository). `PropertiesModule` imports `MediaModule`.
**Alternatives considered**: (a) everything inside `src/properties/images/`; (b) a sibling `src/property-images/` feature module.
**Rationale**: A sibling feature module would need the `Property` repository while `PropertiesService` (hard delete, admin `findOne`) and `PublicPropertiesService` (cover/gallery) need image data and storage — a circular module dependency (`forwardRef`), which the codebase does not use anywhere. Keeping the image domain in `PropertiesModule` matches the existing layout rule (module/controller/service/dto/entities). The storage and image-processing adapters, however, are genuinely generic (a future leads attachment or R2 adapter reuses them), have no dependency on properties, and are where the native `sharp` dependency lives; isolating them in `MediaModule` keeps the port/adapter boundary explicit and testable.

### Decision: No inverse `OneToMany` relation on `Property`

**Choice**: `PropertyImage` has `@ManyToOne(() => Property, { onDelete: 'CASCADE' })` plus an explicit `propertyId` column. `Property` gets **no** `images` relation. Images are loaded with explicit queries through `PropertyImagesRepository`.
**Alternatives considered**: `@OneToMany(() => PropertyImage, (i) => i.property)` on `Property` (proposal's Affected Areas table).
**Rationale**: `PropertiesService` mutates through `findOne()` + `propertyRepository.save(property)`. If `findOne` ever loads `images`, TypeORM's `save` processes the `OneToMany` side (re-sets FKs and, with default `orphanedRowAction`, nullifies children missing from the array), which risks silent data corruption on any property update/publish. Without the inverse relation, existing mutation paths stay byte-for-byte unaffected, the listing pagination query is untouched, and image loading is explicit and unit-testable with a mocked repository.

### Decision: `(property_id, position)` uniqueness — `DEFERRABLE INITIALLY IMMEDIATE` unique constraint + set-based updates + parent row lock

**Choice**:
- Constraint `UQ_property_images_property_position UNIQUE (property_id, position) DEFERRABLE INITIALLY IMMEDIATE` plus `CHECK (position >= 0)`. The unique index doubles as the lookup index; no extra index.
- Reorder is ONE statement: `UPDATE ... FROM unnest($ids::uuid[]) WITH ORDINALITY` (positions `0..n-1`). Delete compaction is ONE statement: `SET position = position - 1 WHERE position > $deleted`.
- Every image mutation runs in a transaction that first takes `SELECT 1 FROM properties WHERE id = $1 FOR UPDATE`, serializing concurrent image mutations of the same property.
**Alternatives considered**: (a) no constraint, rely on app logic; (b) non-deferrable unique + two-phase update (shift positions by +1000, then set); (c) `INITIALLY DEFERRED`; (d) optimistic insert at `max+1` and retry on `23505`.
**Rationale**: A non-deferrable unique constraint is checked row-by-row in Postgres, so permuting positions in one `UPDATE` would fail mid-statement; `DEFERRABLE INITIALLY IMMEDIATE` checks at end of statement, which is exactly what a set-based permutation needs, while still failing immediately (not at commit) for real duplicates. Two-phase updates double the writes and leak magic offsets. The parent row lock makes the 30-image cap and "append at position = count" race-free (two concurrent uploads cannot both see 29), which the constraint alone would only detect as a `23505` error. Positions are always compact (`0..n-1`), so the next position is `count`, not `max+1`.

### Decision: Upload order — process, write files, then locked insert with compensation

**Choice**: (1) property exists else 404; (2) cheap pre-check `count < 30` else 400 (avoids CPU work for a doomed upload); (3) `ImageProcessor.process(buffer)`; (4) generate `imageId = randomUUID()`, `put` both renditions (if the second `put` fails, delete the first); (5) transaction: lock property (404 if deleted meanwhile), authoritative `count < 30` (400), insert at `position = count`; (6) on any transaction error delete both keys (best effort, logged) and rethrow; (7) audit (never fails the request); (8) return 201.
**Alternatives considered**: insert row first then write files (broken image references if the write fails); write files inside the DB transaction window (holds the row lock during disk I/O — acceptable but pointless).
**Rationale**: The database never references a missing file; the worst crash outcome is an orphan file, which is logged. CPU-bound sharp work happens outside any transaction/lock. The image id is app-generated because the storage key embeds it before the row exists; the column is `@PrimaryColumn('uuid')`.

### Decision: Delete order — DB first, files best effort

**Choice**: Transaction (lock property, find image by `id` AND `property_id` else 404, delete row, compact positions), commit, then `storage.delete(largeKey)` and `storage.delete(thumbKey)` with errors caught and logged (`Logger.warn` with keys). Hard delete of a property: `propertyRepository.delete(id)` (FK cascade removes image rows), then `storage.deletePrefix('properties/{id}/')` best effort, then the existing `PROPERTY_DELETED` audit.
**Alternatives considered**: files first (a failed DB delete leaves rows pointing at missing files); per-image deletion on hard delete (needs an extra query; prefix removal is one call and also sweeps orphans of that property).
**Rationale**: Same invariant as upload: no broken references; orphans only on filesystem failure, logged for the deferred GC follow-up.

### Decision: `AuditLogService.record()` itself catches and logs errors (central fix)

**Choice**: `AuditLogService.record()` wraps its own persistence call in `try/catch`, logs a warning (`Logger.warn` with entity type/id and action) on failure, and always resolves — it never rejects. `PropertyImagesService` calls `auditLogService.record(entry)` directly, with no local wrapper. Actions: `PROPERTY_IMAGE_UPLOADED = 'property.image_uploaded'`, `PROPERTY_IMAGE_REORDERED = 'property.image_reordered'`, `PROPERTY_IMAGE_DELETED = 'property.image_deleted'` (all ≤ 50 chars, `audit_logs.action` is `varchar(50)`, no DB enum, so no audit migration). `entityType: 'property'`, `entityId: propertyId`. Metadata: uploaded `{ imageId, position, largeBytes, thumbBytes }`; reordered `{ imageIds }` (new order); deleted `{ imageId, position }`.
**Alternatives considered**: (a) a private `recordAudit()` wrapper inside `PropertyImagesService` only (rejected — matches this change's original draft, but leaves every existing call site in `PropertiesService` and elsewhere still exposed, and duplicates the same try/catch in every future caller); (b) leaving `AuditLogService.record()` unguarded and relying on callers, like the existing (unguarded) `await record()` in `PropertiesService`.
**Rationale**: Both `property-images` and `property-management` specs state that an audit failure MUST NOT fail or roll back the triggering mutation, but `AuditLogService.record()` itself does not catch, and every existing caller (`PropertiesService` included) awaits it unguarded — a pre-existing gap, not one introduced by this change. Fixing it once inside `AuditLogService.record()` closes the gap for every current and future caller with one change and one test, instead of adding a local try/catch per service (which this change's earlier draft did for image mutations and which is now removed in favor of the central fix). This is implemented in the earliest slice where `AuditLogService` is touched (slice 3, alongside the new `PROPERTY_IMAGE_*` audit actions), so both the new image call sites and the existing `PropertiesService` call sites benefit immediately.

### Decision: Upload transport and HTTP mapping

**Choice**: `@UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: IMAGE_UPLOAD_LIMITS }))` with `IMAGE_UPLOAD_LIMITS = { fileSize: 15 * 1024 * 1024, files: 1, fields: 0, parts: 1 }`. Mapping:

| Condition | Source | HTTP |
|-----------|--------|------|
| file > 15 MiB | multer `LIMIT_FILE_SIZE` → Nest `PayloadTooLargeException` | 413 |
| missing `file` part | controller check | 400 |
| extra files/fields, wrong field name | multer limit errors → Nest `BadRequestException` | 400 |
| undecodable content | `InvalidImageError` from processor | 400 |
| decodable but not jpeg/png/webp (gif, tiff, svg, heif, avif...) | `UnsupportedImageFormatError` | 400 |
| input pixels over limit | `ImageTooLargeError` (pixel guard) | 400 |
| property already has 30 images | service | 400 |
| property / image not found | service | 404 |
| `user` role / anonymous | `@Auth` guard | 403 / 401 |

The client `Content-Type` of the part is ignored; sharp's decoded `metadata().format` is the authority.
**Alternatives considered**: multer `fileFilter` on MIME type (trusts the client, rejects legitimate `application/octet-stream` uploads); disk storage for multer (extra temp-file cleanup, no benefit at 15 MiB).
**Rationale**: One file per request bounds memory to ~15 MiB per in-flight upload; sharp magic-byte decoding is the only trustworthy type check. `@types/multer` is added as a devDependency for the `Express.Multer.File` type.

### Decision: Route throttling

**Choice**: `@Throttle({ default: { limit: 60, ttl: 60_000 } })` on the upload route and the image delete route. Reorder keeps the global 20/min.
**Alternatives considered**: `@SkipThrottle()` on admin routes (removes brute-force protection on an authenticated but still abusable endpoint); 30/min (exactly one full gallery per minute — a retry of a failed batch would hit 429).
**Rationale**: The global throttler (unnamed → `default`, 20 req/min per IP) would 429 a 30-photo session. 60/min lets an admin fill a 30-image gallery with headroom for retries within one minute, while CPU is independently bounded by the processing semaphore below. Deleting a full gallery (30 requests) has the same shape. Reorder is one request per drag-and-drop commit, so 20/min is enough.

### Decision: sharp resource limits

**Choice**: In `SharpImageProcessor`: `sharp.concurrency(1)` (libvips threads per image), `sharp.cache(false)` (no retained decode cache on an 8 GB box shared with Postgres and Next), a process-wide `Semaphore(2)` around `process()` (max two images processed at once, others queue), `limitInputPixels: 50_000_000` (50 MP; decompression-bomb guard, covers 8660×5773 camera photos), sharp default `failOn: 'warning'`, first frame only for animated inputs. Constants are constructor-injectable for tests.
**Alternatives considered**: sharp defaults (threads = CPU count = 4, cache 50 MB, 268 MP limit); a job queue (BullMQ) — requires Redis, out of scope.
**Rationale**: Worst case is two decodes at once using at most two cores, leaving the other two for Postgres/Next/Caddy. 50 MP × 4 bytes ≈ 200 MB peak per decode, so two concurrent ≈ 400 MB — acceptable on 8 GB. Queue length is bounded in practice by auth + the 60/min throttle.

### Decision: Rendition pipeline

**Choice**: `base = sharp(buffer, { limitInputPixels }).rotate()` (EXIF auto-orient); validate `metadata().format ∈ {jpeg, png, webp}`; then in parallel `base.clone().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true })` and the same with width 480 / quality 75. No `withMetadata()`/`keepMetadata()` call, so sharp strips EXIF/GPS/XMP/ICC and outputs sRGB (sharp default). Output `{ large, thumb }` each `{ data: Buffer, width, height, bytes }`.
**Alternatives considered**: `fit: 'inside'` with a height cap too (portrait photos could be very tall — acceptable, width is what the layout constrains); AVIF (out of scope).
**Rationale**: Matches the proposal; dimensions come from sharp's `info`, so stored `width`/`height` reflect the oriented output.

### Decision: Storage keys, URL scheme, and `StoragePort` contract

**Choice**: Keys `properties/{propertyId}/{imageId}-lg.webp` and `properties/{propertyId}/{imageId}-thumb.webp`, built by one pure helper `buildPropertyImageKeys(propertyId, imageId)`. Both keys are stored in the row. URL = `MEDIA_PUBLIC_BASE_URL + '/' + key`. `StoragePort`:
- `put(key, data, contentType)` — writes atomically (temp file in the same directory + `rename`), creates parent dirs, file mode `0o644`, dir mode `0o755`.
- `delete(key)` — idempotent (`ENOENT` is success).
- `deletePrefix(prefix)` — removes the directory for that prefix recursively, idempotent.
- `LocalDiskStorage` validates every key against `^[a-z0-9][a-z0-9/_-]*(\.webp)?$` and asserts the resolved path stays inside `MEDIA_ROOT` (path traversal guard, defense in depth even though keys are server-generated). `deletePrefix` requires a non-empty prefix of at least two segments (never wipes the root).
- On `onModuleInit` it `mkdir -p`s the root and writes/removes a probe file; failure throws and the app fails to boot (fail fast).
**Alternatives considered**: keys derived at read time from ids (no stored keys; breaks if the scheme or adapter changes); flat keys without the property prefix (hard delete would need per-image deletion).
**Rationale**: Immutable, unique URLs (new UUID per upload, reorder never renames) allow `Cache-Control: immutable`; the property prefix makes property cleanup a single call and maps 1:1 onto a future R2 adapter (same keys, different base URL).

### Decision: Configuration and validation

**Choice**: `loadMediaConfig(config: ConfigService): MediaConfig` in `src/media/media.config.ts`, a pure function provided under the `MEDIA_CONFIG` token; it throws a descriptive `Error` at bootstrap (same fail-fast style as `JwtStrategy` and `MfaService`, since the project has no central env schema).

| Var | Default | Validation |
|-----|---------|------------|
| `MEDIA_ROOT` | `path.resolve(process.cwd(), 'storage/media')` (→ `/app/storage/media` in the container, `./storage/media` in dev) | must be absolute after resolve; writability checked by `LocalDiskStorage.onModuleInit` |
| `MEDIA_PUBLIC_BASE_URL` | non-production: `http://localhost:${PORT ?? 3000}/media` | required when `NODE_ENV=production`; must parse as an absolute URL; `https:` required in production; trailing `/` trimmed; no query/hash |
| `MEDIA_SERVE_STATIC` | `false` | only `'true'`/`'false'`/unset accepted; `'true'` with `NODE_ENV=production` is rejected |

`MEDIA_ROOT` supersedes the proposal's tentative `MEDIA_STORAGE_DIR` name (orchestrator naming).
**Alternatives considered**: `Joi`/`class-validator` global env schema (new dependency/pattern; out of scope); warning instead of rejecting `MEDIA_SERVE_STATIC=true` in production.
**Rationale**: A missing base URL in production would silently emit `localhost` URLs to the public site — failing at boot is safer. Rejecting static serving in production keeps a single serving path (Caddy) and avoids the helmet `Cross-Origin-Resource-Policy: same-origin` trap.

### Decision: Public serving via Caddy, dev fallback in Nest

**Choice**: Caddy `{$API_DOMAIN}` block gains `request_body { max_size 16MB }` and a `handle_path /media/*` block (see Interfaces) serving only `*.webp` from `/srv/media` with immutable cache headers only on hits, `nosniff`, no directory browsing; everything else keeps `reverse_proxy api:3000`. In `main.ts`, when `MEDIA_SERVE_STATIC === 'true'`, `app.useStaticAssets(mediaRoot, { prefix: '/media/', index: false, dotfiles: 'deny', immutable: true, maxAge: '365d', setHeaders: res => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin') })` (outside the `/api` global prefix, so the dev URL shape equals production).
**Alternatives considered**: Nest static in production (accepted proposal reasoning: event-loop cost, CORP header conflicts).
**Rationale**: Orchestrator-accepted. The `@exists` matcher prevents a 404 from being cached for a year; the `.webp` restriction means nothing else on the volume (probe or temp files) is ever served.

### Decision: Response shapes

**Choice**:
- Admin image (`PropertyImageResponse`, used by upload, reorder, admin `GET /:id`): `{ id, position, url, width, height, thumbnailUrl, thumbnailWidth, thumbnailHeight, createdAt }`.
- Admin `GET /api/admin/properties/:id`: existing property JSON plus `images: PropertyImageResponse[]` ordered by `position`, produced by a new `PropertiesService.findOneWithImages(id)`; `findOne` (used by all mutations) is unchanged.
- Public listing item: existing `PublicPropertyResponse` + `coverImage: { url, width, height } | null` (thumbnail rendition of position 0).
- Public detail: listing shape + `images: PublicPropertyImage[]` with `{ url, width, height, thumbnailUrl, thumbnailWidth, thumbnailHeight }` ordered by position (no `id`, no `position` — order is the array order). Detail does NOT carry a separate `coverImage` field (resolved per spec: the cover is `images[0]`); only listing items expose `coverImage`.
- Storage keys, `MEDIA_ROOT` and filesystem paths are never serialized anywhere.
**Alternatives considered**: returning `PropertyImage` entities directly (would leak keys).
**Rationale**: Explicit whitelist projections, like the existing `toPublicProperty`.

### Decision: Public catalog loading — second query, not a join

**Choice**: `PublicPropertiesService.findAll` keeps its paginated query untouched, then calls `propertyImagesRepository.findCoversByPropertyIds(ids)` (`WHERE property_id = ANY($ids) AND position = 0`, one query, served by the unique index) and maps. `findBySlug` calls `findByPropertyId(property.id)` ordered by position. Mapper becomes `toPublicProperty(property, images: PropertyImage[], urls: MediaUrlBuilder)`; listing passes `[cover]` or `[]`, detail passes the gallery, with a `includeGallery` flag (or two exported functions `toPublicPropertyListItem` / `toPublicPropertyDetail` sharing a private base projection).
**Alternatives considered**: `leftJoinAndMapOne` on `position = 0` in the paginated query.
**Rationale**: Zero risk to `getManyAndCount` pagination/`total` semantics, no ORM mapping onto non-column fields, trivially unit-testable with a mocked repository. Cost: one extra indexed query per listing page (≤ 50 ids).

## Data Flow

Upload:

    Admin panel ──multipart──> Caddy (max 16MB) ──> Nest ThrottlerGuard (60/min) ──> @Auth(admin,manager)
       ──> FileInterceptor (memory, 15MiB, 1 file) ──> AdminPropertyImagesController.upload
       ──> PropertyImagesService.upload
             ├─ repo.existsProperty / repo.countByProperty  (404 / 400 cap pre-check)
             ├─ ImageProcessor.process(buffer)  [Semaphore(2), sharp]  (400 on invalid)
             ├─ StoragePort.put(lgKey), put(thumbKey)   ──> MEDIA_ROOT/properties/{pid}/...
             ├─ repo.insertAppended(tx: lock property FOR UPDATE, count, cap, insert)
             │     └─ on error: StoragePort.delete(both) (best effort) + rethrow
             ├─ recordAudit(PROPERTY_IMAGE_UPLOADED) (errors swallowed + logged)
             └─ toPropertyImageResponse(row, MediaUrlBuilder) ──> 201

Public read:

    Browser <img src=https://api.../media/properties/{pid}/{iid}-thumb.webp>
       ──> Caddy handle_path /media/* ──> file_server root /srv/media (volume media_data, ro)
    Public site SSR ──> GET /api/properties ──> PublicPropertiesService
       ──> paginated query (unchanged) ──> repo.findCoversByPropertyIds ──> mapper (URLs only)

Volumes:

    api  (rw) /app/storage/media ──┐
                                   ├── named volume media_data
    caddy (ro) /srv/media ─────────┘

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/media/media.module.ts` | Create | Provides/exports `MEDIA_CONFIG`, `STORAGE_PORT` (`LocalDiskStorage`), `IMAGE_PROCESSOR` (`SharpImageProcessor`), `MediaUrlBuilder` |
| `src/media/media.config.ts` (+ `.spec.ts`) | Create | `MediaConfig` type, `MEDIA_CONFIG` token, `loadMediaConfig()` validation |
| `src/media/storage/storage.port.ts` | Create | `StoragePort` interface + `STORAGE_PORT` token |
| `src/media/storage/local-disk.storage.ts` (+ `.spec.ts`) | Create | Disk adapter: atomic put, idempotent delete/deletePrefix, key + traversal guard, boot writability probe |
| `src/media/images/image-processor.port.ts` | Create | `ImageProcessor` interface, `ProcessedImage` types, `IMAGE_PROCESSOR` token |
| `src/media/images/image-processing.errors.ts` | Create | `InvalidImageError`, `UnsupportedImageFormatError`, `ImageTooLargeError` (framework-free) |
| `src/media/images/sharp-image.processor.ts` (+ `.spec.ts`) | Create | sharp adapter with semaphore, pixel limit, renditions |
| `src/media/media-url.builder.ts` (+ `.spec.ts`) | Create | `toUrl(key)` from `MEDIA_PUBLIC_BASE_URL` |
| `src/common/utils/semaphore.ts` (+ `.spec.ts`) | Create | Minimal async counting semaphore (`run(fn)`) |
| `src/properties/entities/property-image.entity.ts` | Create | `PropertyImage` entity (see Interfaces) |
| `src/migrations/1790500000002-CreatePropertyImages.ts` | Create | `property_images` table, FK cascade, deferrable unique, check |
| `src/properties/images/property-image-keys.ts` (+ `.spec.ts`) | Create | `buildPropertyImageKeys`, `propertyMediaPrefix` |
| `src/properties/images/property-images.repository.ts` (+ `.spec.ts`) | Create | Transactional SQL: lock, count, insert appended, reorder, delete+compact, finders |
| `src/properties/images/property-images.service.ts` (+ `.spec.ts`) | Create | Upload / reorder / delete orchestration, compensation, safe audit |
| `src/properties/controllers/admin-property-images.controller.ts` (+ `.spec.ts`) | Create | `POST`, `PUT order`, `DELETE :imageId` under `admin/properties/:id/images` |
| `src/properties/dto/reorder-property-images.dto.ts` (+ `.spec.ts`) | Create | `imageIds` validation |
| `src/properties/dto/index.ts` | Modify | Export reorder DTO |
| `src/properties/helpers/property-image.mapper.ts` (+ `.spec.ts`) | Create | Admin and public image projections |
| `src/properties/helpers/public-property.mapper.ts` (+ spec) | Modify | `coverImage` / `images` fields |
| `src/properties/services/properties.service.ts` (+ spec) | Modify | Inject `STORAGE_PORT`, `PropertyImagesRepository`, `MediaUrlBuilder`; `remove()` prefix cleanup; `findOneWithImages()` |
| `src/properties/controllers/admin-properties.controller.ts` (+ spec) | Modify | `GET :id` calls `findOneWithImages` |
| `src/properties/services/public-properties.service.ts` (+ spec) | Modify | Load covers / gallery, pass to mapper |
| `src/properties/properties.module.ts` | Modify | `forFeature([Property, PropertyImage])`, import `MediaModule`, register repository/service/controller |
| `src/audit/enums/audit-action.enum.ts` | Modify | Three `PROPERTY_IMAGE_*` actions |
| `src/audit/audit-log.service.ts` (+ spec) | Modify | `record()` catches its own repository error, logs a warning, and always resolves (central fix — never throws to any caller, including existing `PropertiesService` call sites) |
| `src/main.ts` | Modify | Env-gated `useStaticAssets` for `/media/` |
| `package.json`, `package-lock.json` | Modify | `sharp` (dependency), `@types/multer` (devDependency); lockfile must contain `@img/sharp-linuxmusl-x64` |
| `.gitignore` | Modify | `/storage` |
| `.env.example` | Modify | `MEDIA_ROOT`, `MEDIA_PUBLIC_BASE_URL`, `MEDIA_SERVE_STATIC=true` for dev |
| `Dockerfile` | Modify | Runner: `RUN mkdir -p /app/storage/media && chown -R node:node /app/storage` before `USER node` |
| `deploy/compose.yml` | Modify | `media_data` volume: api rw at `/app/storage/media`, caddy ro at `/srv/media`; `MEDIA_ROOT` forced in api `environment` |
| `deploy/Caddyfile` | Modify | `request_body` limit and `/media/*` handle in API site |
| `deploy/env.production.example` | Modify | `MEDIA_PUBLIC_BASE_URL=https://api.<dominio>/media` with comment |
| `deploy/README.md` | Modify | New section (Spanish) with the server-side steps and verification |

## Interfaces / Contracts

```ts
// src/media/storage/storage.port.ts
export const STORAGE_PORT = Symbol('STORAGE_PORT');
export interface StoragePort {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;          // idempotent
  deletePrefix(prefix: string): Promise<void>; // idempotent, >= 2 segments
}

// src/media/images/image-processor.port.ts
export const IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');
export interface Rendition { data: Buffer; width: number; height: number; bytes: number }
export interface ProcessedImage { sourceFormat: 'jpeg' | 'png' | 'webp'; large: Rendition; thumb: Rendition }
export interface ImageProcessor { process(input: Buffer): Promise<ProcessedImage> } // throws image-processing.errors

// src/media/media.config.ts
export const MEDIA_CONFIG = Symbol('MEDIA_CONFIG');
export interface MediaConfig { root: string; publicBaseUrl: string; serveStatic: boolean }
export function loadMediaConfig(config: ConfigService): MediaConfig;

// src/properties/images/property-images.repository.ts
export class PropertyImagesRepository {
  propertyExists(propertyId: string): Promise<boolean>;
  countByProperty(propertyId: string): Promise<number>;
  /** tx: lock property FOR UPDATE; NotFound if gone; CapExceeded if count >= max; insert at count */
  insertAppended(image: NewPropertyImage, maxImages: number): Promise<PropertyImage>;
  /** tx: lock; load ids; caller-supplied validator; single UPDATE ... WITH ORDINALITY; return ordered */
  reorder(propertyId: string, imageIds: string[]): Promise<PropertyImage[]>;
  /** tx: lock; find by id+propertyId; delete; compact; returns deleted row or null */
  deleteAndCompact(propertyId: string, imageId: string): Promise<PropertyImage | null>;
  findByPropertyId(propertyId: string): Promise<PropertyImage[]>;        // ORDER BY position
  findCoversByPropertyIds(ids: string[]): Promise<PropertyImage[]>;      // position = 0
}
```

Repository-level signals (`PropertyNotFoundError`, `ImageCapExceededError`, `NotAPermutationError`) are plain errors mapped to `NotFoundException`/`BadRequestException` by the service, so the SQL layer stays framework-free. Permutation rule: same length, no duplicates, same id set as current rows; identical order = no-op (200, no write, no audit).

Entity `PropertyImage` (`property_images`):

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `@PrimaryColumn('uuid')`, app-generated (`randomUUID`) |
| `property_id` | `uuid NOT NULL` | FK → `properties(id)` `ON DELETE CASCADE`; `@ManyToOne` + `@Column propertyId` |
| `position` | `smallint NOT NULL` | `CHECK (position >= 0)`; unique with `property_id`, deferrable |
| `large_key` | `varchar(255) NOT NULL` | storage key, never serialized |
| `thumb_key` | `varchar(255) NOT NULL` | storage key, never serialized |
| `width`, `height` | `integer NOT NULL` | large rendition |
| `thumb_width`, `thumb_height` | `integer NOT NULL` | thumbnail rendition |
| `large_bytes`, `thumb_bytes` | `integer NOT NULL` | disk accounting |
| `created_at` | `timestamp without time zone NOT NULL DEFAULT now()` | |

Migration `1790500000002-CreatePropertyImages` (`up`):

```sql
CREATE TABLE "property_images" (
  "id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "position" smallint NOT NULL,
  "large_key" varchar(255) NOT NULL,
  "thumb_key" varchar(255) NOT NULL,
  "width" integer NOT NULL, "height" integer NOT NULL,
  "thumb_width" integer NOT NULL, "thumb_height" integer NOT NULL,
  "large_bytes" integer NOT NULL, "thumb_bytes" integer NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "PK_property_images" PRIMARY KEY ("id"),
  CONSTRAINT "CHK_property_images_position" CHECK ("position" >= 0),
  CONSTRAINT "UQ_property_images_property_position" UNIQUE ("property_id", "position")
    DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT "FK_property_images_property" FOREIGN KEY ("property_id")
    REFERENCES "properties"("id") ON DELETE CASCADE
);
```

`down`: `DROP TABLE "property_images"`. The migration is the schema source of truth; the entity mirrors it (`@Unique` with `deferrable: 'INITIALLY IMMEDIATE'` if the installed TypeORM typings accept it, otherwise a comment pointing to the migration — `synchronize` is off).

Key SQL:

```sql
-- reorder (inside tx, after lock + permutation check)
UPDATE property_images AS pi SET position = v.ord - 1
FROM unnest($1::uuid[]) WITH ORDINALITY AS v(id, ord)
WHERE pi.id = v.id AND pi.property_id = $2;
-- delete compaction
UPDATE property_images SET position = position - 1
WHERE property_id = $1 AND position > $2;
```

Endpoints (all under class-level `@Auth(ValidRoles.admin, ValidRoles.manager)`, which enforces JWT + `UserRoleGuard`; `user` → 403, anonymous → 401; MFA unchanged — admins already needed MFA to obtain the token):

| Method | Path | Body | Success | Throttle |
|--------|------|------|---------|----------|
| POST | `/api/admin/properties/:id/images` | multipart, field `file` | 201 `PropertyImageResponse` | 60/min |
| PUT | `/api/admin/properties/:id/images/order` | `{ imageIds: uuid[] }` | 200 `PropertyImageResponse[]` | global 20/min |
| DELETE | `/api/admin/properties/:id/images/:imageId` | — | 204 | 60/min |
| GET (existing) | `/api/admin/properties/:id` | — | 200 property + `images` | global |

`:id` and `:imageId` use `ParseUUIDPipe` (400 on malformed). Swagger: `@ApiConsumes('multipart/form-data')` + `@ApiBody` binary schema on upload.

DTO (`class-validator`):

```ts
export class ReorderPropertyImagesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ArrayUnique()
  @IsUUID('4', { each: true })
  imageIds: string[];
}
```

Caddyfile `{$API_DOMAIN}` block:

```caddyfile
{$API_DOMAIN} {
	request_body {
		max_size 16MB
	}
	handle_path /media/* {
		@notWebp not path *.webp
		respond @notWebp 404
		root * /srv/media
		@exists file
		header @exists Cache-Control "public, max-age=31536000, immutable"
		header X-Content-Type-Options nosniff
		file_server
	}
	handle {
		reverse_proxy api:3000
	}
}
```

compose.yml deltas: `api.volumes: [media_data:/app/storage/media]`, `api.environment.MEDIA_ROOT: /app/storage/media`, `caddy.volumes: + media_data:/srv/media:ro`, top-level `volumes: media_data:`.

Runbook section for `deploy/README.md` (Spanish, neutral register, to be appended as section 6 and referenced from section 4):

```markdown
## 6. Fotos de propiedades (volumen de medios)

Las fotos se guardan en el volumen de Docker `media_data`. La API lo usa con
permisos de escritura y Caddy lo sirve en modo solo lectura bajo
`https://api.<dominio>/media/...`. No se publica ningún puerto nuevo.

Pasos (una sola vez, antes o junto con la versión que incluye las fotos):

1. Copiar al servidor los archivos actualizados `compose.yml` y `Caddyfile`:
   `scp -P 5941 deploy/compose.yml deploy/Caddyfile siricman:~/siricman/`
2. Agregar al `.env` del servidor:
   `MEDIA_PUBLIC_BASE_URL=https://api.<dominio>/media`
   (sin barra final; la API no arranca en producción si falta).
3. Aplicar los cambios: `docker compose pull && docker compose up -d`.
4. Verificar:
   - `docker compose logs api` no muestra errores de `MEDIA_*` ni de escritura.
   - `docker compose exec api sh -c 'ls -ld /app/storage/media'` muestra al
     usuario `node` como dueño.
   - Después de subir una foto desde el panel:
     `curl -I https://api.<dominio>/media/properties/<id>/<imagen>-thumb.webp`
     responde `200` con `Cache-Control: public, max-age=31536000, immutable`.
5. Control de espacio: `docker system df -v | grep media_data` o
   `docker compose exec api du -sh /app/storage/media`.

Importante: el respaldo diario de la base (`pg_dump`) no incluye las fotos.
Si se elimina el volumen (`docker volume rm siricman_media_data`), las fotos
se pierden de forma definitiva.
```

## Testing Strategy

Strict TDD (`npm test`, jest + ts-jest, colocated `*.spec.ts`): every production file above is preceded by a failing spec. No DB integration layer exists in the project (`openspec/config.yaml`: integration/e2e false).

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `loadMediaConfig` | Fake `ConfigService.get`; defaults, trailing slash trim, prod requires https base URL, rejects `MEDIA_SERVE_STATIC=true` in prod and invalid values |
| Unit | `LocalDiskStorage` | Real temp dir (`fs.mkdtemp(os.tmpdir())`), removed in `afterEach`: put creates dirs + content, no temp leftovers, delete idempotent, deletePrefix removes only that property dir, rejects `../`, absolute and malformed keys, rejects 1-segment prefix, `onModuleInit` fails on an unwritable/invalid root (use a path under a regular file to stay OS-independent on Windows) |
| Unit (real sharp) | `SharpImageProcessor` | Fixtures generated in-test with `sharp({ create })` (no binary fixtures in repo): 2400×1200 JPEG with EXIF (`withExif`/`withMetadata({ orientation: 6 })`) → WebP, lg width 1920 / thumb 480, orientation applied (dims swapped), `metadata().exif`/`icc` absent; 300 px PNG not upscaled; WebP input accepted; GIF → `UnsupportedImageFormatError`; random bytes → `InvalidImageError`; injected small pixel limit → `ImageTooLargeError` |
| Unit | `Semaphore` | Max concurrency respected, release on rejection |
| Unit | `MediaUrlBuilder`, `buildPropertyImageKeys`, image mappers | Pure functions; mappers never output `largeKey`/`thumbKey`/root |
| Unit | `PropertyImagesRepository` | Mocked `DataSource.transaction(cb)` with fake `EntityManager` (`query`, `getRepository`): asserts lock-first ordering, cap error at 30, insert position = count, permutation errors, reorder/compaction SQL + params, 404 signals |
| Unit | `AuditLogService` (modified) | `record()` resolves (does not throw) when `auditLogRepository.save()` rejects, and logs a warning via `Logger.warn`; existing happy-path tests unaffected |
| Unit | `PropertyImagesService` | Fake repository, fake `StoragePort` (in-memory map with failure injection), fake `ImageProcessor`, real `AuditLogService` behavior assumed non-throwing (per its own spec) — mocked here as a plain jest mock that can still be told to reject in this test, asserting the service's own call site never lets that rejection propagate: happy path; 404; cap pre-check skips processing; processor error → 400 and nothing written; second `put` failure deletes first; insert failure deletes both keys; audit rejection still returns success; delete: DB first then files, file-delete failure logged not thrown; reorder no-op writes nothing and no audit |
| Unit | `AdminPropertyImagesController` | Fake service; missing file → 400; delegates actor; asserts exported `IMAGE_UPLOAD_LIMITS` (15 MiB, 1 file); guard metadata via `Reflect.getMetadata` like existing controller specs |
| Unit | `ReorderPropertyImagesDto` | `validate()` on invalid uuids, duplicates, empty, > 30, non-array |
| Unit | `PropertiesService` (modified) | `remove()` calls `deletePrefix('properties/{id}/')` after `delete`, storage failure does not fail the request; `findOneWithImages` ordering + URLs |
| Unit | `PublicPropertiesService` / mapper (modified) | Cover `null` when no images; one extra query with page ids; empty page → no cover query; detail gallery ordered; no keys leaked |
| Integration / E2E | SQL (deferrable constraint, `WITH ORDINALITY`), multer 413 mapping, Caddy route | Not automated (no layer in repo). Manual check during apply against local `docker-compose.yml` Postgres (`npm run migration:run`, curl upload/reorder/delete with an oversized file), and the runbook post-deploy verification. CI Docker build is the gate for sharp on Alpine |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. (HTTP route additions under an existing guard are not the routing boundary the matrix targets; file-handling threats — path traversal, decompression bombs, content-type spoofing, metadata leakage, oversized bodies — are covered by the storage key guard, pixel limit, sharp-decoded format check, metadata stripping, and multer/Caddy size limits above, each with a RED test in the Testing Strategy.)

## Migration / Rollout

**Schema**: one new migration `1790500000002-CreatePropertyImages`, additive, runs automatically on boot (`migrationsRun: true`). `down()` drops the table; images are lost, properties untouched. `InitSchema` and `CreateProperties` are never edited. No audit migration (action column is `varchar(50)`).

**PR slices (stacked to `main`, each independently green on `npm test`, `npm run lint`, `npm run build`)**:

| # | Slice | Content | Est. lines |
|---|-------|---------|-----------|
| 1 | Infra first | `Dockerfile` media dir, `deploy/compose.yml` volume + `MEDIA_ROOT`, `deploy/Caddyfile`, `deploy/env.production.example`, `deploy/README.md` section, `.gitignore` | ~150 |
| 2 | Media core | `sharp` + `@types/multer`, `src/media/**` (config, storage, processor, errors, URL builder), `Semaphore`, `MediaModule` imported by `PropertiesModule`, `main.ts` dev static, `.env.example` + tests | ~390 |
| 3 | Schema + persistence | `PropertyImage` entity, migration, `PropertyImagesRepository`, key builder, image mappers, audit enum values + tests | ~330 |
| 4 | Upload | `PropertyImagesService.upload`, controller `POST`, throttle, multer limits, safe audit + tests | ~340 |
| 5 | Reorder + delete + admin | reorder/delete service + routes + DTO, `findOneWithImages`, hard-delete prefix cleanup + tests | ~380 |
| 6 | Public catalog | cover + gallery loading, public mapper + tests | ~200 |

Infra goes first on purpose: slice 2 adds a boot-time writability check and (in production) a required `MEDIA_PUBLIC_BASE_URL`, and slice 4 starts writing files. If the Dockerfile directory, the named volume, and the env var were not already in place, a routine `docker compose pull` of an intermediate `main` would crash the API (no writable `/app/storage/media` for user `node`) or write uploads into the container layer (lost on recreate). Slice 1 is inert on its own (empty volume, Caddy returns 404 under `/media/`, unused env var), so it is safe to apply on the server before any code lands. The runbook tells the user to apply step 6 before deploying slice 2+.

**Rollback**: revert slices in reverse order; slice 6 (public fields, additive) and slice 1 (infra) can be reverted alone. Revert the migration with `npm run migration:revert` from a checkout/container running slice 3+ code before deploying an image without it. The `media_data` volume may be kept or removed (`docker volume rm siricman_media_data`).

## Open Questions

- [x] Spec alignment: exact public/admin field names (`coverImage`, `images`, `thumbnailUrl`, ...) — resolved per the merged specs: public listing items expose `coverImage`; public detail exposes only the ordered `images` gallery (no separate `coverImage` field on detail — the cover is `images[0]`).
- [x] `AuditLogService.record()` did not swallow errors although the property-management and property-images specs both require it. Resolved centrally: `AuditLogService.record()` itself now catches and logs, so every caller (including `PropertiesService`) is covered without a per-service wrapper (see the audit decision above).
- [ ] Whether TypeORM 0.3.27 typings accept `deferrable` on `@Unique`; if not, the entity carries a comment and the migration remains the source of truth (no behavioral impact, `synchronize` is off).
