-- 009_schema_alignment.sql
-- Aligns schema with the PDF spec (pages 12-13 puja config, page 19 dependency rules):
--   1. Pujas + chadhavas: per-event scheduling fields (start_date, start_end_times[], repeat_*)
--   2. Pujas: rename max_bookings_per_event → max_devotee
--   3. puja_bookings: enforce devotee_count ∈ {1,2,4,6}
--   4. lookup_values table for predefined string lists (gotra, designations, languages, etc.)
--   5. Drop astrologers.off_days[] (replaced by astrologer_blackout_dates table from 004)
--   6. Drop temples.is_active (PDF: cannot be disabled, only deleted)

BEGIN;

-- ─── 1 + 2. Pujas: scheduling alignment ──────────────────────────────────────
ALTER TABLE pujas ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE pujas ADD COLUMN IF NOT EXISTS start_end_times TIMESTAMPTZ[] DEFAULT '{}';
ALTER TABLE pujas ADD COLUMN IF NOT EXISTS repeat_duration VARCHAR(20)
  CHECK (repeat_duration IS NULL OR repeat_duration IN ('LUNAR_PHASE', 'MONTH_DATE', 'WEEK_DAYS'));
ALTER TABLE pujas ADD COLUMN IF NOT EXISTS repeats_on TEXT[] DEFAULT '{}';

-- Rename max_bookings_per_event → max_devotee (PDF naming).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pujas' AND column_name='max_bookings_per_event'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pujas' AND column_name='max_devotee'
  ) THEN
    EXECUTE 'ALTER TABLE pujas RENAME COLUMN max_bookings_per_event TO max_devotee';
  END IF;
END $$;

-- ─── Chadhavas: scheduling alignment ─────────────────────────────────────────
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS start_end_times TIMESTAMPTZ[] DEFAULT '{}';
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS repeat_duration VARCHAR(20)
  CHECK (repeat_duration IS NULL OR repeat_duration IN ('LUNAR_PHASE', 'MONTH_DATE', 'WEEK_DAYS'));
ALTER TABLE chadhavas ADD COLUMN IF NOT EXISTS repeats_on TEXT[] DEFAULT '{}';

-- ─── 3. puja_bookings.devotee_count ∈ {1,2,4,6} ──────────────────────────────
ALTER TABLE puja_bookings DROP CONSTRAINT IF EXISTS puja_bookings_devotee_count_check;
ALTER TABLE puja_bookings
  ADD CONSTRAINT puja_bookings_devotee_count_check
  CHECK (devotee_count IN (1, 2, 4, 6));

-- ─── 4. lookup_values for predefined string lists ────────────────────────────
CREATE TABLE IF NOT EXISTS lookup_values (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    VARCHAR(50) NOT NULL,
  value       VARCHAR(100) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, value)
);
CREATE INDEX IF NOT EXISTS idx_lookup_values_category ON lookup_values(category, sort_order);

INSERT INTO lookup_values (category, value, sort_order) VALUES
  ('pujari_designation', 'Head Priest',              10),
  ('pujari_designation', 'Senior Priest',            20),
  ('pujari_designation', 'Junior Priest',            30),
  ('pujari_designation', 'Assistant',                40),
  ('astrologer_designation', 'Vedic Astrologer',     10),
  ('astrologer_designation', 'Numerologist',         20),
  ('astrologer_designation', 'Vastu Consultant',     30),
  ('astrologer_designation', 'Tarot Reader',         40),
  ('bank_name', 'State Bank of India',               10),
  ('bank_name', 'HDFC Bank',                         20),
  ('bank_name', 'ICICI Bank',                        30),
  ('bank_name', 'Axis Bank',                         40),
  ('bank_name', 'Punjab National Bank',              50),
  ('bank_name', 'Bank of Baroda',                    60),
  ('bank_name', 'Kotak Mahindra Bank',               70),
  ('bank_name', 'Yes Bank',                          80),
  ('bank_name', 'IndusInd Bank',                     90),
  ('bank_name', 'Canara Bank',                       100),
  ('gotra', 'Bharadwaja',  10),
  ('gotra', 'Kashyapa',    20),
  ('gotra', 'Vasishta',    30),
  ('gotra', 'Atri',        40),
  ('gotra', 'Vishvamitra', 50),
  ('gotra', 'Gautama',     60),
  ('gotra', 'Jamadagni',   70),
  ('gotra', 'Agastya',     80),
  ('gotra', 'Shandilya',   90),
  ('gotra', 'Pulastya',    100),
  ('language', 'Hindi',     10),
  ('language', 'English',   20),
  ('language', 'Sanskrit',  30),
  ('language', 'Tamil',     40),
  ('language', 'Telugu',    50),
  ('language', 'Kannada',   60),
  ('language', 'Marathi',   70),
  ('language', 'Bengali',   80),
  ('language', 'Gujarati',  90),
  ('language', 'Punjabi',   100),
  ('admin_role', 'ADMIN',           10),
  ('admin_role', 'BOOKING_MANAGER', 20),
  ('admin_role', 'VIEW_ONLY',       30)
ON CONFLICT (category, value) DO NOTHING;

-- ─── 5. Drop astrologers.off_days[] (use astrologer_blackout_dates instead) ──
ALTER TABLE astrologers DROP COLUMN IF EXISTS off_days;

-- ─── 6. Drop temples.is_active (cannot be disabled, only deleted) ────────────
ALTER TABLE temples DROP COLUMN IF EXISTS is_active;

-- ─── 7. Appointments: add YET_TO_START status (between LINK_YET_TO_BE_GENERATED and INPROGRESS) ───
-- PDF: once meet_link is added → YET_TO_START; once scheduled_at-30min → INPROGRESS;
-- once scheduled_at + duration → COMPLETED. The auto-complete worker drives these transitions.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('LINK_YET_TO_BE_GENERATED', 'YET_TO_START', 'INPROGRESS', 'COMPLETED', 'CANCELLED'));

COMMIT;
