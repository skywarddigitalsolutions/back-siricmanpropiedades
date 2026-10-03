# Feature 23 — Demo properties for the client presentation

**Objective:** load ~8 realistic, fully filled, published properties with photos into production so the client can see the site working with content, and remove them completely afterwards with one command.

**Problem / why:** production has a single real property, so the home, results, featured sections and favorites look empty in a presentation. Owner decision (2026-10-02): publish demo properties on the real site and delete them right after the client sees it.

## Scope

- CLI `dist/cli/demo-properties.js` with two subcommands, run by the user inside the `api` container:
  - `seed <photosDir>`: creates ~8 published properties (mix of sale/rent, types and barrios, featured flags, marketing tags, all fields filled), uploads each property's photos through the same image pipeline as the panel (WebP + thumbnail, media volume), writes a manifest of what it created.
  - `remove`: deletes exactly the properties in the manifest (rows, image rows, files on disk), leaves real properties untouched, leads pointing to them keep existing (`ON DELETE SET NULL`), resets `property_code_seq` to the highest remaining code so the next real property has no gap, deletes the manifest.
- Demo data (titles, descriptions, prices, addresses) committed as a small JSON/TS fixture; photos NOT committed (downloaded to a gitignored local folder and copied to the server by the user).
- Runbook subsection with the exact steps.
- Out: demo leads, demo users.

## Constraints and decisions

- Owner authorized downloading ~40 free photos from Unsplash or Pexels (2026-10-02). Free license allows commercial use without attribution.
- Claude never connects to the server; the user runs every server command.
- Seed refuses to run if a manifest already exists (no double seed); remove refuses without a manifest. Both print what they do.
- Audit log entries are kept (audit trail).
- Addresses are plausible CABA streets without exact numbers shown publicly (`showExactAddress=false`) so no real home is pointed at.

## TDD

- Mode: strict TDD enabled (source: user global orchestrator config). Runner: `npm test` (Jest). Pure parts (fixture validation, manifest handling, sequence reset value) unit-tested; RED before GREEN.

## Tasks

| ID | Task | Route | Status | Commit |
|----|------|-------|--------|--------|
| T1 | Demo fixture + `seed`/`remove` CLI with manifest and sequence reset, tests | delegated | ⬜ | |
| T2 | Download photos (gitignored `deploy/demo/photos/`), runbook steps | delegated | ⬜ | |

## Acceptance criteria

- `seed` then `remove` on the dev database leaves property count, image files and `property_code_seq` as before; real properties untouched.
- `npm run lint`, `npm test`, `npm run build` green.

## Progress

- 2026-10-02: branch `feat/demo-properties`, doc created. RDD: off (default).

## Next step

T1.
