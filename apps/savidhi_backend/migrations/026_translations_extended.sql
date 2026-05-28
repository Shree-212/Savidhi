-- 026_translations_extended.sql
-- Extends the auto-translation pipeline (introduced in 013) to every remaining
-- public-facing catalog table whose text fields the customer web app displays.
-- catalog-service v10+ writes Hindi siblings via Cloud Translation on POST/PATCH
-- and lazy-backfills missing rows on GET. apps/savidhi_admin keeps editing only
-- the canonical English columns — admins never see `_hi` fields.

BEGIN;

-- ─── Pujaris ─────────────────────────────────────────────────────────────────
ALTER TABLE pujaris
  ADD COLUMN IF NOT EXISTS name_hi        TEXT,
  ADD COLUMN IF NOT EXISTS designation_hi TEXT;

-- ─── Astrologers ─────────────────────────────────────────────────────────────
-- `languages` stays untranslated — it's a tag-style list (e.g. "Hindi", "Tamil")
-- that doubles as a filter facet on the consult page.
ALTER TABLE astrologers
  ADD COLUMN IF NOT EXISTS name_hi        TEXT,
  ADD COLUMN IF NOT EXISTS designation_hi TEXT,
  ADD COLUMN IF NOT EXISTS expertise_hi   TEXT,
  ADD COLUMN IF NOT EXISTS about_hi       TEXT;

-- ─── Hampers ─────────────────────────────────────────────────────────────────
ALTER TABLE hampers
  ADD COLUMN IF NOT EXISTS name_hi                TEXT,
  ADD COLUMN IF NOT EXISTS content_description_hi TEXT;

COMMIT;
