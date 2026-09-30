> **Target repository note**: This capability spec targets the **back repo** (`back-siricmanpropiedades`), not the front repo hosting this change folder. It is authored here, under `admin-session`'s change folder, because the SDD tooling for this session is scoped to the front repo. At archive time, this file's content is promoted to `back-siricmanpropiedades/openspec/specs/auth-session-read/spec.md`. The back repo currently has no existing auth spec under `openspec/specs/`, so this is a full new spec, not a delta.

# Auth Session Read Specification

## Purpose

A non-rotating, read-only session-identity endpoint (`GET /api/auth/me`) that lets a caller holding a valid full-session JWT confirm who it is authenticated as, without mutating any server-side auth state. It exists so BFF clients (and any other consumer) can check "who is signed in" repeatedly without triggering the token rotation that `GET /api/auth/check-status` performs.

## Requirements

### Requirement: Non-Rotating Session Read

The system MUST expose `GET /api/auth/me`, requiring a valid full-session bearer token via the existing `@Auth()` guard chain (the same `JwtStrategy` used by `check-status` and `logout`).

On success, the endpoint MUST return exactly `{ id, userName, isActive, roles }` where `roles` is the array of role names held by the user, with `HTTP 200`.

The endpoint MUST NOT revoke the calling token, MUST NOT issue a new token, and MUST NOT write to the revoked-token store or any other session-mutating state. Calling it repeatedly with the same valid token MUST succeed every time until that token naturally expires or is revoked by an unrelated action (e.g. logout).

#### Scenario: Valid full-session token

- GIVEN a valid, non-expired, non-revoked full-session JWT (no `scope` claim) for an active user
- WHEN the client calls `GET /api/auth/me` with that token as a Bearer credential
- THEN the response is `200` with body `{ id, userName, isActive, roles }`
- AND the values match the authenticated user's current `id`, `userName`, `isActive`, and role names

#### Scenario: Repeated calls do not rotate or revoke the token

- GIVEN a valid full-session JWT
- WHEN the client calls `GET /api/auth/me` twice in succession with the same token
- THEN both calls return `200` with the same identity payload
- AND the token used for the first call remains valid and usable for the second call
- AND no new token is issued and no entry is added to the revoked-token store as a result of either call

### Requirement: Scoped Token Rejection

The endpoint MUST reject any bearer token carrying a `scope` claim (`mfa_verify` or `mfa_setup`) with `401 Unauthorized`, using the same scope check the `JwtStrategy` already applies to every guarded route.

#### Scenario: mfa_verify-scoped token rejected

- GIVEN a token issued during login with `scope: "mfa_verify"` (pending MFA verification)
- WHEN the client calls `GET /api/auth/me` with that token
- THEN the response is `401 Unauthorized`
- AND no identity payload is returned

#### Scenario: mfa_setup-scoped token rejected

- GIVEN a token issued during login with `scope: "mfa_setup"` (pending MFA enrollment)
- WHEN the client calls `GET /api/auth/me` with that token
- THEN the response is `401 Unauthorized`
- AND no identity payload is returned

### Requirement: Invalid, Expired, or Revoked Token Rejection

The endpoint MUST reject requests with a missing, malformed, expired, or revoked bearer token with `401 Unauthorized`, consistent with every other `@Auth()`-guarded route in the module.

#### Scenario: Missing Authorization header

- GIVEN a request with no `Authorization` header
- WHEN the client calls `GET /api/auth/me`
- THEN the response is `401 Unauthorized`

#### Scenario: Expired token

- GIVEN a full-session JWT whose expiration (`JWT_EXPIRES_IN`, 60 minutes) has passed
- WHEN the client calls `GET /api/auth/me` with that token
- THEN the response is `401 Unauthorized`

#### Scenario: Revoked token

- GIVEN a full-session JWT whose `jti` has been recorded in the revoked-token store (e.g. after logout)
- WHEN the client calls `GET /api/auth/me` with that token
- THEN the response is `401 Unauthorized`

### Requirement: Inactive User Consistency

The endpoint MUST reuse the existing `JwtStrategy` validation path unchanged, so a token belonging to a user whose account has since become inactive (`isActive: false`) is rejected with `401 Unauthorized`, identically to how `check-status` and `logout` already behave for inactive users. No new inactive-user handling is introduced by this endpoint.

#### Scenario: Token valid but user is now inactive

- GIVEN a full-session JWT that was valid when issued, for a user whose account has since been set to `isActive: false`
- WHEN the client calls `GET /api/auth/me` with that token
- THEN the response is `401 Unauthorized`, matching the existing `JwtStrategy` behavior applied to any other guarded route for an inactive user
