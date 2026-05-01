-- 013_translations.sql
-- Adds Hindi (`_hi`) sibling columns to every translatable English field on
-- the public-facing catalog tables. The catalog-service reads `?locale=hi`
-- and uses COALESCE(NULLIF(<col>_hi,''), <col>) so untranslated rows
-- transparently fall back to English.
--
-- Auto-population: catalog-service v9+ calls Cloud Translation API on
-- admin POST/PATCH and writes the `_hi` value in the same transaction.
-- A one-time backfill script handles existing seed rows.

BEGIN;

-- ─── Pujas ───────────────────────────────────────────────────────────────────
ALTER TABLE pujas
  ADD COLUMN IF NOT EXISTS name_hi               TEXT,
  ADD COLUMN IF NOT EXISTS description_hi        TEXT,
  ADD COLUMN IF NOT EXISTS benefits_hi           TEXT,
  ADD COLUMN IF NOT EXISTS rituals_included_hi   TEXT,
  ADD COLUMN IF NOT EXISTS items_used_hi         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS how_will_it_happen_hi TEXT[] DEFAULT '{}';

-- ─── Chadhavas ───────────────────────────────────────────────────────────────
ALTER TABLE chadhavas
  ADD COLUMN IF NOT EXISTS name_hi               TEXT,
  ADD COLUMN IF NOT EXISTS description_hi        TEXT,
  ADD COLUMN IF NOT EXISTS benefits_hi           TEXT,
  ADD COLUMN IF NOT EXISTS rituals_included_hi   TEXT,
  ADD COLUMN IF NOT EXISTS items_used_hi         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS how_will_it_happen_hi TEXT[] DEFAULT '{}';

-- ─── Chadhava offerings (line items shown on the chadhava detail page) ───────
ALTER TABLE chadhava_offerings
  ADD COLUMN IF NOT EXISTS item_name_hi TEXT,
  ADD COLUMN IF NOT EXISTS benefit_hi   TEXT;

-- ─── Temples ─────────────────────────────────────────────────────────────────
ALTER TABLE temples
  ADD COLUMN IF NOT EXISTS name_hi                     TEXT,
  ADD COLUMN IF NOT EXISTS address_hi                  TEXT,
  ADD COLUMN IF NOT EXISTS about_hi                    TEXT,
  ADD COLUMN IF NOT EXISTS history_and_significance_hi TEXT;

-- ─── Deities ─────────────────────────────────────────────────────────────────
ALTER TABLE deities
  ADD COLUMN IF NOT EXISTS name_hi TEXT;

COMMIT;
