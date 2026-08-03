# 0006. Video as Archive Item media kind + progressive streaming

Date: 2026-08-03

## Status

Accepted (ingest size/path: see [0007](0007-large-media-upload.md))

## Context

The archive is expanding beyond still images: users should upload videos, see a poster/thumbnail in the grid, and play full quality on the detail view. Images and videos share the same metadata and discovery model (name, tags, rating, description, search, AND tag filter, sort, pagination).

Cloudinary already handles image delivery (ADR 0002). Progressive URLs are preferred over HLS for v1 so the frontend can use a simple `<video src>`. Videos may be up to **1 GB** (ADR 0007).

## Decision

### Domain

- One aggregate: **Archive Item**, with **`mediaType`: `image` | `video`**.
- Same list/get/update/delete flows for both kinds; create uses signed direct upload + finalize (ADR 0007).
- **No** separate `/videos` resource in v1.

### Public API contract (deliberate frontend change)

```ts
type MediaType = "image" | "video";

type ArchiveItem = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  rating: number; // 0.0–10.0
  mediaType: MediaType;
  thumbnailUrl: string; // grid poster / low-res still
  mediaUrl: string;     // full image OR progressive video URL
};
```

- **`imageUrl` is superseded by `mediaUrl`.** Frontend must migrate; dual-field transition is optional and temporary if needed during cutover.
- Binary **replace** of media remains out of scope for v1 (metadata-only PATCH).

### Upload (summary; full detail in ADR 0007)

- Client obtains a **Cloudinary upload signature** from Nest, uploads the file **directly** to Cloudinary (chunked for large video), then creates the Archive Item via JSON with `publicId` + metadata.
- Nest derives kind from declared `mediaType` / Cloudinary `resource_type`.
- Cloudinary:
  - **Image**: high-quality delivery → `mediaUrl`; transform → `thumbnailUrl`.
  - **Video**: progressive delivery URL → `mediaUrl`; auto **poster frame** → `thumbnailUrl`.
- Persist internal `publicId` + `resourceType` for destroy on delete.

### Streaming (playback)

- v1 streaming = **progressive URL from Cloudinary CDN**, not Nest proxying video bytes.
- Client uses `mediaUrl` directly (`<video src={mediaUrl} poster={thumbnailUrl} controls />` or equivalent).
- Nest does **not** implement Range-request streaming of binary content in v1.
- **HLS / adaptive streaming** is deferred (future ADR if long-form video needs it).

### List filter extension

| Query | Behavior |
|-------|----------|
| `mediaType` | Optional. `image` \| `video`. When omitted, return both. |

Search, tags (AND), sort, pagination unchanged (ADR 0005).

### Limits

| Kind | Max size | MIME (allow-list) |
|------|----------|-------------------|
| image | **50 MB** | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| video | **1 GB** | `video/mp4`, `video/webm`, `video/quicktime` |

See ADR 0007 for enforcement and chunked upload.

### Duration / extra metadata

- **Not required in v1 public contract.** Cloudinary may return duration; optional later field `durationSeconds` without blocking upload/playback.

## Consequences

- Frontend `ArchiveItem` type and any mock data must add `mediaType` and rename `imageUrl` → `mediaUrl`.
- Grid always uses `thumbnailUrl` (image transform or video poster).
- Detail view branches on `mediaType`: image viewer vs video player.
- Large-file transfer complexity lives on the client + Cloudinary, not Nest request timeouts.
- Delete still destroys the Cloudinary asset (image or video) via `public_id`.
- Extends ADR 0002; does not supersede it.
