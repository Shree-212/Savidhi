-- Adds a per-event toggle for prasad delivery. Customer booking timelines
-- omit the prasad-related steps when this flag is false. Defaults to true so
-- existing events keep the prasad steps until the admin opts a specific
-- event out.

ALTER TABLE puja_events
  ADD COLUMN IF NOT EXISTS has_prasad BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE chadhava_events
  ADD COLUMN IF NOT EXISTS has_prasad BOOLEAN NOT NULL DEFAULT TRUE;
