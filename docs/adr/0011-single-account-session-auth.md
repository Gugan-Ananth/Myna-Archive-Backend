# 0011. Single-account never-expiring session

Date: 2026-08-29

## Status

Accepted (supersedes [0003](0003-single-user-no-auth-v1.md))

## Context

Myna Archive is a personal collection with one operator. v1 shipped with no auth (ADR 0003). The archive is now reached from more than localhost, so the API must stop being open to whoever can hit the host — without growing a user table, signup, or password-change UI.

## Decision

- **One hardcoded account.** Email and password live in env (`AUTH_EMAIL`, `AUTH_PASSWORD`). There is no user row, no register endpoint, and no change-password endpoint.
- **Login** `POST /api/v1/auth/login` with `{ email, password }` returns `{ accessToken }`. Wrong credentials → 401 with a generic message.
- **Access token** is an HMAC (`myna1.<payload>.<sig>`) with **no expiry claim**. It stays valid until `AUTH_TOKEN_SECRET` rotates.
- **Every `/api/v1` route except login** requires `Authorization: Bearer <token>`. `/health` stays public.
- **Per device, not per time.** A new browser/device has no cookie, so it must sign in. Devices that already hold a valid token stay signed in. Logging in on device B does **not** revoke device A.
- Do not add `userId` on Archive Items — the collection is still a singleton.

## Consequences

- Companion frontend stores the token in an httpOnly cookie and attaches it on every API call.
- Rotating `AUTH_TOKEN_SECRET` signs everyone out (the only way to globally invalidate tokens).
- Changing the account means editing env and restarting Nest — never through the product UI.
- Direct callers of the Nest host without a token now receive 401.
