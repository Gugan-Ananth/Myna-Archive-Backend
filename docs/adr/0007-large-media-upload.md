# 0007. Large media upload (50 MB images, 1 GB videos)

Date: 2026-08-03

## Status

Accepted

## Context

Product size limits are **50 MB per image** and **1 GB per video**. Proxying those binaries through NestJS (multipart → buffer/stream → Cloudinary) is a poor fit:

- Long request timeouts and reverse-proxy body limits
- High memory/CPU on the API process under concurrent uploads
- Failed mid-transfer leaves partial state hard to reason about
- 1 GB progressive uploads need **chunked** transfer, which Cloudinary supports natively from the client

Playback remains progressive CDN URLs (ADR 0006). Only the **ingest** path changes relative to the earlier “multipart entire file to Nest” sketch.

## Decision

### Size limits (product)

| Kind | Max size | MIME allow-list (provisional) |
|------|----------|-------------------------------|
| image | **50 MB** | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| video | **1 GB** | `video/mp4`, `video/webm`, `video/quicktime` |

Configurable via env (e.g. `MAX_IMAGE_BYTES`, `MAX_VIDEO_BYTES`); enforced in signature params and on finalize.

### Upload pattern: signed direct-to-Cloudinary + Nest finalize

**Do not** send multi‑hundred‑MB / GB files as the Nest request body in production.

```
1) FE  →  POST /api/v1/media/upload-signature
         body: { mediaType, mimeType, byteSize, fileName? }
         ←  { cloudName, apiKey, timestamp, signature, folder, publicId?,
              resourceType, chunkSize?, maxBytes }

2) FE  →  Cloudinary upload API (direct)
         - images: single request if under provider limits
         - large videos: Cloudinary chunked upload
         ←  { public_id, resource_type, bytes, format, ... }

3) FE  →  POST /api/v1/archive-items  (JSON, not multipart file)
         body: name, tags, rating, description?,
               publicId, resourceType, mediaType,
               (optional: etag/version/bytes from Cloudinary for checks)
         ←  201 ArchiveItem { mediaUrl, thumbnailUrl, ... }
```

Nest responsibilities:

- Issue **signed** upload parameters (secret never leaves the server)
- Reject signature requests over max size or disallowed MIME / mediaType mismatch
- On create: **verify** the asset exists in Cloudinary (Admin/API get by `public_id`), ensure bytes ≤ limit, derive `mediaUrl` + `thumbnailUrl` (image transform or video poster), persist row + internal `publicId`
- On delete: destroy Cloudinary asset (unchanged)
- **Never** buffer a full 1 GB file in Node memory

### Chunking

- Frontend uses Cloudinary’s **chunked upload** for files above a client threshold (recommend **≥ 20 MB**, and always for video near the GB range).
- Nest documents the recommended `chunkSize` (e.g. 20 MB) in the signature response; it does not implement chunk assembly itself.

### What Nest will not do in v1

- Multipart proxy of the full binary for production creates
- Resumable protocol of Nest’s own design (rely on Cloudinary chunked upload)
- Local disk staging of uploads

Optional **dev-only** small multipart helper may exist for e2e fixtures under a tight size cap; not the product path.

### Orphans

If step 2 succeeds and step 3 never runs, Cloudinary may hold an unreferenced asset. Acceptable for single-user v1; optional later: folder prefix + periodic GC of assets older than N hours with no DB row.

### Timeouts / infra

- Nest request timeouts stay short (signature + JSON create only).
- Cloudinary upload timeouts are a **client/CDN** concern.
- API reverse proxies need only normal JSON body sizes, not 1 GB `client_max_body_size`.

## Consequences

- Create Archive Item becomes **two client steps** (upload media, then create with `publicId`).
- Frontend create form must use signature + Cloudinary upload (chunked for large video).
- Supersedes “multipart file + metadata in one Nest POST” as the primary design (ADRs 0002 / 0006 updated to point here).
- Security: signatures must bind `folder` / allowed `resource_type` and expire via `timestamp`; still no user auth in v1 (ADR 0003) so anyone who can hit the API can obtain a signature — acceptable only while the API is private.
- E2E tests mock Cloudinary or use a test cloud + small fixtures; do not push 1 GB through CI.
