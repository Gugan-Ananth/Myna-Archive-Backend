# 0010. Category → tag taxonomy (backend vocabulary)

Date: 2026-08-06

## Status

Accepted

## Context

The frontend moved from freeform tags to a **Category → Tag** picker (Bondage, Artists, user categories, “Others”). Item tags remain `string[]` encoded as `categorySlug:tagSlug` so list filtering (`@>` AND) stays simple. Vocabulary must be shared across devices — localStorage-only is insufficient.

## Decision

1. **Keep** `archive_items.tags` as Postgres `text[]` of encoded strings (plus legacy freeform without `:`).
2. **Add** tables:
   - `tag_categories` — slug, label, builtIn, sortOrder
   - `taxonomy_tags` — category FK, slug, label, builtIn, sortOrder; unique `(categoryId, slug)`
3. **API**
   - `GET /taxonomy` — full tree + usage counts
   - `POST /taxonomy/categories` — user category (+ optional first tag)
   - `POST /taxonomy/categories/:slug/tags` — Others / custom tag
   - Existing `GET /tags` remains for flat usage summaries
4. **Seed** Bondage + Artists on `OnModuleInit` (idempotent).
5. **Create/update item** calls `ensureEncodedTags` so new pairs are registered even if the client skipped the taxonomy POSTs.
6. Schema: SQL file `migrations/001_taxonomy.sql` for `DB_SYNC=false`; synchronize still works in dev.

## Consequences

- Frontend should load vocabulary from `GET /taxonomy` instead of a local seed-only merge.
- Renaming/deleting taxonomy rows is out of scope for v1 (additive only).
- Legacy freeform tags still filter/search; UI groups them as Uncategorized.
