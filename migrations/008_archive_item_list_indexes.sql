-- List performance for archive item cards and image/group filters.
-- Safe to re-run. Apply after migrations/001 through 007.
--
-- mediaAssetCount is stored rather than calculated in every list/count query.
-- The generated expression preserves legacy behavior for NULL/non-array JSONB.

ALTER TABLE archive_items
  ADD COLUMN IF NOT EXISTS "mediaAssetCount" int GENERATED ALWAYS AS (
    CASE
      WHEN "mediaAssets" IS NOT NULL
        AND jsonb_typeof("mediaAssets") = 'array'
      THEN jsonb_array_length("mediaAssets")
      ELSE 0
    END
  ) STORED;

-- Supports mediaType + section lists while preserving the API sort order.
CREATE INDEX IF NOT EXISTS archive_items_media_section_sort_idx
  ON archive_items ("mediaType", "section", "rating" DESC, "name" ASC);

-- These partial indexes match the two image homepage views exactly. They let
-- PostgreSQL walk rows in display order without evaluating JSONB per row.
CREATE INDEX IF NOT EXISTS archive_items_images_single_sort_idx
  ON archive_items ("rating" DESC, "name" ASC)
  WHERE "mediaType" = 'image'
    AND "section" = 'images'
    AND "mediaAssetCount" <= 1;

CREATE INDEX IF NOT EXISTS archive_items_images_group_sort_idx
  ON archive_items ("rating" DESC, "name" ASC)
  WHERE "mediaType" = 'image'
    AND "mediaAssetCount" >= 2;

-- Supports AND tag filters without changing the existing text[] contract.
CREATE INDEX IF NOT EXISTS archive_items_tags_gin_idx
  ON archive_items USING GIN ("tags");

-- Refresh planner statistics after adding the generated column and indexes.
ANALYZE archive_items;
