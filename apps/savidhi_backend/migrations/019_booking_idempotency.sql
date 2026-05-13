-- Idempotency keys on booking inserts. The client generates a UUID once per
-- booking attempt; the booking-service POST handler checks for an existing
-- row matching (idempotency_key, devotee_id) before inserting. UNIQUE is
-- partial so existing rows (NULL) don't violate the constraint.

ALTER TABLE puja_bookings
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_puja_bookings_idempotency
  ON puja_bookings (devotee_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE chadhava_bookings
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chadhava_bookings_idempotency
  ON chadhava_bookings (devotee_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
