-- 027_translations_en_siblings.sql
-- Bidirectional translation support: mirror every `_hi` column with a `_en`
-- sibling. Previously the catalog assumed admin always typed English in the
-- canonical column and only auto-translated en→hi. In practice some pujas/
-- temples had Hindi canonical values, so toggling the web language picker to
-- "En" still showed Hindi text (no English sibling existed, fallback was the
-- Hindi canonical).
--
-- catalog-service v28+ detects the source language on write and produces both
-- siblings. `applyLocale` always prefers `<field>_<locale>` over the canonical
-- so users see content in their chosen language regardless of which language
-- the admin originally typed.

BEGIN;

-- ─── Pujas ───────────────────────────────────────────────────────────────────
ALTER TABLE pujas
  ADD COLUMN IF NOT EXISTS name_en               TEXT,
  ADD COLUMN IF NOT EXISTS description_en        TEXT,
  ADD COLUMN IF NOT EXISTS benefits_en           TEXT,
  ADD COLUMN IF NOT EXISTS rituals_included_en   TEXT,
  ADD COLUMN IF NOT EXISTS shlok_en              TEXT,
  ADD COLUMN IF NOT EXISTS items_used_en         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS how_will_it_happen_en TEXT[] DEFAULT '{}';

-- ─── Chadhavas ───────────────────────────────────────────────────────────────
ALTER TABLE chadhavas
  ADD COLUMN IF NOT EXISTS name_en               TEXT,
  ADD COLUMN IF NOT EXISTS description_en        TEXT,
  ADD COLUMN IF NOT EXISTS benefits_en           TEXT,
  ADD COLUMN IF NOT EXISTS rituals_included_en   TEXT,
  ADD COLUMN IF NOT EXISTS shlok_en              TEXT,
  ADD COLUMN IF NOT EXISTS items_used_en         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS how_will_it_happen_en TEXT[] DEFAULT '{}';

-- ─── Chadhava offerings ──────────────────────────────────────────────────────
ALTER TABLE chadhava_offerings
  ADD COLUMN IF NOT EXISTS item_name_en TEXT,
  ADD COLUMN IF NOT EXISTS benefit_en   TEXT;

-- ─── Temples ─────────────────────────────────────────────────────────────────
ALTER TABLE temples
  ADD COLUMN IF NOT EXISTS name_en                     TEXT,
  ADD COLUMN IF NOT EXISTS address_en                  TEXT,
  ADD COLUMN IF NOT EXISTS about_en                    TEXT,
  ADD COLUMN IF NOT EXISTS history_and_significance_en TEXT;

-- ─── Deities ─────────────────────────────────────────────────────────────────
ALTER TABLE deities
  ADD COLUMN IF NOT EXISTS name_en TEXT;

-- ─── Pujaris (added by 026) ──────────────────────────────────────────────────
ALTER TABLE pujaris
  ADD COLUMN IF NOT EXISTS name_en        TEXT,
  ADD COLUMN IF NOT EXISTS designation_en TEXT;

-- ─── Astrologers (added by 026) ──────────────────────────────────────────────
ALTER TABLE astrologers
  ADD COLUMN IF NOT EXISTS name_en        TEXT,
  ADD COLUMN IF NOT EXISTS designation_en TEXT,
  ADD COLUMN IF NOT EXISTS expertise_en   TEXT,
  ADD COLUMN IF NOT EXISTS about_en       TEXT;

-- ─── Hampers (added by 026) ──────────────────────────────────────────────────
ALTER TABLE hampers
  ADD COLUMN IF NOT EXISTS name_en                TEXT,
  ADD COLUMN IF NOT EXISTS content_description_en TEXT;

COMMIT;
