-- Taxonomy tables for category → tag vocabulary.
-- Safe to re-run: uses IF NOT EXISTS.
--
-- If you use DB_SYNC=true (TypeORM synchronize), tables are created on boot
-- and this file is optional. For production / DB_SYNC=false, run:
--
--   psql "$DATABASE_URL" -f migrations/001_taxonomy.sql
--
-- Then restart the API so seedBuiltIns() fills Bondage + Artists.

CREATE TABLE IF NOT EXISTS tag_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(80) NOT NULL UNIQUE,
  label varchar(120) NOT NULL,
  "builtIn" boolean NOT NULL DEFAULT false,
  "sortOrder" int NOT NULL DEFAULT 100,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS taxonomy_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "categoryId" uuid NOT NULL REFERENCES tag_categories(id) ON DELETE CASCADE,
  slug varchar(80) NOT NULL,
  label varchar(120) NOT NULL,
  "builtIn" boolean NOT NULL DEFAULT false,
  "sortOrder" int NOT NULL DEFAULT 100,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("categoryId", slug)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_tags_slug ON taxonomy_tags (slug);

-- pgcrypto / gen_random_uuid is built-in on Postgres 13+.
-- On older Postgres, enable: CREATE EXTENSION IF NOT EXISTS pgcrypto;
