# Archive API rules

- The public item response includes a section field; Cute Things is a separate
  single-image section from Images.

- Primary resource: **Archive Item** (`CONTEXT.md`).
- Public fields stay aligned with frontend unless an ADR documents a break:
  Archive items may be scoped to the Images or Cute Things archive section;
  Cute Things accepts exactly one image asset per item.
  `id`, `name`, `description`, `author` (stories), `tags`, `rating` (0.0–10.0), `mediaType`,
  `starred` (at most 10 per dashboard category),
  `thumbnailUrl`, `mediaUrl`, `width`, `height`, `blurHash`, `mediaAssets[]`.
- Category stars are independent for Images, Cute Things, Collections, Comics,
  Videos, Stories, and Original Characters. `PATCH` may set `starred`; setting
  it to true beyond the category limit returns a validation error. List endpoints
  accept `starred=true|false`.
- The frontend Top 10 board composes one `starred=true&pageSize=10` list per
  category; archive lists use the default rating-descending sort.
- **Image groups** (ADR 0009): `mediaType: image` with **2–10** assets; cover is index 0
  (denormalized onto top-level URL/dim fields). Video is always **exactly one** asset.
- Create prefers `assets[]` (per-file `publicId` + `resourceType` + optional dims/blurHash).
  Legacy single-asset `publicId`/`resourceType` still accepted when `assets` is omitted.
- Multi-upload = N × `POST /media/upload-signature` + N × direct Bunny PUT + one finalize.
- `GET /tags` returns `{ data: [{ tag, count }] }` (count DESC, tag ASC) — do not force
  clients to page all items for the filter picker.
- Media provider is **Bunny.net** (Edge Storage + Stream); see ADR 0002 / `CONTEXT.md`.
- Rating outside 0–10 must fail validation.
- Tags are freeform strings; do not invent a fixed taxonomy without domain docs.
- Prefer versioned global prefix once introduced (e.g. `/api/v1`) — record in ADR.
- List endpoints should document sort order (default: higher rating first when product requires it).
- On delete, destroy **every** Bunny asset in `mediaAssets` (best-effort).
