# Shiprocket integration (prasad shipping)

## Why

Many puja bookings include a prasad hamper that ships to the devotee's address after the puja is performed. We use Shiprocket as the courier aggregator. Chadhava bookings do **not** ship (migration 008 removed the prasad step — terminal status is COMPLETED).

Real creds + pickup nickname (`work`) + channel id (`10487279`) live in the `project_shiprocket_creds` memory file.

## Sequence (admin-triggered)

1. **Puja booking reaches `awaiting_shipping`** — once the pujari marks the puja performed, the booking row sits with `status='awaiting_shipping'`. The admin "Bookings → Puja → detail" page shows a **Ship Prashad** button.
2. **Admin clicks Ship Prashad** — the handler in `services/booking-service/src/routes/pujaBookings.ts` calls `shiprocket.createOrderAndShipment(booking)`. That wrapper:
   - Lazily authenticates via `/auth/login` (caches the token in memory).
   - POSTs `/orders/create/adhoc` with order id = `SAV-<booking_id>`, pickup nickname from `SHIPROCKET_PICKUP_NICKNAME`, channel id from `SHIPROCKET_CHANNEL_ID`, devotee address, hamper dims.
   - Captures `order_id`, `shipment_id`, and (if Shiprocket returns one) the AWB code.
   - Writes a `shipments` row (migration 024) linked to the booking.
3. **Booking status flips** to `shipping` and the devotee sees a tracking link in their bookings list (the web/mobile "Track Package" surface).
4. **Webhook** — `POST /webhooks/shiprocket` (handler: `shiprocketWebhook.ts`) receives status updates. Auth: `x-api-key: $SHIPROCKET_WEBHOOK_SECRET` — must match a token configured in Shiprocket panel → Settings → API → Configure Webhooks. The handler maps Shiprocket statuses to booking states (`shipping` → `out_for_delivery` → `delivered`).

## Feature flag

`FEATURE_SHIPROCKET_ENABLED=false` (default) makes the wrapper return a "not configured" error to the admin and skips outbound calls entirely. Use this locally — there's no sandbox Shiprocket account.

## Files

- [`services/booking-service/src/lib/shiprocket.ts`](../services/booking-service/src/lib/shiprocket.ts) — auth, order create, shipment, AWB.
- [`services/booking-service/src/routes/shiprocketWebhook.ts`](../services/booking-service/src/routes/shiprocketWebhook.ts) — incoming status callbacks.
- [`services/booking-service/src/routes/pujaBookings.ts`](../services/booking-service/src/routes/pujaBookings.ts) — admin Ship Prashad action.
- [`migrations/024_shiprocket_shipments.sql`](../migrations/024_shiprocket_shipments.sql) — `shipments` table.
- [`migrations/008_chadhava_no_ship.sql`](../migrations/008_chadhava_no_ship.sql) — chadhavas opt out of shipping.

## Env

| Key | Purpose |
|-----|---------|
| `FEATURE_SHIPROCKET_ENABLED` | Kill switch |
| `SHIPROCKET_API_BASE` | `https://apiv2.shiprocket.in` |
| `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` | Panel login — auth-token endpoint |
| `SHIPROCKET_PICKUP_NICKNAME` | Pickup address registered in panel (we use `work`) |
| `SHIPROCKET_CHANNEL_ID` | Custom channel id (panel → Settings → Channels) |
| `SHIPROCKET_WEBHOOK_SECRET` | Shared secret for `x-api-key` on incoming webhooks |
