# 0003. Single-user, no authentication in v1

Date: 2026-08-03

## Status

Superseded by [0011](0011-single-account-session-auth.md)

## Context

Myna Archive is a personal image archive. For the initial backend, the operator wants a local/dev-friendly API without multi-tenant accounts.

## Decision

- Treat the system as **single-user / single collection**.
- **No auth** on routes in v1 (no JWT, OAuth, or API keys).
- Do not introduce a `userId` column on Archive Items in v1.
- Document that production exposure without auth is unsafe; add auth via a later ADR before public deploy.

## Consequences

- Faster vertical slices and simpler e2e tests.
- All clients that can reach the API can read/write/delete.
- Multi-user or shared collections require schema + auth work later.
