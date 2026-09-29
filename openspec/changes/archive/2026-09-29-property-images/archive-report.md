# Archive Report: Property Images

**Date**: 2026-09-29
**Change**: property-images
**Project**: siricmanpropiedades (back-siricmanpropiedades)
**Branch**: docs/archive-property-images

## Executive Summary

The property-images change has been completed and archived. All 6 implementation slices (infrastructure, media core, schema+persistence, upload, reorder/delete, and public catalog) were successfully merged to main across PRs #12–#17. Test suite: 395/395 passing. Implementation and verification are complete; open follow-ups remain pending per the specification.

## Final State Authority

This archive report reflects the state of the change AT CLOSE, per the Final-State Authority hierarchy in `skills/sdd-archive/SKILL.md`.

- **Highest authority**: Orchestrator-injected final-state facts confirm all 6 slices merged to main (PRs #12–#17), suite 395/395 green, Alpine Docker build passed, runtime harnesses on throwaway Postgres passed for upload/reorder/delete/hard-delete/public-catalog operations.
- **Secondary**: `apply-progress.md` documents Phase 1–6 completion with no unresolved blockers; `tasks.md` lists all checklist items complete.
- **Implementation source**: See individual PR descriptions for commit details; orchestrator confirmed all slices verified.

## Specs Synced to Main Specs

### New Spec: Property Images (`openspec/specs/property-images/spec.md`)
- **Action**: Copy completed ✓
- **Status**: Full spec (286 requirements/scenarios across 6 requirement blocks) now in main spec directory
- **Requirements**: Upload authorization, validation, processing & renditions, storage & compensation, position & cover semantics, reordering, deletion, cascade on property hard-delete, audit logging, public media URL scheme and caching

### Delta Specs: Property Management & Property Public Catalog
- **Action**: Merge attempted with `sdd-archive-compose`
- **Status**: ⚠️ Partial (tool failure, see "Known Limitations" below)
- **property-management delta**: MODIFIED 3 requirements (Property Retrieval by Id [Admin], Hard Delete of Never-Published Properties, Audit Logging of Mutations) — compose failed
- **property-public-catalog delta**: ADDED 2 requirements (Cover Image in Public Listing, Image Gallery in Public Detail) — compose failed

**Reason for delta merge failure**: `gentle-ai sdd-archive-compose` (v3.4.0) rejected both delta specs with "delta spec declares no ADDED, MODIFIED, REMOVED, or RENAMED requirements". This indicates a format incompatibility between the delta spec structure (headers: "## MODIFIED Requirements", "## ADDED Requirements") and the expected gentle-ai format. The command did not produce error details naming a specific missing `(Reason: ...)` note or malformed heading.

**Mitigation**: The property-images implementation (PRs #12–#17) was completed in code and integrated into main; the delta specs represent documentation of the required changes and are provided in the archive for reference. The implementation's test coverage (395/395 green) and runtime harnesses confirm that the specified behaviors are correctly implemented, whether or not the delta specs could be composed into the main spec documents. **A future admin must either:**
1. **Manually merge** the archived delta specs' requirements into the main specs, or
2. **Accept** that the main spec documents lag implementation and refer to the archived delta specs as the source of truth for this change's external contract modifications.

## Archive Contents

✓ **proposal.md** (present): Initial proposal with problem statement, scope, constraints, rollback plan, risks.
✓ **design.md** (present): Detailed design including infrastructure, module/service/controller structures, database schema, API contracts, error handling, and audit decisions.
✓ **specs/** (present):
  - `property-images/spec.md` (present, new): Complete specification copied to main
  - `property-management/spec.md` (present, delta – unmerged): Proposed MODIFIED requirements
  - `property-public-catalog/spec.md` (present, delta – unmerged): Proposed ADDED requirements
✓ **tasks.md** (present): 35+ tasks across 6 phases; all checklist items marked complete
✓ **apply-progress.md** (present): Phase-by-phase completion report; all 6 phases done
✓ **No verify-report** (expected not present; verification happened inline during apply phase per the orchestrator's final-state facts)

## Implementation Summary

### Phase 1: Infrastructure (PR #12, 150 lines, ✓ complete)
- Docker media volume, Caddy `/media/*` route, env examples, Spanish runbook section 6
- Tests: no `.ts` changes; `npm test` passed (baseline verification)

### Phase 2: Media Core (PR #13, ~390 lines, ✓ complete)
- `sharp` library, `StoragePort`/`LocalDiskStorage`, `ImageProcessor`/`SharpImageProcessor`, `Semaphore`, `MediaUrlBuilder`, `MediaModule`
- Tests: semaphore, media config, local disk storage, sharp image processor, media URL builder all passing
- Deviation: `SharpImageProcessor @Optional` added for Nest DI safety; multipart parts limit set to 2

### Phase 3: Schema + Persistence (PR #14, ~370 lines, ✓ complete)
- **Critical fix**: Central `AuditLogService.record()` never-rejects implementation. This closes the pre-existing gap for all current and future audit callers (not just image mutations).
- `PropertyImage` entity, migration, `PropertyImagesRepository`, `PropertyImageKeys` builder, mappers, audit enum values
- Tests: repository, entity keys, image mapper all passing

### Phase 4: Upload (PR #15, ✓ complete)
- `PropertyImagesService.upload()`, admin controller POST endpoint, file validation (jpeg/png/webp, ≤15 MB, ≤30 per property), image processing, storage, and database insertion
- Tests: service and controller tests passing
- Deviation: multipart form parts limit set to 2 (enforced by multer configuration)

### Phase 5: Reorder, Delete, Admin Endpoints (PR #16, ✓ complete)
- Reorder (exact permutation validation, atomic position updates), delete (with cascading position compaction), admin `findOne` with images, hard-delete cascade cleanup
- Compensation: row insert failure triggers file deletion; file deletion failure is logged but does not block row deletion
- Tests: service and controller tests passing

### Phase 6: Public Catalog (PR #17, ✓ complete)
- `coverImage` (thumbnail URL of image at position 0, or null) added to listing items
- `images` array (full gallery with `large`, `thumb` URLs and dimensions) added to detail response
- All URLs are fully-qualified public URLs (no storage keys or filesystem paths exposed)
- Tests: mapper and public service tests passing

## Test Results

**Suite**: 395/395 tests passing (per orchestrator-injected final-state facts)
- Unit tests: all specs for semaphore, media config, local storage, sharp processor, media URL builder, repository, entity mapper, service and controller passing
- Docker Alpine build: sharp binary checked and confirmed working (key risk from `proposal.md`, verified by `npm install` and build step)
- Runtime harnesses: Postgres throwaway instance used to verify upload, reorder, delete, hard-delete, and public catalog operations — all passed

**Build & Lint**: `npm run build`, `npm run lint`, `npx tsc` all passing (per apply-progress)

## Known Limitations & Follow-ups

### Open specification decisions (still pending):
1. **Global throttle vs. SSR catalog** (features 6/7): Whether to apply a global request throttler to prevent abuse of the public catalog endpoint, and whether to support Server-Side Rendering (SSR) of the public catalog. This affects performance characteristics and caching strategy; deferred post-property-images.
2. **Media volume backup coverage** (feature 10): The named `media_data` Docker volume stores image renditions but is not currently covered by pg_dump database backups. The user must apply additional backup strategy (e.g., mounted NFS, restic, or manual copy) to protect against data loss. This is documented in deploy/README.md section 6.

### Server-side deployment requirements:
Before deploying this change to production, the user MUST:
1. Apply the infrastructure steps from `deploy/README.md` section 6 (Fotos de propiedades) on the server:
   - Copy `deploy/compose.yml` (with the new `media_data` volume)
   - Copy `deploy/Caddyfile` (with the `/media/*` route)
   - Add `MEDIA_PUBLIC_BASE_URL=https://api.<dominio>/media` to `.env` on the server
   - Run `docker compose up -d` to create the volume and restart services
2. Verify the `/media/` route is accessible: `curl -I https://api.<dominio>/media/test.webp` (expect 404)

See deploy/README.md section 6 for full details.

### Implementation Deviations from Design
1. **`.env.example` not created**: This execution environment denies reading/writing `.env*` files. Instead, the three `MEDIA_*` variables (`MEDIA_ROOT`, `MEDIA_PUBLIC_BASE_URL`, `MEDIA_SERVE_STATIC`) are documented in `docs/01-setup.md`'s environment variables table. The `.env.example` file in `deploy/env.production.example` and the server deployment guide serve as the source of truth.
2. **`coverImage` is a URL string**: The design doc initially drafted `coverImage` as an object (e.g., `{ url, width, height }`), but the final specification and implementation settle on a simple string URL for simplicity and compatibility with existing listing response shapes. This matches the final spec text and implementation.

## Delta Spec Merge Issue

As noted above, the delta specs for property-management and property-public-catalog could not be composed into the main specs due to a tool format incompatibility. The archived delta specs remain available for manual review or for a future administrator to:
- Manually extract and apply the MODIFIED/ADDED requirements to the canonical main specs, or
- Use a different version of gentle-ai or a corrected delta spec format if the tool is fixed or upgraded.

The fact that the implementation is complete and tested does not require delta spec merging for code correctness, but the main spec documents should be updated to reflect the new requirements for future reference and for readers of the specification.

## Key Numbers

| Metric | Value |
|--------|-------|
| Total changed lines (test + source) | ~1,800–2,000 (per tasks.md forecast) |
| Tests passing | 395/395 |
| Phases completed | 6/6 |
| PRs merged to main | 6 (#12–#17) |
| New domains added to spec | 1 (property-images) |
| Existing domains modified | 2 (property-management, property-public-catalog) |
| Delta specs successfully merged | 0/2 (tool failure) |
| New spec successfully copied | 1/1 (property-images) |

## Recommendations for Next Steps

1. **Immediate (pre-deployment)**: Apply deploy/README.md section 6 on the production server to set up the media volume and Caddy route.
2. **Near-term (this session or next)**: Manually merge the archived delta specs into the main specs, or document in the repository that the main spec documents lag implementation for this change and refer readers to the delta specs in the archive.
3. **Future**: Resolve the pending global throttle vs. SSR catalog decision (features 6/7) and implement as a separate follow-up change.
4. **Operational**: Establish a backup strategy for the `media_data` volume to protect stored image renditions (feature 10).

## Archive Location

Archived to: `openspec/changes/archive/2026-09-29-property-images/`

All artifacts have been moved here and verified via `diff -r` against a pre-move snapshot. No differences were found (empty diff confirms byte-identical archive).

---

**Status**: CLOSED (with known limitations documented above)  
**Signed**: sdd-archive executor  
**Date**: 2026-09-29
