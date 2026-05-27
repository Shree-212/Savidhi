-- 024_shiprocket_shipments.sql
-- Wires real Shiprocket integration onto the existing "Ship Prashad" stub.
-- Strictly additive: existing prasad_delivery_address TEXT and the unused
-- shipment_id / shipment_status columns from 001_init are left in place so
-- legacy bookings and read-paths keep working unchanged.

-- ─── puja_bookings: structured shipping address + Shiprocket ids ─────────────
ALTER TABLE puja_bookings
  ADD COLUMN IF NOT EXISTS ship_to_name         VARCHAR(120),
  ADD COLUMN IF NOT EXISTS ship_to_phone        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ship_to_line1        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ship_to_line2        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ship_to_city         VARCHAR(80),
  ADD COLUMN IF NOT EXISTS ship_to_state        VARCHAR(80),
  ADD COLUMN IF NOT EXISTS ship_to_pincode      VARCHAR(10),
  ADD COLUMN IF NOT EXISTS ship_to_country      VARCHAR(40) DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS sr_order_id          VARCHAR(40),
  ADD COLUMN IF NOT EXISTS sr_shipment_id       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS sr_awb_code          VARCHAR(40),
  ADD COLUMN IF NOT EXISTS sr_courier_name      VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sr_expected_delivery DATE,
  ADD COLUMN IF NOT EXISTS sr_last_synced_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sr_last_error        TEXT;

-- shipment_status lifecycle (documented, free-form VARCHAR(20) per 001_init):
--   NULL → not yet shipped (hamper toggle off, or pre-Ship Prasad)
--   NEW → SR order created, no AWB yet
--   AWB_ASSIGNED → AWB allocated
--   PICKUP_SCHEDULED → pickup booked
--   PICKED_UP → courier collected
--   IN_TRANSIT
--   OUT_FOR_DELIVERY
--   DELIVERED (terminal)
--   NDR (non-delivery report — failed attempt)
--   RTO_INITIATED / RTO_DELIVERED (return-to-origin)
--   CANCELLED

CREATE INDEX IF NOT EXISTS idx_puja_bookings_sr_awb
  ON puja_bookings(sr_awb_code) WHERE sr_awb_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_puja_bookings_sr_order
  ON puja_bookings(sr_order_id) WHERE sr_order_id IS NOT NULL;

-- ─── hampers: physical dimensions / weight / declared value ──────────────────
-- Shiprocket's /orders/create/adhoc payload requires length, breadth, height,
-- weight, and per-item selling_price. Today hampers only carries name +
-- content_description + stock_qty, so add these. Defaults keep existing rows
-- valid without manual backfill — admin should edit the real values via the
-- hamper edit form (Phase D3).
ALTER TABLE hampers
  ADD COLUMN IF NOT EXISTS length_cm       NUMERIC(6,2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS breadth_cm      NUMERIC(6,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS height_cm       NUMERIC(6,2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS weight_kg       NUMERIC(6,3) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS declared_value  NUMERIC(10,2) NOT NULL DEFAULT 100;

-- ─── shiprocket_webhook_events: idempotent audit log ─────────────────────────
-- Shiprocket retries delivery on non-2xx and may also re-send for the same
-- AWB. We persist every payload (verified or not) so we can replay or audit.
CREATE TABLE IF NOT EXISTS shiprocket_webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  awb_code        VARCHAR(40),
  order_id        VARCHAR(40),
  current_status  VARCHAR(40),
  event_payload   JSONB NOT NULL,
  signature_ok    BOOLEAN NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sr_webhook_awb
  ON shiprocket_webhook_events(awb_code);
CREATE INDEX IF NOT EXISTS idx_sr_webhook_received
  ON shiprocket_webhook_events(received_at DESC);
