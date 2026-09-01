-- Separate image posts into the Images and Cute Things sections.
-- Safe to re-run. Existing archive items remain in Images.

ALTER TABLE archive_items
  ADD COLUMN IF NOT EXISTS "section" varchar(32) NOT NULL DEFAULT 'images';

CREATE INDEX IF NOT EXISTS archive_items_section_idx
  ON archive_items ("section");
