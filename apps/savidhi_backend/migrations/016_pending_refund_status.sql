-- 016_pending_refund_status.sql — Allow 'PENDING_REFUND' on booking payment_status.
-- Used by the new bulk cancel-all-bookings endpoint to flag bookings whose payment
-- needs to be refunded by the payment-service worker.

ALTER TABLE puja_bookings DROP CONSTRAINT IF EXISTS puja_bookings_payment_status_check;
ALTER TABLE puja_bookings ADD CONSTRAINT puja_bookings_payment_status_check
  CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'FAILED', 'PENDING_REFUND'));

ALTER TABLE chadhava_bookings DROP CONSTRAINT IF EXISTS chadhava_bookings_payment_status_check;
ALTER TABLE chadhava_bookings ADD CONSTRAINT chadhava_bookings_payment_status_check
  CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'FAILED', 'PENDING_REFUND'));
