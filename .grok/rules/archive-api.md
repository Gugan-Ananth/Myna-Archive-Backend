# Archive API rules

- Primary resource: **Archive Item** (`CONTEXT.md`).
- Public fields stay aligned with frontend unless an ADR documents a break:
  `id`, `name`, `description`, `tags`, `rating` (0.0–10.0), `mediaType`, `thumbnailUrl`, `mediaUrl`.
- Media provider is **Bunny.net** (Edge Storage + Stream); see ADR 0002 / `CONTEXT.md`.
- Rating outside 0–10 must fail validation.
- Tags are freeform strings; do not invent a fixed taxonomy without domain docs.
- Prefer versioned global prefix once introduced (e.g. `/api/v1`) — record in ADR.
- List endpoints should document sort order (default: higher rating first when product requires it).
