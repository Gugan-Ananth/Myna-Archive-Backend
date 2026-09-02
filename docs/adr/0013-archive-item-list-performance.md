# 0013. Archive Item list performance

Date: 2026-09-02

## Status

Accepted

## Context

The archive home page requests a sorted, paginated list of image items and
uses `imageGroup=false` to exclude image groups. The previous query calculated
`jsonb_array_length(mediaAssets)` while scanning rows, executed a separate
`COUNT` query, and selected the full story body for every list row.

## Decision

1. Add a stored generated `mediaAssetCount` column to `archive_items`. It
   preserves the legacy behavior for NULL or non-array JSONB and stays in sync
   when `mediaAssets` changes.
2. Filter image groups using `mediaAssetCount` rather than parsing JSONB in
   list, tag-summary, and category-star queries.
3. Return the page and total from one query using `COUNT(*) OVER()`.
4. Add PostgreSQL indexes for media/section/sort, the Images single-item and
   group views, and the existing `tags` containment filter.
5. Select `bodyHtml` on list queries only when stories may be present. The
   public response mapper continues to return `bodyHtml: ""` for non-story
   items.
6. Apply the same one-query pagination pattern to Original Characters, add
   composite list indexes for Original Characters and taxonomy tag ordering,
   and run taxonomy archive-tag rewrites as set-based SQL updates.

Separate image, group, comic, and video tables are not introduced: they would
duplicate the Archive Item aggregate and add cross-table write/delete
coordination without addressing the identified query costs.

## Consequences

- Apply `migrations/008_archive_item_list_indexes.sql` and
  `migrations/009_secondary_list_indexes.sql` to databases running with
  `DB_SYNC=false`.
- Entity index metadata keeps the new indexes available with `DB_SYNC=true`;
  the migration creates the exact mixed-direction sort indexes and the GIN
  index that TypeORM decorators cannot express here.
- Free-text `q` search still uses the existing case-insensitive substring
  semantics and may need a trigram or full-text index if the collection grows
  substantially. Taxonomy counts still scan the compact `tags` arrays, but
  the taxonomy read now runs that aggregation in parallel with its category
  read.
