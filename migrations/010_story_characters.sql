-- Named speakers + optional portraits on written stories.
-- Safe to re-run. If DB_SYNC=true, TypeORM also adds this column on boot.
--
--   psql "$DATABASE_URL" -f migrations/010_story_characters.sql

ALTER TABLE archive_items
  ADD COLUMN IF NOT EXISTS "characters" jsonb NOT NULL DEFAULT '[]'::jsonb;
