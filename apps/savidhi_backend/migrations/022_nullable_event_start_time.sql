-- Allow puja_events.start_time and chadhava_events.start_time to be NULL.
-- Previously admins who skipped the start-time field saw a dummy timestamp
-- persist (the form fell back to a default time). With this change the
-- field can be left empty; reports/UI render blank when null.

ALTER TABLE puja_events     ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE chadhava_events ALTER COLUMN start_time DROP NOT NULL;
