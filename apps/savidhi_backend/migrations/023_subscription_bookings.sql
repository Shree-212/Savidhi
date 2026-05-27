-- 023_subscription_bookings.sql
-- Phase A of the Subscription Bookings rollout (PDF item 6).
--
-- Goals:
--   1. Bring chadhava_bookings to parity with puja_bookings on `booking_type`
--      so the customer/admin code paths can treat both tables uniformly.
--   2. Add a `booking_mode` discriminator on chadhavas (already present on
--      pujas) so admin can restrict a chadhava to ONE_TIME / SUBSCRIPTION /
--      BOTH at the catalog level.
--   3. Add subscription bookkeeping columns on BOTH booking tables so the
--      worker (Phase B) and cancel flow (Phase C) have a place to land:
--        - subscription_count        N events the user paid to autopay for
--        - subscription_remaining    decremented as child bookings settle
--        - parent_booking_id         child rows point back at the parent
--        - razorpay_token_id         token captured at first payment
--        - razorpay_customer_id      Razorpay customer ID (idempotent per devotee)
--        - next_charge_at            the next event start_time the worker
--                                    should look at for this parent
--
-- All columns are nullable with sensible defaults — existing ONE_TIME
-- bookings keep working untouched. Forward-only migration.

-- ─── 1. chadhava_bookings.booking_type ────────────────────────────────────────
ALTER TABLE chadhava_bookings
  ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME'
    CHECK (booking_type IN ('ONE_TIME', 'SUBSCRIPTION'));

-- ─── 2. chadhavas.booking_mode ────────────────────────────────────────────────
ALTER TABLE chadhavas
  ADD COLUMN IF NOT EXISTS booking_mode VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME'
    CHECK (booking_mode IN ('ONE_TIME', 'SUBSCRIPTION', 'BOTH'));

-- ─── 3. Subscription metadata on puja_bookings ───────────────────────────────
ALTER TABLE puja_bookings
  ADD COLUMN IF NOT EXISTS subscription_count       INT,
  ADD COLUMN IF NOT EXISTS subscription_remaining   INT,
  ADD COLUMN IF NOT EXISTS parent_booking_id        UUID REFERENCES puja_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS razorpay_token_id        VARCHAR(64),
  ADD COLUMN IF NOT EXISTS razorpay_customer_id     VARCHAR(64),
  ADD COLUMN IF NOT EXISTS next_charge_at           TIMESTAMPTZ;

-- ─── 4. Subscription metadata on chadhava_bookings ───────────────────────────
ALTER TABLE chadhava_bookings
  ADD COLUMN IF NOT EXISTS subscription_count       INT,
  ADD COLUMN IF NOT EXISTS subscription_remaining   INT,
  ADD COLUMN IF NOT EXISTS parent_booking_id        UUID REFERENCES chadhava_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS razorpay_token_id        VARCHAR(64),
  ADD COLUMN IF NOT EXISTS razorpay_customer_id     VARCHAR(64),
  ADD COLUMN IF NOT EXISTS next_charge_at           TIMESTAMPTZ;

-- ─── 5. Partial indexes for the weekly rollover worker ──────────────────────
-- The worker (Phase B) queries:
--   SELECT ... WHERE booking_type = 'SUBSCRIPTION'
--                AND status <> 'CANCELLED'
--                AND next_charge_at <= NOW() + INTERVAL '7 days'
-- A partial index on next_charge_at gated by the type/status predicate keeps
-- the index tiny (only active subscriptions) and the worker fast even when
-- most bookings are ONE_TIME.
CREATE INDEX IF NOT EXISTS puja_bookings_subscription_due_idx
  ON puja_bookings (next_charge_at)
  WHERE booking_type = 'SUBSCRIPTION' AND status <> 'CANCELLED';

CREATE INDEX IF NOT EXISTS chadhava_bookings_subscription_due_idx
  ON chadhava_bookings (next_charge_at)
  WHERE booking_type = 'SUBSCRIPTION' AND status <> 'CANCELLED';

-- ─── 6. Sanity check (no-op) ─────────────────────────────────────────────────
-- Confirm both booking tables now expose the same set of subscription columns.
-- Pure assertion via information_schema; harmless if it raises.
DO $$
DECLARE
  puja_cols   INT;
  chadhava_cols INT;
BEGIN
  SELECT COUNT(*) INTO puja_cols FROM information_schema.columns
   WHERE table_name='puja_bookings'
     AND column_name IN ('booking_type','subscription_count','subscription_remaining',
                         'parent_booking_id','razorpay_token_id','razorpay_customer_id','next_charge_at');
  SELECT COUNT(*) INTO chadhava_cols FROM information_schema.columns
   WHERE table_name='chadhava_bookings'
     AND column_name IN ('booking_type','subscription_count','subscription_remaining',
                         'parent_booking_id','razorpay_token_id','razorpay_customer_id','next_charge_at');
  IF puja_cols <> 7 OR chadhava_cols <> 7 THEN
    RAISE EXCEPTION 'Migration 023 sanity check failed: puja_cols=% chadhava_cols=% (expected 7 each)', puja_cols, chadhava_cols;
  END IF;
END $$;
