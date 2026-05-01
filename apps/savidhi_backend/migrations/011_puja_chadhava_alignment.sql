-- 011_puja_chadhava_alignment.sql
-- Aligns pujas + chadhavas schema with the admin CRUD form spec (PDF pages 12-14)
-- and with the rich-content fields the catalog-service routes already expect.
--
-- Adds to pujas:    description, items_used[], how_will_it_happen[], duration_minutes
-- Adds to chadhavas: description, items_used[], how_will_it_happen[], duration_minutes,
--                    default_pujari_id, lunar_phase
-- Plus unique indexes on (puja_id, start_time) and (chadhava_id, start_time) so
-- the upcoming auto event-generation endpoint can use ON CONFLICT DO NOTHING.

BEGIN;

-- ─── Pujas: rich-content columns ────────────────────────────────────────────
ALTER TABLE pujas ADD COLUMN IF NOT EXISTS description        TEXT;
ALTER TABLE pujas ADD COLUMN IF NOT EXISTS items_used         TEXT[] DEFAULT '{}';
ALTER TABLE pujas ADD COLUMN IF NOT EXISTS how_will_it_happen TEXT[] DEFAULT '{}';
ALTER TABLE pujas ADD COLUMN IF NOT EXISTS duration_minutes   INT;

-- ─── Chadhavas: parity with pujas + PDF page 13 spec ────────────────────────
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS description        TEXT;
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS items_used         TEXT[] DEFAULT '{}';
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS how_will_it_happen TEXT[] DEFAULT '{}';
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS duration_minutes   INT;
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS default_pujari_id  UUID REFERENCES pujaris(id);
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS lunar_phase        VARCHAR(50);

-- ─── Idempotency for auto event generation (Part 4 of plan) ──────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uniq_puja_events_puja_start
  ON puja_events(puja_id, start_time);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_chadhava_events_chadhava_start
  ON chadhava_events(chadhava_id, start_time);

-- ─── Backfill: populate description from benefits for existing rows so the
--     public detail page has a sensible long-form summary on day 1. ─────────
UPDATE pujas      SET description = benefits  WHERE description IS NULL;
UPDATE chadhavas  SET description = benefits  WHERE description IS NULL;

-- ─── Backfill: duration_minutes default for existing rows ───────────────────
UPDATE pujas      SET duration_minutes = 60 WHERE duration_minutes IS NULL;
UPDATE chadhavas  SET duration_minutes = 30 WHERE duration_minutes IS NULL;

COMMIT;
