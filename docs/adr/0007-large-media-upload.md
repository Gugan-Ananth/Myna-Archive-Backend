# 0007. Large media upload (50 MB images, 1 GB videos)

Date: 2026-08-03

## Status

Accepted

## Context

Product size limits are **50 MB per image** and **1 GB per video**. Proxying those binaries through NestJS (multipart → buffer/stream → Bunny) is a poor fit:

- Long request timeouts and reverse-proxy body limits
- High memory/CPU on the API process under concurrent uploads
- Failed mid-transfer leaves partial state hard to reason about
- 1 GB progressive uploads need **chunked / resumable** transfer (Bunny Stream **TUS**)

Playback remains progressive CDN URLs (ADR 0006). Only the **ingest** path is specified here.

## Decision

### Size limits (product)

| Kind | Max size | MIME allow-list (provisional) |
|------|----------|-------------------------------|
| image | **50 MB** | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| video | **1 GB** | `video/mp4`, `video/webm`, `video/quicktime` |

Configurable via env (e.g. `MAX_IMAGE_BYTES`, `MAX_VIDEO_BYTES`); enforced in signature params and on finalize.

### Upload pattern: direct-to-Bunny + Nest finalize

**Do not** send multi‑hundred‑MB / GB files as the Nest request body in production.

```
1) FE  →  POST /api/v1/media/upload-signature
         body: { mediaType, mimeType, byteSize, fileName? }
         ←  Bunny credentials (discriminated by mediaType):

            image:
              { provider: "bunny", uploadMethod: "PUT",
                publicId, uploadUrl, accessKey, headers,
                chunkSize, maxBytes, resourceType, mediaType }

            video:
              { provider: "bunny", uploadMethod: "TUS",
                publicId (= videoId), tusEndpoint, libraryId, videoId,
                expirationTime, signature, chunkSize, maxBytes, ... }

2) FE  →  Bunny (direct)
         - images: HTTP PUT to Edge Storage uploadUrl with AccessKey header
         - videos: TUS client → https://video.bunnycdn.com/tusupload
                    (headers: AuthorizationSignature, AuthorizationExpire,
                     LibraryId, VideoId)
         ←  success (TUS complete / Storage 201)

3) FE  →  POST /api/v1/archive-items  (JSON, not multipart file)
         body: name, tags, rating, description?,
               publicId, resourceType, mediaType
         ←  201 ArchiveItem { mediaUrl, thumbnailUrl, ... }
```

Nest responsibilities:

- Issue **upload credentials** (Stream API key never leaves the server; storage AccessKey is returned for image PUT in single-user v1 — ADR 0003)
- For video: **create Stream video object** first, then SHA256-presign TUS upload
- Reject signature requests over max size or disallowed MIME / mediaType mismatch
- On create: **verify** the asset exists (Storage GET/list or Stream Get Video), ensure bytes ≤ limit (when known), derive `mediaUrl` + `thumbnailUrl`, persist row + internal `publicId`
- On delete: destroy Bunny asset (Storage DELETE or Stream Delete Video)
- **Never** buffer a full 1 GB file in Node memory

### Chunking / resumable

- **Video:** Frontend uses a **TUS** client (`tus-js-client` or equivalent) against Bunny Stream.
- **Image:** Single PUT is fine under 50 MB; optional client chunking is not required by Edge Storage API.
- Nest documents recommended `chunkSize` (e.g. 20 MB) in the signature response for client guidance; it does not implement chunk assembly itself.

### What Nest will not do in v1

- Multipart proxy of the full binary for production creates
- Resumable protocol of Nest’s own design (rely on Bunny Stream TUS)
- Local disk staging of uploads

Optional **dev-only** small multipart helper may exist for e2e fixtures under a tight size cap; not the product path.

### Orphans

If step 2 succeeds and step 3 never runs, Bunny may hold an unreferenced asset (Storage object or empty Stream video). Acceptable for single-user v1; optional later: folder prefix / library GC of assets older than N hours with no DB row.

### Timeouts / infra

- Nest request timeouts stay short (signature + JSON create only). Video signature does one Stream Create Video API call.
- Bunny upload timeouts are a **client/CDN** concern.
- API reverse proxies need only normal JSON body sizes, not 1 GB `client_max_body_size`.

## Consequences

- Create Archive Item remains **two client steps** (upload media, then create with `publicId`).
- Frontend create form must branch on `uploadMethod`: Storage PUT vs Stream TUS.
- Security: Stream TUS signatures expire via `expirationTime`. Storage image AccessKey is long-lived — acceptable only while the API is private/single-user (ADR 0003).
- E2E tests mock Bunny or use a test zone/library + small fixtures; do not push 1 GB through CI.
