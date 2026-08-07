# Archive API rules

- Primary resource: **Archive Item** (`CONTEXT.md`).
- Public fields stay aligned with frontend unless an ADR documents a break:
  `id`, `name`, `description`, `tags`, `rating` (0.0–10.0), `mediaType`,
  `thumbnailUrl`, `mediaUrl`, `width`, `height`, `blurHash`, `mediaAssets[]`.
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
