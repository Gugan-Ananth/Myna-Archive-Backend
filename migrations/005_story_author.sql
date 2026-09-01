-- Optional author name for written stories.
-- Safe to re-run. If DB_SYNC=true, TypeORM also adds this column on boot.

ALTER TABLE archive_items
  ADD COLUMN IF NOT EXISTS "author" varchar(300) NOT NULL DEFAULT '';
