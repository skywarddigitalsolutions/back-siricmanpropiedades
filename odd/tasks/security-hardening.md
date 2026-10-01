# Feature 12 — Security hardening + admin on its own subdomain

**Objective:** close the gaps found in the 2026-10-01 security audit and move the admin panel to `admin.<domain>`, plus two quick fixes (photos in dev, MFA code input).

**Problem / why:** the audit confirmed SQL injection is not possible (all SQL parameterised, strict DTO validation), but found: no security headers on the site, the whole API publicly reachable (login/MFA brute force bypassing the BFF), Swagger on by default, no per-account MFA attempt limit, a login lockout anyone can trigger against the admin, 5 high npm advisories in the back. The admin shares the origin with the public site, so a script on a public page could drive admin Server Actions.

## Scope

- In (back): MFA failed-attempt limit per user + revoke the mfaToken after 5 failures + TOTP step replay protection; login lockout keyed per (user, IP); `recordSuccess` only after MFA passes; `LoginUserDto` transform must not 500 on non-strings; Swagger off unless `SWAGGER_ENABLED=true`; `MEDIA_SERVE_STATIC` defaults to on outside production; `npm audit fix` (non-breaking).
- In (deploy): Caddy `api.` host serves only `/media/*` and `/api/health` (rest 404); new `admin.{$SITE_DOMAIN}` host → `web:3000`; remove stray `deploy/Caddyfile;C`; compose passes `ADMIN_URL`; runbook section 11 (DNS record, rollout, verification).
- In (front): security headers (CSP, frame-ancestors, HSTS, nosniff, Referrer-Policy, Permissions-Policy, `poweredByHeader: false`); host-based admin routing (admin host serves `/admin/*`, `/` → `/admin`; apex `/admin*` → admin host; no redirect when `ADMIN_URL` is unset, i.e. local dev); session cookie isolated to the admin host; MFA code field: 6 digits numeric with auto-submit, plus "Usar un código de respaldo" switch to a text field.
- Out: separate backend (rejected: no isolation gain), Caddy IP allowlist/basic-auth on the admin host (optional later), CAPTCHA on leads.

## Constraints and decisions

- User decision (2026-10-01): move the admin to `admin.siricmanpropiedades.com.ar`. DNS `A admin` record is created by the user in DonWeb.
- The browser never calls the API directly (verified: no `NEXT_PUBLIC_API*` usage; the front talks to `http://api:3000` server-side), so closing `api.` except `/media` and `/api/health` is safe. UptimeRobot keeps monitoring `/api/health`.
- Contract between repos: compose sets `ADMIN_URL=https://admin.${SITE_DOMAIN}` on `web`; the front reads `ADMIN_URL` and `SITE_URL`.
- Backup codes contain letters, so the MFA field cannot be digits-only without a separate backup-code mode.

## TDD

- Mode: strict TDD enabled (source: user global orchestrator config). Runners: back `npm test` (Jest), front `npm test`. RED observed before GREEN. Caddy/compose changes are config: validated by review (no Docker locally).

## Tasks

| ID | Task | Repo | Route | Status | Commit |
|----|------|------|-------|--------|--------|
| T1 | Auth hardening: MFA attempt limit + revoke + TOTP replay; lockout per (user, IP); recordSuccess after MFA; LoginUserDto fix | back | delegated (back writer) | ✅ | 2a52f71 |
| T2 | Config defaults (Swagger off, media static on in dev) + `npm audit fix` | back | delegated (back writer) | ✅ | 76ba002, 91fb121 |
| T3 | Deploy: Caddy (close api, admin host, headers on media), compose `ADMIN_URL`, remove `Caddyfile;C`, runbook section 11 | back | delegated (back writer) | ✅ | 8a797d2 |
| T4 | Security headers + admin host routing + cookie isolation | front | delegated (front writer, separate repo) | ⬜ | |
| T5 | MFA code input UX (6 digits, auto-submit, backup-code mode) | front | delegated (front writer) | ⬜ | |

## Acceptance criteria

- Back: 6th wrong MFA code for the same user is rejected even from a new IP within the window; the mfaToken is unusable after 5 failures; the same TOTP code cannot be used twice; 5 bad passwords from IP A do not lock the user from IP B; `{"userName":1}` → 400; Swagger off without the env var.
- Front: response headers present on site and admin; `/admin` on the apex redirects to the admin host when `ADMIN_URL` is set; local dev unchanged; MFA field accepts only digits, max 6, submits on the 6th; backup-code mode works.
- `npm run lint`, `npm test`, `npm run build` green in both repos.

## Progress

- 2026-10-01: feature started, branches `feat/security-hardening` in both repos, doc created. RDD: off (default).
- 2026-10-01 T1 (2a52f71): RED = new specs failed (7 failing tests: LoginUserDto non-string 500/throw, TOTP replay x4; compile errors for the new login(ip)/clearPasswordFailures/MfaController signatures); GREEN = `npx jest src/auth` 63/63. MFA failures counted per user via LoginThrottleService key `mfa:<userId>` (5 in 15 min -> 429 for 15 min, mfaToken revoked on the 5th failure); TOTP replay = last accepted step per user in memory (otplib `checkDelta`, no migration: ~90 s window, single instance, same trade-off as the throttle); password lockout keyed by (userName, IP) via `@Ip()`; password failures cleared only after MFA success for MFA users (`clearPasswordFailures`); LoginUserDto transform guarded.
- 2026-10-01 T2 (76ba002, 91fb121): RED = media.config spec for default `serveStatic` true outside production failed (1 failing); GREEN = `npx jest src/media` 35/35. Swagger opt-in (`SWAGGER_ENABLED === 'true'`). `npm audit fix` (no --force): 5 high + 2 moderate -> 2 moderate left (js-yaml 5.3.0 pinned exactly by @nestjs/swagger 11.4.7, no fix upstream). Full suite 465/465, build OK.
- 2026-10-01 T3 (8a797d2): config only, validated by review (no Docker): Caddy api host closed to /media + /api/health, new admin host with X-Robots-Tag, compose `ADMIN_URL`, stray empty `deploy/Caddyfile;C` removed, runbook section 11.

## Next step

T1–T3 (back writer) and T4–T5 (front writer) in parallel; repos are isolated.
