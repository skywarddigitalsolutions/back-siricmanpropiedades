# Proposal: Property Images

Roadmap feature 4: upload, WebP conversion, ordering/cover, storage.

## Intent

Properties currently have no photos, so neither the admin panel nor the public site can show a listing in a usable way. Admins and managers need to attach, order, and remove photos per property; the public catalog needs a cover thumbnail for listing cards and an ordered gallery for the detail page.

The VPS disk (30 GB) is the scarce resource, so uploads must be normalized to compact WebP renditions, originals must not be kept, and deleting an image or a property must reclaim its files. The API sits behind Caddy on `api.siricmanpropiedades.com.ar`, Docker bypasses ufw (no new published ports), and server-side changes are applied later by the user, so the infrastructure footprint must stay small and be documented.

Success: an admin/manager uploads jpeg/png/webp photos, gets them converted to WebP (large + thumbnail, metadata stripped), reorders them (first = cover), deletes them, and the public listing/detail responses expose working, cacheable image URLs for published properties only.

## Scope

### In Scope

- New `property_images` table and `PropertyImage` entity (FK to `properties`, `ON DELETE CASCADE`, `position`, rendition metadata), plus a new TypeORM migration (never editing `InitSchema`).
- `StoragePort` interface (hexagonal) with a `LocalDiskStorage` adapter writing to a configurable directory backed by a Docker named volume.
- `ImageProcessor` port with a `SharpImageProcessor` adapter: validate real image content (not just the client MIME type), auto-orient, produce `large` (max 1920 px wide) and `thumb` (max 480 px wide) WebP renditions, never upscale, strip all EXIF/GPS metadata (colors normalized to sRGB), and keep sharp's input-pixel limit as a decompression-bomb guard.
- Admin endpoints under the existing `/api/admin/properties` guard (`admin | manager`):
  - `POST /api/admin/properties/:id/images`: multipart, single file per request (field `file`), jpeg/png/webp, max 15 MB, max 30 images per property; appended at the last position.
  - `PUT /api/admin/properties/:id/images/order`: body `{ imageIds: uuid[] }`, which must be an exact permutation of the property's current images; positions rewritten 0..n-1.
  - `DELETE /api/admin/properties/:id/images/:imageId`: removes the row, compacts positions, deletes both files.
  - `GET /api/admin/properties/:id` (existing) returns the ordered images with their URLs.
- Property hard delete (existing admin-only, never-published rule) also removes the property's image files.
- New audit actions `PROPERTY_IMAGE_UPLOADED`, `PROPERTY_IMAGE_REORDERED`, `PROPERTY_IMAGE_DELETED` (entity type `property`, entity id = property id, image id(s) in metadata); audit failure never fails the mutation (existing rule).
- Public catalog: listing items gain a `coverImage` (thumbnail URL, or `null` when no images); detail gains `images` (full ordered gallery with large + thumbnail URLs and dimensions). Publication scope rule unchanged.
- Public file serving through Caddy `file_server` (see Approach), plus an env-gated local-dev static fallback in Nest.
- Deploy artifacts: `Dockerfile` (writable media dir owned by `node`), `deploy/compose.yml` (named volume shared by `api` rw and `caddy` ro), `deploy/Caddyfile` (`/media/*` route), `deploy/env.production.example` (new env vars), and a runbook section in `deploy/README.md` (written in the runbook's existing language) describing the server-side steps the user applies.
- `sharp` added as a production dependency.
- Unit tests under strict TDD (`npm test`): services tested with mocked repositories, a fake `StoragePort` and a fake `ImageProcessor`; one small real-sharp test on a tiny in-repo fixture for `SharpImageProcessor`; `LocalDiskStorage` tested against a temp directory.

### Out of Scope

- Cloudflare R2 (or any object-storage) adapter; only the port shape is prepared for it.
- Keeping original uploads, extra renditions (medium, AVIF, `srcset` sets), watermarking, alt text/captions.
- Explicit `isCover` flag (cover is always position 0).
- Batch/multi-file uploads in one request, resumable uploads, client-side direct uploads.
- Backups of the media volume (daily `pg_dump` does not cover files; tracked as follow-up for the ops/backup feature).
- Orphan-file garbage collection job (only best-effort cleanup plus logging in this change).
- Front-end (admin panel upload UI, public gallery) — it lives in `front-siricmanpropiedades`.
- Access control on media URLs (see Risks: files are served without a publication check).

## Capabilities

### New Capabilities

- `property-images`: image management for a property — upload validation (type, size, per-property cap), WebP conversion and metadata stripping, storage through a storage port, ordering and cover semantics, deletion with file cleanup, admin/manager authorization, audit of image mutations, public URL scheme and caching of served files.

### Modified Capabilities

- `property-management`: Hard Delete of Never-Published Properties MUST also remove the property's image rows and files; Property Retrieval by Id (Admin) MUST include the ordered images; Audit Logging of Mutations gains the `PROPERTY_IMAGE_*` actions (or cross-references them from `property-images`).
- `property-public-catalog`: public listing items MUST expose the cover thumbnail URL (or `null`); public detail MUST expose the full ordered gallery; neither may expose internal storage keys or filesystem paths.

## Approach

**Layering (hexagonal inside `src/properties/`, or a sibling `src/property-images/` module — final placement decided in design).**
`PropertyImagesService` orchestrates: load property (404 if missing) -> check the 30-image cap -> `ImageProcessor.process(buffer)` -> `StoragePort.put()` for both renditions -> insert row at `max(position)+1` -> audit. If the DB insert fails after files were written, it compensates by deleting the written files. Deletion order is DB first, then files (best effort, failures logged), so the database never points at missing files; the worst case is an orphan file, never a broken image. Reorder runs in one transaction.

**Upload transport.** Nest `FileInterceptor` (multer, in-memory) with `limits.fileSize = 15 MB` and one file per request, which bounds memory to ~15 MB per upload. Type is verified by decoding with sharp (magic bytes), not by trusting the `Content-Type`. The global throttler (20 req/min per IP) would block a 30-photo session, so the upload route gets a route-level `@Throttle` override (e.g. 60/min); exact number decided in design.

**Storage keys and URL scheme (recommended).**
- Storage key (stored in DB, relative, adapter-agnostic): `properties/{propertyId}/{imageId}-lg.webp` and `properties/{propertyId}/{imageId}-thumb.webp`.
- Public URL = `MEDIA_PUBLIC_BASE_URL` + `/` + key, e.g. `https://api.siricmanpropiedades.com.ar/media/properties/{propertyId}/{imageId}-lg.webp`.
- A new image always gets a new UUID, so every URL is immutable and can be cached with `Cache-Control: public, max-age=31536000, immutable`. Reordering never renames files.
- Grouping by property id makes "delete all files of a property" a single prefix/directory removal and keeps the scheme compatible with a future R2 adapter (same keys, different base URL).

**Public serving (recommended: Caddy `file_server` from the shared volume).**
The `media_data` named volume is mounted read-write at the API's media dir and read-only into Caddy at `/srv/media`. In the `{$API_DOMAIN}` site block, `handle_path /media/*` serves files with `root /srv/media`, `file_server` (no browse), immutable cache headers and `X-Content-Type-Options: nosniff`; everything else keeps `reverse_proxy api:3000`. No ports are published and there is no collision with the `/api` global prefix.
Why not NestJS static serving: it spends Node event-loop time and memory on every image request of the public site; helmet's default `Cross-Origin-Resource-Policy: same-origin` would block images embedded from `siricmanpropiedades.com.ar` (different origin than `api.`), requiring header exceptions; and Caddy already provides efficient `ETag`/range handling and compression bypass for binary files. The cost is two small server-side edits (compose + Caddyfile), which are documented in the runbook. For local development without Caddy, `main.ts` serves the media dir under `/media` only when `MEDIA_SERVE_STATIC=true` (default off, never set in production).

**Configuration.** `MEDIA_STORAGE_DIR` (default `/app/storage/media` in the container), `MEDIA_PUBLIC_BASE_URL`, `MEDIA_SERVE_STATIC`. The `Dockerfile` creates `/app/storage/media` owned by `node` so a fresh named volume inherits writable ownership. At startup `LocalDiskStorage` verifies the directory is writable and fails fast otherwise.

**Public mapping.** `toPublicProperty` stays the single whitelist projection; it gains `coverImage` (listing) and `images` (detail) built from storage keys via a URL builder, so keys and paths never leak. The listing query joins only position-0 images (1:1) so pagination/`total` semantics are unchanged.

**Auth/roles/MFA impact.** No new roles or guards: image endpoints inherit the class-level `@Auth(admin, manager)` of the admin properties controller, so managers can upload, reorder and delete images. Property hard delete stays admin-only. MFA rules are unchanged (admin still requires MFA to obtain a token). Media URLs are unauthenticated by design.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/properties/entities/property-image.entity.ts` | New | `PropertyImage` entity |
| `src/properties/entities/property.entity.ts` | Modified | `OneToMany` images relation |
| `src/migrations/<ts>-PropertyImages.ts` | New | `property_images` table, FK cascade, index on `(property_id, position)` |
| `src/properties/images/` (or `src/property-images/`) | New | `StoragePort`, `LocalDiskStorage`, `ImageProcessor`, `SharpImageProcessor`, `PropertyImagesService`, controller routes, DTOs, URL builder, specs |
| `src/properties/services/properties.service.ts` | Modified | Hard delete removes image files; `findOne` loads ordered images |
| `src/properties/services/public-properties.service.ts` | Modified | Load cover (listing) and gallery (detail) |
| `src/properties/helpers/public-property.mapper.ts` | Modified | `coverImage` / `images` in public shape |
| `src/properties/controllers/admin-properties.controller.ts` | Modified | Image routes (or a new admin images controller on the same path) |
| `src/properties/properties.module.ts` | Modified | Providers/tokens for the ports |
| `src/audit/enums/audit-action.enum.ts` | Modified | `PROPERTY_IMAGE_UPLOADED/REORDERED/DELETED` |
| `src/main.ts` | Modified | Env-gated dev static serving of `/media` |
| `package.json`, `package-lock.json` | Modified | `sharp` dependency (lockfile must include linuxmusl binaries) |
| `Dockerfile` | Modified | Create media dir owned by `node` |
| `deploy/compose.yml`, `deploy/Caddyfile`, `deploy/env.production.example`, `deploy/README.md` | Modified | Volume, `/media/*` route, env vars, runbook steps |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Disk growth on a 30 GB VPS (roughly 0.2–0.5 MB per image pair; 30 images x hundreds of properties can reach several GB) | Med | WebP quality tuned (~80), no originals kept, no upscaling, file cleanup on delete; document `du` check of the volume in the runbook |
| API released before the compose volume is added: files land in the container layer and are lost on recreate | Med | Ship compose/Caddyfile changes in the same release; runbook step ordering; fail-fast writability check cannot detect this case, so the runbook step is explicit |
| `sharp` native binary missing on Alpine (lockfile generated on Windows) | Med | Verify `@img/sharp-linuxmusl-x64` in the lockfile; CI Docker build is the gate; smoke-test upload after deploy |
| Media files are publicly reachable regardless of publication status (Caddy does no DB check) | Low | URLs contain random UUIDs and are only exposed by public responses after publish; photos are marketing material. Unpublishing does not revoke already-shared URLs (accepted) |
| Orphan files after a crash between DB and filesystem steps | Low | Ordering (write files -> insert; delete row -> delete files) guarantees no broken references; orphans are logged; GC job deferred |
| Memory/CPU spikes from concurrent sharp processing | Low | One file per request, 15 MB cap, sharp pixel limit, route throttle; sharp concurrency can be capped in design |
| Reorder races / duplicate positions | Low | Reorder in a single transaction with exact-permutation validation; design decides on a deferrable unique `(property_id, position)` constraint |
| Global throttler blocks legitimate bulk uploads | Med | Route-level `@Throttle` override on the upload endpoint |

## Rollback Plan

- Code is delivered as stacked PRs to `main`; revert them in reverse order. Public-catalog exposure and deploy changes are independent slices and can be reverted alone.
- Migration: its `down()` drops `property_images` (and its index/FK). Run `npm run migration:revert` (or deploy the reverted image, then revert the migration) — image rows are lost, which is acceptable because files can be re-uploaded; property rows are untouched.
- Files: after rollback, the `media_data` volume can be kept (harmless) or removed with `docker compose down` + `docker volume rm siricman_media_data` to reclaim disk.
- Server config: restore the previous `compose.yml` and `Caddyfile` (remove the volume mounts and the `/media/*` handle) and `docker compose up -d`; the rest of the site is unaffected because the `/media/*` route is additive.
- The public API change is additive (new fields), so the current front-end keeps working before and after rollback.

## Dependencies

- `sharp` (npm, prebuilt binaries for linux-musl x64 in the Alpine image).
- Existing `AuditLogService`, `@Auth`/`@RoleProtected`, `ThrottlerModule`, `@nestjs/platform-express` multer support (already installed).
- User applies the server-side steps (compose volume, Caddyfile route, env vars) per the runbook; no remote access from this workflow.

## Review Workload Forecast

Advisory budget: 400 authored changed lines per PR (tests included, lockfile excluded). Estimated total: ~1,300–1,500 lines. Delivery: auto-chain, stacked-to-main.

| Slice | Content | Estimate |
|-------|---------|----------|
| 1 | Entity + migration, `StoragePort` + `LocalDiskStorage`, `ImageProcessor` + `SharpImageProcessor`, `sharp` dependency, tests | ~350 |
| 2 | Upload endpoint + service (cap, validation, compensation), audit action, throttle override, tests | ~350 |
| 3 | Reorder + delete endpoints, admin `findOne` images, hard-delete file cleanup, audit actions, tests | ~350 |
| 4 | Public catalog `coverImage` / `images`, mapper + queries, tests | ~200 |
| 5 | Dockerfile, compose, Caddyfile, env example, runbook, dev static serving | ~150 |

Decision needed before apply: No
Chained PRs recommended: Yes
400-line budget risk: High (overall); Low–Medium per slice

## Success Criteria

- [ ] An admin or manager can upload a jpeg/png/webp up to 15 MB; the response contains the new image with large and thumbnail URLs; a `user` role gets 403 and anonymous gets 401.
- [ ] Files larger than 15 MB, non-image content, unsupported formats, and a 31st image are rejected without writing files or rows.
- [ ] Stored files are WebP, at most 1920 px / 480 px wide, never upscaled, and contain no EXIF/GPS metadata (verified by the real-sharp fixture test).
- [ ] Reorder accepts only an exact permutation and position 0 is the cover in both admin and public responses.
- [ ] Deleting an image removes its row and both files; hard-deleting a never-published property removes all its image files.
- [ ] Every image mutation records exactly one `PROPERTY_IMAGE_*` audit entry; audit failures do not fail the mutation.
- [ ] Public listing items expose `coverImage` (or `null`), public detail exposes the ordered gallery; draft/archived properties remain invisible; no storage keys or filesystem paths are exposed.
- [ ] `npm test`, `npm run lint`, `npm run build` pass; the Docker image builds in CI with `sharp` working on Alpine.
- [ ] After the user applies the runbook, `https://api.siricmanpropiedades.com.ar/media/...` serves an uploaded image with immutable cache headers and no new published ports.
