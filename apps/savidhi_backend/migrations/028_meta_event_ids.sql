-- 028_meta_event_ids.sql
-- Meta Pixel + CAPI deduplication.
--
-- For each conversion event (view_content / add_to_cart / initiate_checkout
-- / purchase) the platform fires BOTH the browser pixel (window.fbq) AND a
-- server-side Conversions API call. Meta deduplicates the two signals by
-- `event_id` — they must be the same string for the same user action.
--
-- The web client generates a UUID per event. For view_content/add_to_cart/
-- initiate_checkout it posts directly to /tracking/event. For purchase the
-- UUID is generated alongside initiate_checkout and PASSED THROUGH the
-- payment lifecycle: client sends it to /payments/create-order; the server
-- stashes the whole map here and reuses `purchase` when CAPI-Purchase fires
-- in /verify or the webhook.
--
-- Shape:
--   { "view_content": "uuid-...", "add_to_cart": "...",
--     "initiate_checkout": "...", "purchase": "..." }

BEGIN;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta_event_ids JSONB;

COMMENT ON COLUMN payments.meta_event_ids IS
  'Per-event Meta event_id UUIDs supplied by the web client at create-order time. Used by CAPI Purchase to dedup against the browser Pixel.';

COMMIT;
