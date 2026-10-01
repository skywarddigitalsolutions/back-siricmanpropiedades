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
| T1 | F15: email normalization + migration + index; clients endpoints + CSV | delegated (back writer) | ✅ | `452545e` |
| T2 | F15: leads `q`, `propertyId`, status counts | delegated | ✅ | `1e583d4` |
| T3 | F16: property list cover/imageCount, address search, sort, counts, hasImages | delegated | ✅ | `aadcf8f` |
| T4 | F18: change password (+ session invalidation), regenerate backup codes, dashboard summary, users check | delegated | ✅ | `2325649` |
| T5 | F18: `admin:reset-password` CLI + runbook | delegated | ✅ | `d80811a` |

## Acceptance criteria

- `Juan@X.com ` and `juan@x.com` are one client; CSV export has one row per client; search works by name/email/phone.
- Leads search and property filter work; counts match.
- Admin list returns thumbnails, searches by address, sorts safely.
- Changing the password requires the current one (and MFA code), and old tokens stop working.
- `npm run lint`, `npm test`, `npm run build` green.

## Progress

- 2026-10-01: doc created, branch `feat/admin-api-extensions`. RDD: off (default).
- 2026-10-01: T1-T5 done on `feat/admin-api-extensions` (RDD off).
  - T1 RED: 3 new suites failed to compile (csv, clients service, clients controller) + 2 failing tests (email lowercase in DTO and service); GREEN: 40/40 leads tests. Migration `1790800000000-NormalizeLeadEmails`.
  - T2 RED: lead-query builder, admin-lead DTO and service findAll specs failing; GREEN: 48/48.
  - T3 RED: 4 suites failing (builder, service, repository, admin filters DTO); GREEN: 242/242 in properties.
  - T4 RED: 8 suites failing (session validity, JWT iat check, account service/controller, mfa service, dashboard, users reset); GREEN: 533/533 total. Migration `1790900000000-AddUserPasswordChangedAt`.
  - T5 RED: reset-password helpers spec failing; GREEN: 9/9. Migrations run against the DEV database only.
  - Decisions: wrong current password / wrong MFA code on `PATCH /auth/password` return 400 (not 401) so the BFF does not treat them as an expired session; admin reset-password via `/users/:id/reset-password` also stamps `passwordChangedAt`.

## Next step

Push, PR, deploy; front features 15/16/18 consume these.

## Endpoint contracts (for front features 15, 16, 18)

All under `/api`, bearer token, 401/403 on missing token/role.

- `GET /admin/clients?q&limit(1-100, def 20)&offset` (admin+manager) → `{ items: [{ email (lowercased), name (latest), phone (latest non-null|null), inquiries, firstInquiryAt, lastInquiryAt, properties: [{ id, code, title }] (distinct, latest first, max 5) }], total }`, ordered by lastInquiryAt DESC; only leads with email.
- `GET /admin/clients/export.csv?q` → CSV (UTF-8 BOM, CRLF, `clientes.csv`), header `email,name,phone,inquiries,firstInquiryAt,lastInquiryAt,properties` (codes joined "; "), formula-injection safe, max 10,000 rows, audit `clients.exported`.
- `GET /admin/leads` adds `q` (name/email/phone/message) and `propertyId` (UUID); response `{ items, total, counts: { new, contacted, closed } }` (counts ignore `status`).
- `GET /admin/properties` adds `q` on address, `currency`, `hasImages=true|false`, `sort=createdAt|updatedAt|price` (price requires `currency`, else 400), `order=asc|desc`; items gain `coverThumbnailUrl: string|null`, `imageCount`; response adds `counts: { draft, published, archived }` (ignore `publicationStatus`).
- `PATCH /auth/password` `{ currentPassword, newPassword, code? }` (code required with MFA; TOTP or backup) → 200 `{ id, userName, isActive, roles, token }`: the BFF must swap its session cookie to this token (every other session is invalidated). Wrong current password / code / same password → 400 (not 401). 5 failures → 429.
- `POST /auth/mfa/backup-codes` `{ code }` (6-digit TOTP only) → 201 `{ backupCodes: string[10] }` shown once; 400 without MFA or bad code.
- `GET /admin/dashboard` (admin+manager) → `{ leads: { new, total }, properties: { draft, published, archived, publishedWithoutImages }, latestLeads: [{ id, name, type, status, createdAt, property: { id, code, title } | null }] }` (max 5).
- Users (admin only, pre-existing): `GET /users?isActive&limit&offset` (with `userRoles.role`, `isActive`), `POST /users` `{ userName, password, roleId }`, `PATCH /users/:id/activate|deactivate`, `PATCH /users/:id/reset-password` `{ newPassword }` (now also ends that user's sessions), `GET /roles`, `GET /roles/available`.
- Operator: `docker compose exec api node dist/cli/reset-password.js <userName>` (runbook 11.1).
