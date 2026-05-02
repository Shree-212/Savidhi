-- 014: Add missing deity_id column to chadhavas.
-- Mirrors pujas.deity_id (001_init.sql) — nullable FK, ON DELETE not specified
-- (defaults to NO ACTION, matching pujas).
--
-- Why missing: commit 8773465 (2026-05-02) added the deity dropdown to the
-- admin chadhava form and whitelisted `deity_id` in the catalog-service
-- POST/PATCH handler, but no ALTER TABLE shipped. Result: every admin
-- chadhava create returned 500 with
-- `column "deity_id" of relation "chadhavas" does not exist`.

ALTER TABLE chadhavas
  ADD COLUMN IF NOT EXISTS deity_id UUID REFERENCES deities(id);

CREATE INDEX IF NOT EXISTS idx_chadhavas_deity ON chadhavas(deity_id);
