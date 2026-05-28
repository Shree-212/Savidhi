-- 025_defer_booking_creation.sql
-- Razorpay bug fix: booking row is now created ONLY after payment is verified.
-- The customer flow becomes:
--   1. POST /payments/create-order → server stashes the booking payload in
--      payments.booking_payload (JSONB), creates the Razorpay order, returns.
--   2. Razorpay modal opens. User pays.
--   3. POST /payments/verify (or webhook payment.captured) → server reads
--      payments.booking_payload and INSERTs the booking row in the same
--      transaction that flips payments.status to CAPTURED.
-- If the user cancels/closes the modal, no booking row ever exists. A daily
-- sweeper marks stale CREATED payments (>30 min) as EXPIRED for ops visibility.

BEGIN;

-- 1. Hold the booking payload (puja/chadhava/appointment-specific JSON shape).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS booking_payload JSONB;

-- 2. The CLIENT-supplied idempotency_key from the booking form. Used in
--    materializeBookingFromPayment() to avoid race-creating two booking rows
--    if /verify and the webhook fire concurrently for the same payment.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS booking_idempotency_key TEXT;

-- 3. booking_id is now NULL until the payment is verified. Old rows keep their
--    existing non-null booking_id values; only new pending payments will have
--    NULL here, and only briefly (until /verify or the webhook fires).
ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;

-- 4. Extend the status CHECK constraint with 'EXPIRED' for the sweeper.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'EXPIRED'));

-- 5. Index for the sweeper: find stale CREATED rows by created_at.
CREATE INDEX IF NOT EXISTS idx_payments_created_status
  ON payments(status, created_at) WHERE status = 'CREATED';

COMMIT;
