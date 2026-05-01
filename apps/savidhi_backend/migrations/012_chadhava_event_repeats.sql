-- 012_chadhava_event_repeats.sql
-- Plug a hole missed by 011: the chadhavas table never had an event_repeats
-- column (it was only added to pujas in 001_init.sql). The catalog-service v7
-- chadhavas POST/PATCH writes this column, so without it any "create chadhava
-- with repeat" attempt would 500 with "column event_repeats does not exist".

BEGIN;

ALTER TABLE chadhavas
  ADD COLUMN IF NOT EXISTS event_repeats BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing chadhavas where repeat_duration is set should clearly
-- be repeating, so flip the flag for them. Otherwise leave at default false.
UPDATE chadhavas
   SET event_repeats = true
 WHERE repeat_duration IS NOT NULL
   AND event_repeats = false;

COMMIT;
