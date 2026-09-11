# Myna Archive — Domain Context

Personal media archive: store, display, search, rate, and play back **images and videos** you care about.

Companion: **Myna-Archive-FrontEnd** (Next.js). This repo is the **API backend**.

## Glossary

| Term | Definition | Avoid |
|------|------------|-------|
| **Archive Item** | A single archived media entry (image or video) with metadata (name, description, optional story author, tags, rating, media type, media URLs). The primary aggregate of the system. | "post", "asset", "media object" (unless talking about binary storage) |
| **Archive section** | Top-level home grouping for an Archive Item. Image posts use images or cute-things; existing image posts default to images. | storing section membership only in the frontend |
| **Collection** | The user's full set of archive items (implicit for a single-user product). | "library", "gallery" as domain types |
| **Owner account** | The single hardcoded login (email + password in env). No signup, no password change, no extra users. | "user" as a table / multi-tenant identity |
| **Access token** | Never-expiring HMAC bearer token issued at login. Stored per device. Valid until `AUTH_TOKEN_SECRET` rotates. | "session cookie" as the API credential (cookie is a frontend concern) |
| **Media type** | Discriminator on an Archive Item: `image`, `video`, `story`, `comic`, or `caption`. Determines upload validation, Bunny product path (Storage vs Stream), and detail UI (still viewer vs player vs reader vs composed still). | "kind" / "format" as the public field name |
| **Tag** | Encoded `category:tag` string on an item (e.g. `bondage:hogtie`), or legacy freeform without `:`. Normalized on write: trim, strip leading `#`, lowercase, de-dupe. At least one tag required on create. | bare freeform for new content |
| **Category** | Named group in the taxonomy vocabulary (e.g. Bondage, Artists). Stored in `tag_categories`; seeded built-ins + user-created. | "tag" as synonym for category |
| **Taxonomy tag** | Selectable value under a category (e.g. hogtie under Bondage). Stored in `taxonomy_tags`. | freeform item tag without category |
| **Rating** | Decimal score **0.0–10.0** inclusive. Higher ranks first on the home grid. Required on create. | confusing with a category star |
| **Category star** | A saved favorite marker on an Archive Item or Original Character. Each dashboard category allows at most **10** starred entries; the Images, Cute Things, Collections, Comics, Captions, Videos, Stories, and Original Characters categories are independent. | using rating as the star state |
| **Top 10 board** | A dashboard view of the starred entries in every category. Each category contributes up to 10 entries, ordered by rating from highest to lowest. | treating Top 10 as one shared ten-item pool |
| **Thumbnail** | Low-weight still used for grid/list display (`thumbnailUrl`). For images: a stored WebP preview object (`{uuid}-preview.webp`, under 1 MB) tracked in `image_previews`. For videos: Stream **poster** (`thumbnail.jpg`). | confusing with full media; Optimizer query-string thumbs (those are not a separate file) |
| **Image preview** | The stored <1 MB WebP derived from an original image upload. Grid uses this; the detail view loads `mediaUrl` (the original). | "thumbnail query param", "optimizer transform" |
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
| **Bondage caption** | An Archive Item with `mediaType: "caption"`: a source image plus a written story, composed into one still with a layout template. Cover (`mediaAssets[0]`) is the generated still. Story text is `bodyHtml`; template/font/colors and the source photo (`sourcePublicId`) live in `captionSpec`. | meme, overlay (unless naming the overlay template), treating the PNG as the only source of truth |
| **Story character** | A named speaker in a written story chapter, with an optional portrait shown beside dialogue in the reader. Stored on the Archive Item (`characters`), not as a separate aggregate and not mixed into media assets. | "OC" as a synonym (Original Characters are a different collection), "cast", "actor" |

## Core model (API contract)

Public DTOs (frontend must migrate from the earlier image-only shape — see ADR 0006; display fields ADR 0008; image groups ADR 0009):

```ts
type MediaType = "image" | "video" | "story" | "comic" | "caption";

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
  author: string;        // story author; empty for other media types
  tags: string[];       // encoded category:tag (or legacy freeform), normalized
  rating: number;       // 0.0–10.0
  mediaType: MediaType;
  starred: boolean;     // category favorite; at most 10 per dashboard category
  section: "images" | "cute-things";
  thumbnailUrl: string; // cover preview still (stored WebP) or video poster
  mediaUrl: string;     // cover original image OR progressive video URL
  width: number | null;
  height: number | null;
  blurHash: string | null;
  mediaAssets: MediaAsset[]; // 1 for single/video/caption; 2–25 for image group; 1–80 for comic
  captionSpec: CaptionSpec | null; // layout + source photo pointer for captions
  characters: StoryCharacter[]; // story speakers; empty for other media types
};

type StoryCharacter = {
  name: string;
  publicId: string | null;   // Bunny Storage path when a portrait was uploaded
  mediaUrl: string;          // empty when using the default initials portrait
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  blurHash: string | null;
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
| `assets` | preferred | Array of `{ publicId, resourceType, width?, height?, blurHash? }`. Image: 1–10; comic: 1–80; video: exactly 1; caption: exactly 1 (generated still) |
| `section` | no | `images` by default; `cute-things` accepts exactly one image |
| `publicId` | legacy | Required if `assets` omitted — Storage path or Stream GUID |
| `resourceType` | legacy | Required if `assets` omitted — `image` \| `video` |
| `mediaType` | yes | `image` \| `video` \| `story` \| `comic` \| `caption`; must match assets |
| `captionSpec` | captions | Template, canvas, font, colors, and `sourcePublicId` of the original photo. Story text is `bodyHtml`. Cover `assets` is the generated still only. |
| `bodyHtml` | stories / captions | Story HTML, or plain caption story text |
| `name` | yes | Non-empty string |
| `tags` | yes | ≥1 tag after normalization |
| `rating` | yes | 0.0–10.0 |
| `description` | no | Defaults to `""` |
| `author` | no | Author name for written stories; defaults to `""` |
| `characters` | no | Story speakers: `{ name, publicId?, width?, height?, blurHash? }`. Max 40. Names unique (case-insensitive). Portraits verified like other images and stored off `assets`. |
| `width` / `height` / `blurHash` | no | Legacy cover-only; prefer per-asset fields inside `assets` |

Nest verifies **each** asset, derives URLs, stores ordered `mediaAssets`, and denormalizes **cover = assets[0]** onto top-level URL/dim fields. For **video**, Nest also copies Stream `width`/`height` when available. Display metadata and assets are **immutable after create** (not on `PATCH`).

**Size limits:** image **50 MB**, video **1 GB**.

### Update (JSON)

Mutable: `name`, `description`, `author` (stories), `summary` (stories), `bodyHtml` (stories/captions), `captionSpec` (captions), `assets` (stories/captions), `characters` (stories), `tags`, `rating`, `starred`.
Setting `starred` to `true` fails once the item's dashboard category already has
10 starred entries. Unstarring is always allowed. Use `starred=true|false` on
list endpoints to filter saved favorites.
**Not** mutable: `width`, `height`, `blurHash`, media URLs / binary (media replace out of scope for v1).

### List defaults

- Sort: **rating DESC**, then **name ASC**
- Multi-tag filter: **AND**
- Search (`q`): name, description, tags (case-insensitive substring)
- Optional `mediaType=image|video|story|comic|caption`
- Pagination: `page` (default 1), `pageSize` (default 20, max 100)

### Tags vocabulary

- `GET /api/v1/tags` → `{ data: TagSummary[] }` ordered by **count DESC**, **tag ASC** (usage on items)
- `GET /api/v1/taxonomy` → `{ data: TaxonomyCategory[] }` full category → tag tree with counts
- `POST /api/v1/taxonomy/categories` → body `{ label, firstTag?: { label } }` create user category
- `POST /api/v1/taxonomy/categories/:categorySlug/tags` → body `{ label }` add tag (Others)
- Seed built-ins on boot: **Bondage**, **Artists**
- Create/update item auto-registers any new `category:tag` pairs into taxonomy
- SQL migrations: apply the files in `migrations/` in filename order (or use
  `DB_SYNC=true`); `migrations/007_stars.sql` adds persisted category stars.

### Playback / display

| `mediaType` | Grid | Detail |
|-------------|------|--------|
| `image` (1 asset) | BlurHash → cover `thumbnailUrl` | still from cover `mediaUrl` |
| `image` (2–25 group) | Cover only (+ optional “N photos” badge) | carousel over `mediaAssets` |
| `comic` (1–80 pages) | Cover only (+ page-count badge) | vertical page reader over `mediaAssets` |
| `caption` (2 images) | Generated still (`mediaAssets[0]`) | still viewer; Edit caption regenerates from source + spec |
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
| Bondage captions | [0014](docs/adr/0014-captions.md) |
| Archive item list performance | [0013](docs/adr/0013-archive-item-list-performance.md) |

## Open decisions

- Final MIME allow-lists (provisional lists in ADR 0007).
- Orphan Bunny GC policy if finalize never runs after direct upload.
- Whether list responses include `createdAt` / `updatedAt` or `durationSeconds` for video (frontend types omit today — prefer omit until UI needs them).
- Soft-delete vs hard-delete (v1: **hard-delete** DB row + best-effort Bunny destroy).
- Whether a future deploy should rotate the access token on every new-device login (today every valid token stays alive).
- HLS / adaptive streaming if long-form video becomes common (deferred; ADR 0006).
- Time-limited image upload tokens (Edge Storage currently returns zone AccessKey for single-user v1).
- Backfill of `width` / `height` / `blurHash` for pre-0008 items (leave null until needed).
- Additional indexes for free-text `q` search (trigram or `tsvector`) remain open; media/section/group and tag-list indexes are covered by [ADR 0013](docs/adr/0013-archive-item-list-performance.md).
