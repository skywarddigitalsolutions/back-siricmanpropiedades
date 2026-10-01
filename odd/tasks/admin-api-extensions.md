# Admin API extensions (back side of features 15, 16, 18)

**Objective:** the back endpoints the new admin screens need: a deduplicated clients view, a searchable leads inbox, a richer property list, self-service password change and backup-code regeneration, users management support, a dashboard summary, and an operator command to reset a password from the server.

**Problem / why:** the 2026-10-01 admin audit found no way to search leads, no clients view (and emails stored with mixed case, so duplicates), no thumbnails/sort/address search in the property list, and no self-service password change. The front features 15, 16 and 18 build on these endpoints.

## Scope

- F15: normalize lead emails to lowercase+trim on submit; migration lowercasing existing rows + functional index on `lower(email)`; `GET /admin/clients` (search `q`, pagination) derived from leads grouped by email; `GET /admin/clients/export.csv` (audit-logged); leads list gains `q` (name/email/phone/message, LIKE-escaped) and `propertyId` filters and per-status counts.
- F16: admin property list items gain `coverThumbnailUrl` and `imageCount`; `q` also matches `address`; `sort` (`createdAt` default, `updatedAt`, `price` — price only within a currency, mirror the public rule); per-publication-status counts; `hasImages` filter.
- F18: `PATCH /auth/password` (current password + new password + MFA code when MFA is enabled; invalidates every other session); regenerate backup codes (requires a TOTP code); `GET /admin/dashboard` summary (new leads, drafts, published without photos, totals); confirm users list/create/activate/deactivate/reset endpoints cover the users screen; CLI `npm run admin:reset-password` usable via `docker compose exec api` (documented in the runbook).
- Out: separate clients table, email sending, forgot-password flow (user decision).

## Constraints and decisions

- Clients are a derived view over leads (no new table): only leads with an email; phone-only leads are not in this view.
- Admin/manager for clients and leads; admin only for users, CSV export audit-logged (personal data).
- Every SQL stays parameterised; ORDER BY only from whitelists.
- No forgot-password flow (user decision 2026-10-01).

## TDD

- Mode: strict TDD enabled (source: user global orchestrator config). Runner: `npm test` (Jest). RED observed before GREEN.

## Tasks

| ID | Task | Route | Status | Commit |
|----|------|-------|--------|--------|
| T1 | F15: email normalization + migration + index; clients endpoints + CSV | delegated (back writer) | ⬜ | |
| T2 | F15: leads `q`, `propertyId`, status counts | delegated | ⬜ | |
| T3 | F16: property list cover/imageCount, address search, sort, counts, hasImages | delegated | ⬜ | |
| T4 | F18: change password (+ session invalidation), regenerate backup codes, dashboard summary, users check | delegated | ⬜ | |
| T5 | F18: `admin:reset-password` CLI + runbook | delegated | ⬜ | |

## Acceptance criteria

- `Juan@X.com ` and `juan@x.com` are one client; CSV export has one row per client; search works by name/email/phone.
- Leads search and property filter work; counts match.
- Admin list returns thumbnails, searches by address, sorts safely.
- Changing the password requires the current one (and MFA code), and old tokens stop working.
- `npm run lint`, `npm test`, `npm run build` green.

## Progress

- 2026-10-01: doc created, branch `feat/admin-api-extensions`. RDD: off (default).

## Next step

T1.
