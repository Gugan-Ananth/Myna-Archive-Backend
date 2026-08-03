# 0002. Cloudinary for media storage and delivery

Date: 2026-08-03

## Status

Accepted (extended by [0006](0006-video-media-and-streaming.md) for video; upload path refined by [0007](0007-large-media-upload.md))

## Context

Uploads need high-quality originals, grid thumbnails (low quality first), and full-resolution media on the detail view. Binary storage in Postgres is undesirable. The product chose a media-CDN style provider over raw S3 for transform-on-delivery. The archive includes **images and videos** under one Archive Item model (see ADR 0006). Size limits reach **50 MB** (image) and **1 GB** (video), so binaries must not be proxied through Nest (see ADR 0007).

## Decision

- Use **Cloudinary** as the media store and delivery layer for **images and videos**.
- **Ingest:** signed **direct upload** browser → Cloudinary, then Nest **finalize** create with `publicId` (ADR 0007). Nest does not accept multi‑hundred‑MB request bodies as the product path.
- Nest persists `thumbnailUrl` and `mediaUrl` (and internal `publicId` / resource type) on the Archive Item after verifying the uploaded asset.
- **Thumbnail**: Cloudinary transformation URL — still image transform for photos; **poster frame** transform for videos.
- **Full media (`mediaUrl`)**: high-quality image delivery **or** progressive video URL for playback.
- On **delete** of an Archive Item, best-effort delete the Cloudinary asset via `public_id` so storage does not leak.
- **Media replace** (re-upload binary for an existing item) is **out of scope for v1**; only metadata updates.
- Nest does not proxy binary **playback** streaming; clients load `mediaUrl` / `thumbnailUrl` from Cloudinary (ADR 0006).

## Consequences

- Requires Cloudinary credentials in env (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
- Public field rename: `imageUrl` → `mediaUrl` (breaking for frontend mocks; documented in ADR 0006).
- Frontend owns the heavy upload transfer; Nest owns signing, validation, URL derivation, and metadata persistence.
- Provider lock-in is moderate; swap would need a new ADR and URL migration strategy.
