-- Server-side request IP log. Safe to re-run: uses IF NOT EXISTS.
--
-- If you use DB_SYNC=true (TypeORM synchronize), tables are created on boot
-- and this file is optional. For production / DB_SYNC=false, run:
--
--   psql "$DATABASE_URL" -f migrations/004_request_logs.sql

CREATE TABLE IF NOT EXISTS request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip varchar(45) NOT NULL,
  method varchar(16) NOT NULL,
  path varchar(512) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs ("createdAt");
