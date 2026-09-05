-- Stored <1 MB WebP still for each original image object.
-- Safe to re-run. If DB_SYNC=true, TypeORM also creates this table on boot.
--
--   psql "$DATABASE_URL" -f migrations/011_image_previews.sql

CREATE TABLE IF NOT EXISTS image_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "originalPublicId" varchar(512) NOT NULL UNIQUE,
  "previewPublicId" varchar(512) NOT NULL,
  "previewUrl" text NOT NULL,
  bytes integer NOT NULL,
  width integer NULL,
  height integer NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_previews_preview_public_id_idx
  ON image_previews ("previewPublicId");
