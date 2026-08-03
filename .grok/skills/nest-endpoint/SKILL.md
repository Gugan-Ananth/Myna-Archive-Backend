---
name: nest-endpoint
description: >
  Design and implement NestJS HTTP endpoints (controller methods, status codes,
  DTO wiring) for the archive API. Use when adding routes, changing REST
  contracts, or the user runs /nest-endpoint.
---

# Nest Endpoint

Add or change HTTP endpoints with a clear contract, thin controllers, and tests.

## Preconditions

1. Read `CONTEXT.md` and any ADRs that affect API shape.
2. Align request/response fields with the frontend contract when touching Archive Items.
3. Use `/nest-dto-validation` for non-trivial bodies/queries.

## Design checklist (before coding)

Write this down (in chat or ticket) first:

| Field | Example |
|-------|---------|
| Method + path | `POST /archive-items` |
| Auth | public / guard name |
| Request DTO | `CreateArchiveItemDto` |
| Success status | `201` |
| Success body | `ArchiveItem` |
| Error cases | `400` validation, `404` missing |
| Idempotency | yes/no |

Prefer REST resource style:

| Action | Method | Path pattern |
|--------|--------|--------------|
| List / filter | `GET` | `/resource` |
| Get one | `GET` | `/resource/:id` |
| Create | `POST` | `/resource` |
| Replace/update | `PATCH` or `PUT` | `/resource/:id` |
| Delete | `DELETE` | `/resource/:id` |

## Implementation steps

1. **DTO** — create or update DTO classes under `src/<feature>/dto/`.
2. **Service method** — implement behavior; throw Nest exceptions for domain failures.
3. **Controller method** — bind params/body/query, call service, set `@HttpCode` / `@HttpStatus` when not default.
4. **Swagger (optional)** — if the project already uses `@nestjs/swagger`, annotate; do not introduce Swagger in a drive-by unless asked.
5. **Tests**
   - Unit: service behavior + controller mapping (mocked service).
   - E2E: happy path + primary validation failure via Supertest when the route is user-facing.
6. **Verify**

   ```bash
   yarn test
   yarn test:e2e   # if e2e covered the route
   yarn build
   ```

## Controller rules

```ts
// Good: thin
@Post()
@HttpCode(HttpStatus.CREATED)
create(@Body() dto: CreateArchiveItemDto) {
  return this.service.create(dto);
}

// Bad: business logic / persistence in controller
```

- Use `@Param`, `@Query`, `@Body` with typed DTOs.
- Parse/validate IDs via pipes when needed (`ParseUUIDPipe` if UUIDs are the id strategy).
- Do not return raw ORM entities if they leak internal columns.

## Response consistency

- Lists: prefer `{ items, total }` or a plain array — pick one style and stick to it (record in ADR if establishing the first list endpoint).
- Errors: Nest default exception filter shape unless a global filter is already customized.

## Output

Document the final contract (method, path, sample JSON in/out) so the frontend can integrate.
