---
name: nest-entity
description: >
  Introduce persistence for NestJS features: entity/model shape, repository
  boundary, and module wiring without leaking ORM types through the HTTP API.
  Use when adding a database model, repository, or the user runs /nest-entity.
---

# Nest Entity / Persistence Boundary

## Principles

1. **HTTP contract ≠ storage schema.** Controllers return API DTOs / domain shapes from `CONTEXT.md`, not raw ORM rows with internal columns.
2. **One write model for Archive Item** until an ADR introduces CQRS or multiple stores.
3. **Repository or Nest provider** as the persistence seam — services depend on an abstract port when testing needs it; otherwise a concrete provider is fine for early stages.
4. **No drive-by ORM choice.** If the project has not picked Postgres/TypeORM/Prisma/etc., stop and write or update an ADR before adding heavy dependencies.

## When no ORM is chosen yet

Prefer an in-memory or file-backed repository behind a clear interface so features can ship:

```ts
export interface ArchiveItemsRepository {
  create(data: CreateArchiveItemData): Promise<ArchiveItem>;
  findById(id: string): Promise<ArchiveItem | null>;
  findAll(filter?: ArchiveItemFilter): Promise<ArchiveItem[]>;
  update(id: string, data: UpdateArchiveItemData): Promise<ArchiveItem | null>;
  delete(id: string): Promise<boolean>;
}
```

Register the implementation as a provider:

```ts
{ provide: ARCHIVE_ITEMS_REPOSITORY, useClass: InMemoryArchiveItemsRepository }
```

## When an ORM is chosen (follow the ADR)

### TypeORM-style layout (example)

```
src/archive-items/
  entities/archive-item.entity.ts
  archive-items.repository.ts   # optional custom repo
  archive-items.service.ts
  archive-items.module.ts
```

- Entity fields map to storage; map to `ArchiveItem` API type in the service.
- Migrations live in a project-standard folder once migrations are enabled — never auto-sync schema in production.

### Prisma-style layout (example)

- Schema in `prisma/schema.prisma`
- Service uses `PrismaService`; map Prisma models → domain/API types.

## Mapping rules

| Layer | Type |
|-------|------|
| HTTP in | `CreateArchiveItemDto` / `UpdateArchiveItemDto` |
| Domain / API out | `ArchiveItem` (see `CONTEXT.md`) |
| Persistence | Entity / Prisma model / table row |

Map explicitly in the service or a small mapper function. Do not return entities from controllers if they contain secrets, internal flags, or different field names.

## IDs

- Default: string IDs (`uuid` v4) unless ADR says otherwise.
- Generate IDs in the service or DB default — document which.

## Soft delete / timestamps

Only add `createdAt`, `updatedAt`, `deletedAt` when product needs them; document in ADR if they become part of the public API.

## Tests

- Unit-test the service with a fake repository.
- Integration-test the real repository against a test DB only when infrastructure exists (Docker compose, testcontainers, etc.).

## Checklist

- [ ] ADR exists or is written for storage technology
- [ ] Repository/port boundary is clear
- [ ] Service maps to API `ArchiveItem`
- [ ] Module providers registered
- [ ] No ORM types leaked from controller
