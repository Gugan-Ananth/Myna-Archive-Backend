-- Cover the remaining paginated list and taxonomy ordering queries.
-- Safe to re-run. Apply after migrations/001 through 008.

CREATE INDEX IF NOT EXISTS original_characters_list_sort_idx
  ON original_characters ("createdAt" DESC, "name" ASC);

CREATE INDEX IF NOT EXISTS original_characters_starred_sort_idx
  ON original_characters ("createdAt" DESC, "name" ASC)
  WHERE "starred" = true;

CREATE INDEX IF NOT EXISTS taxonomy_tags_category_sort_idx
  ON taxonomy_tags ("categoryId", "sortOrder" ASC, "label" ASC);

ANALYZE original_characters;
ANALYZE taxonomy_tags;
