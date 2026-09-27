# Feature 2 — Early deploy

**Objective:** both apps run in production on the VPS behind HTTPS, deployed from images built in CI, so every later feature ships to a real environment from day one.

**Why:** deploying early surfaces infra problems (TLS, proxy headers, CORS, migrations, disk) while the apps are still small, instead of at the end.

## Scope

- In: production Dockerfiles (front + back), `.dockerignore`, GitHub Actions workflows that build and push images to GHCR, production compose (Postgres + back + front + Caddy), Caddyfile with automatic HTTPS, production env example, deploy runbook.
- Out: automatic deploy from CI to the server (SSH from Actions), DB backups (feature 10), monitoring (feature 10), front→API calls (`NEXT_PUBLIC_API_URL` wiring comes with the first feature that calls the API).

## Constraints and decisions

- **Images are built in GitHub Actions and pushed to GHCR; the server only pulls.** Reason: the VPS disk (30 GB) is the scarce resource; building on the server leaves build cache and intermediate layers behind. Decided by Claude after the user delegated the choice (2026-09-27).
- Both repos are public, so the GHCR packages are made public once and the server pulls without credentials. Images carry no secrets; all secrets are runtime env on the server.
- Deploy is manual on the server (`docker compose pull && docker compose up -d`), run by the user. Claude never connects to the server.
- Production deploy files live in the back repo under `deploy/` (compose, Caddyfile, env example, runbook).
- Postgres publishes no ports (Docker bypasses ufw); services talk over the internal compose network. Only Caddy publishes 80/443.
- Container logs capped (json-file `max-size`/`max-file`) to protect disk.
- Domains come from env (`SITE_DOMAIN`, `API_DOMAIN`), not hardcoded. `www` redirects to the apex.
- Back in production: `NODE_ENV=production`, `TRUST_PROXY=1`, `SWAGGER_ENABLED=false`, `CORS_ORIGINS=https://<site domain>`; migrations run on boot (`migrationsRun: true`). Seed passwords from `.env.example` are refused in production.
- Front: Next.js `output: "standalone"` for a small runtime image.
- Front branch `feat/early-deploy` was branched from `feat/front-base`; front PR #1 was already merged, so front PR #2 targets `main`.

## TDD

- Mode: strict TDD enabled (source: user global orchestrator config). This feature is infrastructure config with no unit-testable behavior; checks are build/config validation instead of RED/GREEN tests. Existing suites (`npm test` in each repo) must stay green.

## Tasks

| ID | Task | Repo | Route | Status | Commit |
|----|------|------|-------|--------|--------|
| T1 | Front: `output: "standalone"`, multi-stage Dockerfile, `.dockerignore` | front | delegated (writer trigger: 2+ files) | ✅ | 88ba1cb |
| T2 | Front: GH Actions workflow build+push to GHCR on `main` (+ manual dispatch) | front | delegated | ✅ | bfb3457 |
| T3 | Back: multi-stage Dockerfile, `.dockerignore` | back | delegated | ✅ | a280266 |
| T4 | Back: GH Actions workflow build+push to GHCR on `main` (+ manual dispatch) | back | delegated | ✅ | b048003 |
| T5 | Back: `deploy/` — `compose.yml`, `Caddyfile`, `env.production.example`, `README.md` runbook | back | delegated | ✅ | 1449b57 |

## Acceptance criteria

- `docker build` succeeds for both apps (verified in CI or locally with Docker Desktop).
- `docker compose -f deploy/compose.yml config` validates.
- On the server, following the runbook: `https://<site>` serves the front, `https://api.<site>/api/...` reaches the back, `www` redirects, Postgres is not reachable from outside.

## Checks

- Front: `npm run lint`, `npm test`, `npm run build`.
- Back: `npm run lint`, `npm test`, `npm run build`.
- Docker builds + compose config (needs Docker Desktop running, or CI).

## Progress

- 2026-09-27: feature started, doc created, branches `feat/early-deploy` in both repos.
- 2026-09-27: T1–T5 implemented. Front: `npm run lint`/`npm test`/`npm run build` all pass, `.next/standalone/server.js` confirmed. Back: `npm run lint` (--fix, no unrelated files touched)/`npm test` (66 tests)/`npm run build` all pass, `dist/main.js` and `dist/migrations/*.js` confirmed. Both workflow YAML files parsed successfully with `js-yaml`. `docker version` confirms Docker Desktop's daemon is not running, so `docker build` and `docker compose -f deploy/compose.yml config` were not run — reported as unavailable, to be verified in CI or locally later.
- T5 env example is named `deploy/env.production.example` (no leading dot) on purpose: a local permission rule denies writing `.env*` files, and a non-dotted name is not confused with a real `.env`. The runbook copies it to `.env` on the server. `.gitignore` (`.env`, `.env.local`, `.env.*.local`) does not affect it.

- 2026-09-27: branches pushed; PRs opened: back #1, front #2.
- 2026-09-27: back PR #1 and front PR #2 merged; both GHCR workflows green; images anonymously pullable. Fixed seed password guidance (back PR #2: `openssl rand -hex 32` violates the 50-char/uppercase login policy; now `echo "Sm$(openssl rand -hex 12)"`).
- 2026-09-27: deployed on the VPS following the runbook. Verified from outside: `https://siricmanpropiedades.com.ar` 200 (Next.js), `https://api.siricmanpropiedades.com.ar/api/roles` 401 (auth required), `http://www.` 308 → `https://www.` 301 → apex, TCP 5432 closed. API logs: migrations ran, seed created admin/manager/user1, Caddy obtained Let's Encrypt certificates.

## Next step

Feature done. Operator follow-up: set `RUN_SEED=false` in the server `.env` and `docker compose up -d`; first admin login requires MFA setup (`docs/04-login-mfa.md`).
