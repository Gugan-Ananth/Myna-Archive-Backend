# 0002. Bunny.net for media storage and delivery

Date: 2026-08-03

## Status

Accepted (extended by [0006](0006-video-media-and-streaming.md) for video; upload path refined by [0007](0007-large-media-upload.md))

Originally drafted for Cloudinary; **provider switched to Bunny.net** (same product plan: direct upload + Nest finalize, CDN delivery, no Nest binary proxy).

## Context

Uploads need high-quality originals, grid thumbnails (low quality first), and full-resolution media on the detail view. Binary storage in Postgres is undesirable. The product chose a media-CDN style provider over raw S3 for transform-on-delivery. The archive includes **images and videos** under one Archive Item model (see ADR 0006). Size limits reach **50 MB** (image) and **1 GB** (video), so binaries must not be proxied through Nest (see ADR 0007).

## Decision

- Use **Bunny.net** as the media store and delivery layer:
  - **Images:** Edge **Storage Zone** + **Pull Zone** CDN (optional **Bunny Optimizer** query transforms for thumbnails).
  - **Videos:** **Bunny Stream** (library + TUS resumable direct upload + CDN progressive MP4 fallback).
- **Ingest:** signed / credentialed **direct upload** browser → Bunny, then Nest **finalize** create with `publicId` (ADR 0007). Nest does not accept multi‑hundred‑MB request bodies as the product path.
- Nest persists `thumbnailUrl` and `mediaUrl` (and internal `publicId` / resource type) on the Archive Item after verifying the uploaded asset.
- **Thumbnail**:
  - Image: CDN URL + Optimizer query (e.g. `?width=480&height=270&aspect_ratio=16:9`).
  - Video: Stream poster (`…/{videoId}/thumbnail.jpg`).
- **Full media (`mediaUrl`)**: high-quality image CDN URL **or** progressive Stream MP4 URL (`…/play_{resolution}p.mp4`) for playback.
- On **delete** of an Archive Item, best-effort delete the Bunny asset (Storage file or Stream video) via `publicId` so storage does not leak.
- **Media replace** (re-upload binary for an existing item) is **out of scope for v1**; only metadata updates.
- Nest does not proxy binary **playback** streaming; clients load `mediaUrl` / `thumbnailUrl` from Bunny CDN (ADR 0006).

## Consequences

- Requires Bunny credentials in env (storage zone + stream library + CDN hostnames). See `.env.example`.
- Public field rename: `imageUrl` → `mediaUrl` (breaking for frontend mocks; documented in ADR 0006).
- Frontend owns the heavy upload transfer; Nest owns credential issuance, validation, URL derivation, and metadata persistence.
- **Image uploads:** Edge Storage has no Cloudinary-style time-limited signature; for single-user v1 (ADR 0003) Nest returns the storage AccessKey for a one-shot PUT to a Nest-chosen path. Tighten before multi-tenant auth.
- **Video uploads:** Stream TUS uses SHA256 presign (`libraryId + apiKey + expiration + videoId`) — secret never leaves the server.
- Provider lock-in is moderate; swap would need a new ADR and URL migration strategy.
- Enable **MP4 fallback** on the Stream library so progressive `play_*p.mp4` URLs work for simple `<video src>`.
