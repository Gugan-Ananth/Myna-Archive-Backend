# 0004. Global API prefix `/api/v1`

Date: 2026-08-03

## Status

Accepted

## Context

The Nest app will expose REST endpoints consumed by Myna-Archive-FrontEnd. A stable, versioned prefix avoids ad-hoc path drift and eases future breaking changes.

## Decision

- Set a global prefix: **`/api/v1`**.
- Primary resource routes under **`/api/v1/archive-items`** (glossary term: Archive Item).
- Health/readiness may live outside the versioned resource tree if useful (e.g. `/health`), but product APIs stay under `/api/v1`.

## Consequences

- Frontend base URL should target `/api/v1`.
- Breaking contract changes can introduce `/api/v2` without immediately removing v1.
