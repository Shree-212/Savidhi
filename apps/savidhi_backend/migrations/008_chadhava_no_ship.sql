-- 008_chadhava_no_ship.sql
-- PDF spec: chadhava has NO prasad shipping. The terminal stage after sankalp
-- is COMPLETED, not TO_BE_SHIPPED / SHIPPED. Drop the shipping columns from
-- chadhava_bookings and tighten the chadhava_events.stage check constraint.

BEGIN;

-- 1. chadhava_events.stage — drop the old constraint FIRST so we can update rows
-- to the new COMPLETED value, then add the new constraint.
ALTER TABLE chadhava_events DROP CONSTRAINT IF EXISTS chadhava_events_stage_check;
UPDATE chadhava_events SET stage = 'COMPLETED' WHERE stage IN ('TO_BE_SHIPPED', 'SHIPPED');
ALTER TABLE chadhava_events
  ADD CONSTRAINT chadhava_events_stage_check
  CHECK (stage IN ('YET_TO_START', 'LIVE_ADDED', 'SHORT_VIDEO_ADDED', 'SANKALP_VIDEO_ADDED', 'COMPLETED'));

-- 2. chadhava_bookings — drop ship columns; chadhava has no shipping.
ALTER TABLE chadhava_bookings DROP COLUMN IF EXISTS shipment_id;
ALTER TABLE chadhava_bookings DROP COLUMN IF EXISTS shipment_status;

COMMIT;
