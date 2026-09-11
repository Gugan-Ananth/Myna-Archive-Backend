-- Bondage captions: layout spec JSON on archive_items.
-- Safe to re-run. If DB_SYNC=true, TypeORM also adds this column on boot.
--
--   psql "$DATABASE_URL" -f migrations/012_captions.sql

ALTER TABLE archive_items
  ADD COLUMN IF NOT EXISTS "captionSpec" jsonb;

COMMENT ON COLUMN archive_items."captionSpec" IS
  'Layout options for mediaType=caption. Story text lives in bodyHtml.';
