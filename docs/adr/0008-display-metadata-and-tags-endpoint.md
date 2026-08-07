# 0008. Display metadata (dimensions, BlurHash) + dedicated tags endpoint

Date: 2026-08-05

## Status

Accepted

## Context

Grid and filter UX are slow for reasons that the current API forces onto the client:

1. **Tags** — There is no collection-wide tag API. The frontend pages `GET /archive-items` (or loads all pages) to build a distinct tag list for the filter picker.
2. **Masonry** — List items expose only URLs. The client must download or measure each image to know aspect ratio before laying out the grid, causing layout shift and delayed paint.
3. **Progressive previews** — Thumbnails still require a network round-trip. There is no compact placeholder encoded with the item metadata for true LQIP.

Upload remains **direct-to-Bunny + Nest finalize** (ADR 0007). Bunny Edge Storage does not return pixel dimensions on verify; Stream can return width/height once processing has advanced.

## Decision

### 1. `GET /api/v1/tags`

Dedicated endpoint for the collection tag vocabulary:

| Concern | Rule |
|---------|------|
| Path | `/api/v1/tags` (top-level, not nested under `archive-items`) |
| Response | `{ "data": [ { "tag": string, "count": number }, ... ] }` |
| Ordering | **count DESC**, then **tag ASC** |
| Filters | None in v1 (no `mediaType`, no `q`) |
| Normalization | Tags already stored normalized (ADR 0005); return as stored |

Implementation sketch: `unnest(tags)` + `GROUP BY` over `archive_items`.

### 2. Pixel dimensions on Archive Item

Public fields (nullable):

- `width: number | null` — pixels, positive integer when known
- `height: number | null` — pixels, positive integer when known

**Ingest:**

| Kind | Source |
|------|--------|
| **image** | Client may send `width` / `height` on `POST /archive-items`. Nest persists them. No Nest binary probe required for v1. |
| **video** | Nest persists Stream `width` / `height` when available at finalize; otherwise `null`. |

**Mutability:** set only on create (not on `PATCH`). Media replace remains out of scope (ADR 0002).

**Existing rows:** remain `null` until re-created or a future backfill job (not part of this change).

### 3. BlurHash for progressive previews

Public field (nullable):

- `blurHash: string | null` — compact BlurHash (not a data-URL LQIP)

**Ingest:** client generates BlurHash after local decode (image, or video poster / first frame) and may send `blurHash` on create. Nest validates format/length and stores.

**Not** generated server-side in v1 (avoids downloading media into Nest on finalize).

**Mutability:** create only; existing items stay `null`.

### 4. Create DTO extensions (all optional)

On `POST /api/v1/archive-items`:

| Field | Validation |
|-------|------------|
| `width` | Optional positive integer |
| `height` | Optional positive integer |
| `blurHash` | Optional string; reject empty/whitespace; reasonable max length (e.g. 100) |

If only one of width/height is sent, reject (both required together). Video may still get dimensions from Stream even when the client omits them.

### 5. Explicit non-goals (this ADR)

- Server-side BlurHash or dimension probing with `sharp` / full download
- Backfill job for historical items
- Tiny base64 data-URL LQIP field (BlurHash only)
- Tag autocomplete / `mediaType` filter on `GET /tags`
- GIN / full-text search indexes (optional follow-up if list/`q` becomes slow)

## Consequences

- Frontend contract **extends** (additive, non-breaking): new nullable fields on Archive Item; new `GET /tags`. Clients that ignore new fields keep working.
- Filter UI can load tags in **one request** instead of paging the whole collection.
- Masonry can size cells from `width`/`height` without measuring media when present.
- Grid can paint BlurHash placeholders immediately while thumbnails load.
- Create path stays fast: no Nest image download for dims/hash.
- Items without client metadata (or old rows) still work; FE must tolerate `null`.
- Optional later: GIN on `tags`, trigram/`tsvector` for `q`, admin backfill for dims + BlurHash.
