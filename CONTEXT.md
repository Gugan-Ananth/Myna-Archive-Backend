# Myna Archive — Domain Context

Personal media archive: store, display, search, rate, and play back **images and videos** you care about.

Companion: **Myna-Archive-FrontEnd** (Next.js). This repo is the **API backend**.

## Glossary

| Term | Definition | Avoid |
|------|------------|-------|
| **Archive Item** | A single archived media entry (image or video) with metadata (name, description, tags, rating, media type, media URLs). The primary aggregate of the system. | "post", "asset", "media object" (unless talking about binary storage) |
| **Collection** | The user's full set of archive items (implicit for a single-user product). | "library", "gallery" as domain types |
| **Owner account** | The single hardcoded login (email + password in env). No signup, no password change, no extra users. | "user" as a table / multi-tenant identity |
| **Access token** | Never-expiring HMAC bearer token issued at login. Stored per device. Valid until `AUTH_TOKEN_SECRET` rotates. | "session cookie" as the API credential (cookie is a frontend concern) |
| **Media type** | Discriminator on an Archive Item: `image`, `video`, `story`, or `comic`. Determines upload validation, Bunny product path (Storage vs Stream), and detail UI (still viewer vs player vs reader). | "kind" / "format" as the public field name |
| **Tag** | Encoded `category:tag` string on an item (e.g. `bondage:hogtie`), or legacy freeform without `:`. Normalized on write: trim, strip leading `#`, lowercase, de-dupe. At least one tag required on create. | bare freeform for new content |
| **Category** | Named group in the taxonomy vocabulary (e.g. Bondage, Artists). Stored in `tag_categories`; seeded built-ins + user-created. | "tag" as synonym for category |
| **Taxonomy tag** | Selectable value under a category (e.g. hogtie under Bondage). Stored in `taxonomy_tags`. | freeform item tag without category |
| **Rating** | Decimal score **0.0–10.0** inclusive. Higher ranks first on the home grid. Required on create. | "stars" (UI may show stars; domain field is rating) |
| **Thumbnail** | Low-res still used for grid/list display (`thumbnailUrl`). For images: Bunny Optimizer query on CDN URL. For videos: Stream **poster** (`thumbnail.jpg`). | confusing with full media |
| **Media URL** | Primary playback/view URL (`mediaUrl`): full-resolution image **or** progressive video stream URL (Bunny CDN / Stream). | `imageUrl` (superseded; do not use in new code) |
| **Image** | Archive Item with `mediaType: "image"`. Detail view shows still. | confusing with thumbnail |
| **Video** | Archive Item with `mediaType: "video"`. Detail view plays progressive video from `mediaUrl`. | treating video as a separate aggregate in v1 |
| **Filter** | API criteria to narrow the collection: text search (`q`), tags (AND), `mediaType`, sort, pagination. | "query" as a domain type name |
| **Tag summary** | A collection-wide tag vocabulary entry: normalized tag string + usage count (how many archive items carry that tag). Exposed via `GET /tags`, not by paging items. | "tag cloud", "label stats" as API type names |
| **Display dimensions** | Pixel `width` and `height` of the primary media, stored on the Archive Item for masonry layout without client measurement. Nullable when unknown (legacy rows, video still processing). | "aspect ratio only" as the stored fields (derive ratio from width/height) |
| **BlurHash** | Compact placeholder string for progressive grid previews (LQIP). Generated client-side at upload; Nest stores and returns it. Nullable when not provided. | "LQIP data URL", "dominant color" as substitutes unless product adds them |
| **Media asset** | One uploaded binary + derived URLs within an Archive Item (cover or carousel slide). | "attachment", "file" as API type names |
| **Image group** | An Archive Item with `mediaType: "image"` and **2–25** media assets. Homepage shows the **cover** (first asset) only; detail scrolls the rest. | "album", "gallery" as separate aggregates |
| **Comic** | An Archive Item with `mediaType: "comic"` and **1–80** ordered page images. Cover is the first page. Own collection section and vertical reader — not an oversized image group. | "album", "image group", "story" as synonyms |

## Core model (API contract)

Public DTOs (frontend must migrate from the earlier image-only shape — see ADR 0006; display fields ADR 0008; image groups ADR 0009):

```ts
type MediaType = "image" | "video" | "story" | "comic";

type MediaAsset = {
  publicId: string;
  resourceType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  blurHash: string | null;
};

type ArchiveItem = {
  id: string;
  name: string;
  description: string;
  tags: string[];       // encoded category:tag (or legacy freeform), normalized
  rating: number;       // 0.0–10.0
  mediaType: MediaType;
  thumbnailUrl: string; // cover (first asset) — grid
  mediaUrl: string;     // cover full image OR progressive video URL
  width: number | null;
  height: number | null;
  blurHash: string | null;
  mediaAssets: MediaAsset[]; // 1 for single/video; 2–25 for image group; 1–80 for comic
};

type TagSummary = {
  tag: string;          // encoded value as stored on items
  count: number;
};

type TaxonomyCategory = {
  slug: string;
  label: string;
  builtIn: boolean;
  tags: Array<{ slug: string; label: string; builtIn: boolean; count: number }>;
};
```

### Create (two-step; large-file safe — ADR 0007)

**1. Upload signature** — `POST /api/v1/media/upload-signature`  
Declares `mediaType`, `mimeType`, `byteSize` (must be ≤ limits). Returns Bunny credentials:

- **image:** Edge Storage `PUT` URL + AccessKey (`uploadMethod: "PUT"`)
- **video:** Stream TUS presign after Nest creates a video object (`uploadMethod: "TUS"`)

**2. Direct upload** — browser → Bunny (Storage PUT or Stream TUS).

**3. Finalize item** — `POST /api/v1/archive-items` (JSON):

| Field | Required | Notes |
|-------|----------|--------|
| `assets` | preferred | Array of `{ publicId, resourceType, width?, height?, blurHash? }`. Image: 1–10; comic: 1–80; video: exactly 1 |
| `publicId` | legacy | Required if `assets` omitted — Storage path or Stream GUID |
| `resourceType` | legacy | Required if `assets` omitted — `image` \| `video` |
| `mediaType` | yes | `image` \| `video` \| `story` \| `comic`; must match assets |
| `name` | yes | Non-empty string |
| `tags` | yes | ≥1 tag after normalization |
| `rating` | yes | 0.0–10.0 |
| `description` | no | Defaults to `""` |
| `width` / `height` / `blurHash` | no | Legacy cover-only; prefer per-asset fields inside `assets` |

Nest verifies **each** asset, derives URLs, stores ordered `mediaAssets`, and denormalizes **cover = assets[0]** onto top-level URL/dim fields. For **video**, Nest also copies Stream `width`/`height` when available. Display metadata and assets are **immutable after create** (not on `PATCH`).

**Size limits:** image **50 MB**, video **1 GB**.

### Update (JSON)

Mutable: `name`, `description`, `tags`, `rating`.  
**Not** mutable: `width`, `height`, `blurHash`, media URLs / binary (media replace out of scope for v1).

### List defaults

- Sort: **rating DESC**, then **name ASC**
- Multi-tag filter: **AND**
- Search (`q`): name, description, tags (case-insensitive substring)
- Optional `mediaType=image|video|story|comic`
- Pagination: `page` (default 1), `pageSize` (default 20, max 100)

### Tags vocabulary

- `GET /api/v1/tags` → `{ data: TagSummary[] }` ordered by **count DESC**, **tag ASC** (usage on items)
- `GET /api/v1/taxonomy` → `{ data: TaxonomyCategory[] }` full category → tag tree with counts
- `POST /api/v1/taxonomy/categories` → body `{ label, firstTag?: { label } }` create user category
- `POST /api/v1/taxonomy/categories/:categorySlug/tags` → body `{ label }` add tag (Others)
- Seed built-ins on boot: **Bondage**, **Artists**
- Create/update item auto-registers any new `category:tag` pairs into taxonomy
- SQL migration: `migrations/001_taxonomy.sql` (or `DB_SYNC=true`)

### Playback / display

| `mediaType` | Grid | Detail |
|-------------|------|--------|
| `image` (1 asset) | BlurHash → cover `thumbnailUrl` | still from cover `mediaUrl` |
| `image` (2–25 group) | Cover only (+ optional “N photos” badge) | carousel over `mediaAssets` |
| `comic` (1–80 pages) | Cover only (+ page-count badge) | vertical page reader over `mediaAssets` |
| `video` | BlurHash → `thumbnailUrl` (poster) | progressive `<video src={mediaUrl}>` |

Use cover `width`/`height` when present for masonry cell aspect ratio without measuring the media.

## Ubiquitous language rules

1. Prefer glossary terms in code names: `ArchiveItem`, `CreateArchiveItemDto`, `ArchiveItemsService`, routes under `/api/v1/archive-items`.
2. Controllers and services should speak in domain verbs: create item, list items, update rating, attach tags — not generic CRUD-only names when domain language is clearer.
3. Use `mediaUrl` / `mediaType` — do not reintroduce `imageUrl` in new API code.
4. When a new term appears during design, update this file via `/domain-modeling` / `/grill-with-docs` before it spreads into code.

## Bounded context (current)

**Single context: Archive.** One user-facing product surface. Media storage (Bunny Edge Storage + Stream) is infrastructure behind the Archive Item aggregate, not a separate product context yet.

## Decisions (ADRs)

| Topic | ADR |
|-------|-----|
| Postgres + TypeORM | [0001](docs/adr/0001-postgres-persistence.md) |
| Bunny.net media | [0002](docs/adr/0002-bunny-media.md) |
| Single-user, no auth v1 (superseded) | [0003](docs/adr/0003-single-user-no-auth-v1.md) |
| Single-account never-expiring session | [0011](docs/adr/0011-single-account-session-auth.md) |
| API prefix `/api/v1` | [0004](docs/adr/0004-api-version-prefix.md) |
| Tag / list / pagination semantics | [0005](docs/adr/0005-tag-and-list-semantics.md) |
| Video media kind + progressive stream | [0006](docs/adr/0006-video-media-and-streaming.md) |
| Large upload (50 MB / 1 GB, direct + finalize) | [0007](docs/adr/0007-large-media-upload.md) |
| Display metadata + tags endpoint | [0008](docs/adr/0008-display-metadata-and-tags-endpoint.md) |
| Image groups (multi-image items) | [0009](docs/adr/0009-image-groups.md) |
| Comics (page sequences) | [0012](docs/adr/0012-comics.md) |

## Open decisions

- Final MIME allow-lists (provisional lists in ADR 0007).
- Orphan Bunny GC policy if finalize never runs after direct upload.
- Whether list responses include `createdAt` / `updatedAt` or `durationSeconds` for video (frontend types omit today — prefer omit until UI needs them).
- Soft-delete vs hard-delete (v1: **hard-delete** DB row + best-effort Bunny destroy).
- Whether a future deploy should rotate the access token on every new-device login (today every valid token stays alive).
- HLS / adaptive streaming if long-form video becomes common (deferred; ADR 0006).
- Time-limited image upload tokens (Edge Storage currently returns zone AccessKey for single-user v1).
- Backfill of `width` / `height` / `blurHash` for pre-0008 items (leave null until needed).
- DB indexes for tag filter / `q` search (GIN on `tags`, trigram or `tsvector`) if collection size makes list slow.
