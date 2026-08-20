-- Written stories: HTML body on archive_items.
-- Safe to re-run. If DB_SYNC=true, TypeORM also adds this column on boot.
--
--   psql "$DATABASE_URL" -f migrations/002_stories.sql

ALTER TABLE archive_items
  ADD COLUMN IF NOT EXISTS "bodyHtml" text NOT NULL DEFAULT '';
