# Myna Archive — Domain Context

Personal media archive: store, display, search, rate, and play back **images and videos** you care about.

Companion: **Myna-Archive-FrontEnd** (Next.js). This repo is the **API backend**.

## Glossary

| Term | Definition | Avoid |
|------|------------|-------|
| **Archive Item** | A single archived media entry (image or video) with metadata (name, description, tags, rating, media type, media URLs). The primary aggregate of the system. | "post", "asset", "media object" (unless talking about binary storage) |
| **Collection** | The user's full set of archive items (implicit for a single-user product). | "library", "gallery" as domain types |
| **Media type** | Discriminator on an Archive Item: `image` or `video`. Determines upload validation, Cloudinary resource type, and detail UI (still viewer vs player). | "kind" / "format" as the public field name |
| **Tag** | Freeform hashtag-style string on an item. Normalized on write: trim, strip leading `#`, lowercase, de-dupe. At least one tag required on create. | "category", "label" as synonyms for tag |
| **Rating** | Decimal score **0.0–10.0** inclusive. Higher ranks first on the home grid. Required on create. | "stars" (UI may show stars; domain field is rating) |
| **Thumbnail** | Low-res still used for grid/list display (`thumbnailUrl`). For images: Cloudinary image transform. For videos: auto-generated **poster frame**. | confusing with full media |
| **Media URL** | Primary playback/view URL (`mediaUrl`): full-resolution image **or** progressive video stream URL (Cloudinary CDN). | `imageUrl` (superseded; do not use in new code) |
| **Image** | Archive Item with `mediaType: "image"`. Detail view shows still. | confusing with thumbnail |
| **Video** | Archive Item with `mediaType: "video"`. Detail view plays progressive video from `mediaUrl`. | treating video as a separate aggregate in v1 |
| **Filter** | API criteria to narrow the collection: text search (`q`), tags (AND), `mediaType`, sort, pagination. | "query" as a domain type name |

## Core model (API contract)

Public DTOs (frontend must migrate from the earlier image-only shape — see ADR 0006):

```ts
type MediaType = "image" | "video";

type ArchiveItem = {
  id: string;
  name: string;
  description: string;
  tags: string[];       // freeform, normalized
  rating: number;       // 0.0–10.0
  mediaType: MediaType;
  thumbnailUrl: string; // grid still / video poster
  mediaUrl: string;     // full image OR progressive video URL
};
```

### Create (two-step; large-file safe — ADR 0007)

**1. Upload signature** — `POST /api/v1/media/upload-signature`  
Declares `mediaType`, `mimeType`, `byteSize` (must be ≤ limits). Returns Cloudinary signed params.

**2. Direct upload** — browser → Cloudinary (chunked when large).

**3. Finalize item** — `POST /api/v1/archive-items` (JSON):

| Field | Required | Notes |
|-------|----------|--------|
| `publicId` | yes | From Cloudinary upload result |
| `resourceType` | yes | `image` \| `video` (Cloudinary) |
| `mediaType` | yes | `image` \| `video`; must match resource |
| `name` | yes | Non-empty string |
| `tags` | yes | ≥1 tag after normalization |
| `rating` | yes | 0.0–10.0 |
| `description` | no | Defaults to `""` |

Nest verifies the asset, enforces size/MIME, derives `mediaUrl` + `thumbnailUrl`, then persists.

**Size limits:** image **50 MB**, video **1 GB**.

### Update (JSON)

Mutable: `name`, `description`, `tags`, `rating`. Media binary replace is out of scope for v1.

### List defaults

- Sort: **rating DESC**, then **name ASC**
- Multi-tag filter: **AND**
- Search (`q`): name, description, tags (case-insensitive substring)
- Optional `mediaType=image|video`
- Pagination: `page` (default 1), `pageSize` (default 20, max 100)

### Playback / display

| `mediaType` | Grid | Detail |
|-------------|------|--------|
| `image` | `thumbnailUrl` | still from `mediaUrl` |
| `video` | `thumbnailUrl` (poster) | progressive `<video src={mediaUrl}>` (CDN, not Nest proxy) |

## Ubiquitous language rules

1. Prefer glossary terms in code names: `ArchiveItem`, `CreateArchiveItemDto`, `ArchiveItemsService`, routes under `/api/v1/archive-items`.
2. Controllers and services should speak in domain verbs: create item, list items, update rating, attach tags — not generic CRUD-only names when domain language is clearer.
3. Use `mediaUrl` / `mediaType` — do not reintroduce `imageUrl` in new API code.
4. When a new term appears during design, update this file via `/domain-modeling` / `/grill-with-docs` before it spreads into code.

## Bounded context (current)

**Single context: Archive.** One user-facing product surface. Media storage (Cloudinary image + video) is infrastructure behind the Archive Item aggregate, not a separate product context yet.

## Decisions (ADRs)

| Topic | ADR |
|-------|-----|
| Postgres + TypeORM | [0001](docs/adr/0001-postgres-persistence.md) |
| Cloudinary media | [0002](docs/adr/0002-cloudinary-media.md) |
| Single-user, no auth v1 | [0003](docs/adr/0003-single-user-no-auth-v1.md) |
| API prefix `/api/v1` | [0004](docs/adr/0004-api-version-prefix.md) |
| Tag / list / pagination semantics | [0005](docs/adr/0005-tag-and-list-semantics.md) |
| Video media kind + progressive stream | [0006](docs/adr/0006-video-media-and-streaming.md) |
| Large upload (50 MB / 1 GB, signed direct) | [0007](docs/adr/0007-large-media-upload.md) |

## Open decisions

- Final MIME allow-lists (provisional lists in ADR 0007).
- Orphan Cloudinary GC policy if finalize never runs after direct upload.
- Whether list responses include `createdAt` / `updatedAt` or `durationSeconds` for video (frontend types omit today — prefer omit until UI needs them).
- Soft-delete vs hard-delete (v1: **hard-delete** DB row + best-effort Cloudinary destroy).
- Auth model for any non-local production deploy (deferred; see ADR 0003).
- HLS / adaptive streaming if long-form video becomes common (deferred; ADR 0006).
