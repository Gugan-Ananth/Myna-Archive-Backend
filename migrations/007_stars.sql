-- Allow up to ten starred items in each dashboard category.
-- Safe to re-run. Existing items are unstarred.

ALTER TABLE archive_items
  ADD COLUMN IF NOT EXISTS "starred" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS archive_items_starred_idx
  ON archive_items ("starred")
  WHERE "starred" = true;

ALTER TABLE original_characters
  ADD COLUMN IF NOT EXISTS "starred" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS original_characters_starred_idx
  ON original_characters ("starred")
  WHERE "starred" = true;
