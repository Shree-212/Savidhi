-- 017_event_cancelled_status.sql — Allow 'CANCELLED' on event status.
-- Needed so the cancel-all-bookings flow can mark the event itself as
-- terminal-cancelled, preventing admin from advancing stage / web from
-- rendering the timeline as if the puja will still happen.

ALTER TABLE puja_events DROP CONSTRAINT IF EXISTS puja_events_status_check;
ALTER TABLE puja_events ADD CONSTRAINT puja_events_status_check
  CHECK (status IN ('NOT_STARTED', 'INPROGRESS', 'COMPLETED', 'CANCELLED'));

ALTER TABLE chadhava_events DROP CONSTRAINT IF EXISTS chadhava_events_status_check;
ALTER TABLE chadhava_events ADD CONSTRAINT chadhava_events_status_check
  CHECK (status IN ('NOT_STARTED', 'INPROGRESS', 'COMPLETED', 'CANCELLED'));
