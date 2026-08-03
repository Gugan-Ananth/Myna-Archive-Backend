# 0005. Tag normalization, search, sort, and pagination

Date: 2026-08-03

## Status

Accepted

## Context

The frontend already normalizes tags and filters client-side. The backend must match that behavior so wiring the real API does not change UX.

Frontend precedents:
- Tags: trim, strip leading `#`, lowercase, de-dupe (`create-form.tsx`).
- Multi-tag filter: **AND** (item must include every selected tag) (`filter-items.ts`).
- Text: case-insensitive substring over name, description, and tags.
- Home grid sort: higher rating first, then name.

## Decision

### Tags

- Normalize on write (create/update): trim, remove a single leading `#`, lowercase, reject empty strings after normalize, de-dupe within the item.
- Create requires **at least one** tag.
- Persist normalized values; list/filter compares case-insensitively (effectively exact match on normalized form).

### List / filter

| Query | Behavior |
|-------|----------|
| `q` | Optional. Case-insensitive substring match against name, description, **or** any tag. |
| `tag` / `tags` | Optional. One or many tags; item must have **all** (AND). |
| `sort` | Default: `rating:desc,name:asc`. Allow explicit sort when useful later; v1 may only document the default. |
| `page` | 1-based, default `1`. |
| `pageSize` | Default `20`, max `100`. |

### Pagination response shape

```json
{
  "data": [ /* ArchiveItem[] */ ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

### Rating

- Inclusive range **0.0–10.0**; validation fails outside that range.
- Required on create.

## Consequences

- Aligns with current frontend filter/sort behavior when the client moves filtering server-side.
- OR tag mode is not supported in v1 (would need a new query flag + ADR note).
- Cursor pagination is deferred; offset pagination is sufficient for a personal collection.
