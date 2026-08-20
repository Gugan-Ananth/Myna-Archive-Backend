-- Story series + chapter numbers on archive_items.
-- Safe to re-run. If DB_SYNC=true, TypeORM also adds these on boot.

ALTER TABLE archive_items
  ADD COLUMN IF NOT EXISTS "seriesId" uuid NULL;

ALTER TABLE archive_items
  ADD COLUMN IF NOT EXISTS "chapterNumber" int NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS archive_items_series_id_idx
  ON archive_items ("seriesId");
