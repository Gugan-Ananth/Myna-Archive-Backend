# 0009. Image groups (multi-image Archive Items)

Date: 2026-08-05

## Status

Accepted

## Context

Users want to upload several related images as **one** archive entry (e.g. 4–5 photos of the same subject), with:

- Homepage: **one cover** pin for the whole group
- Detail: horizontal navigation across images
- Cap: **max 10 images** per group
- Videos stay **single-asset** only

Previously each Archive Item held exactly one `publicId` / `mediaUrl`.

## Decision

1. Add ordered **`mediaAssets`** (JSONB) on `archive_items`.
2. **Cover** fields (`mediaUrl`, `thumbnailUrl`, `width`, `height`, `blurHash`, `publicId`, `resourceType`) remain denormalized from **index 0** for list/grid performance.
3. Create accepts **`assets[]`** (preferred) or legacy single `publicId` + `resourceType`.
4. Rules:
   - `mediaType: image` → 1–10 assets, all `resourceType: image`
   - `mediaType: video` → exactly 1 asset, `resourceType: video`
5. Delete destroys **every** asset in `mediaAssets`.
6. Legacy rows without `mediaAssets` synthesize a one-element array from cover columns.

## Consequences

- Frontend carousel uses `mediaAssets`; grid uses cover only (+ optional “N photos” badge).
- Multi-upload = N Bunny signatures + N PUTs + one finalize with `assets[]`.
- Media replace / reordering of slides after create remains out of scope for v1.
