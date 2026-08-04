# 0001. Postgres persistence for Archive Items

Date: 2026-08-03

## Status

Accepted

## Context

The personal archive must persist Archive Item metadata (name, description, tags, rating, media URLs) reliably. The product explicitly targets Postgres as the system of record. The NestJS app is greenfield.

## Decision

- Use **PostgreSQL** as the primary database.
- Use **TypeORM** via `@nestjs/typeorm` for entities, repositories, and migrations (Nest-first-party path; reversible if pain appears).
- Store tags as a Postgres `text[]` column on the archive item row (no separate tags table in v1).
- Store **`mediaType`** (`image` | `video`) plus only **URLs** (and optional provider `publicId` / resource type) for media — never binary blobs in Postgres.
- Use UUID string `id` values aligned with the frontend `ArchiveItem.id: string` contract.
- Public media field is **`mediaUrl`** (not `imageUrl`); see ADR 0006.

## Consequences

- Local/dev requires a running Postgres (Docker Compose recommended).
- Tag filtering uses array containment / overlap operators; full-text search can start with `ILIKE` / simple filters and evolve later.
- Schema changes go through TypeORM migrations once migrations are introduced.
- Frontend continues to receive tags as `string[]` — no contract break.
