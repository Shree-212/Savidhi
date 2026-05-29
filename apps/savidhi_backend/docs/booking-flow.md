# Booking flow — deferred creation + materializer

## Why

Pre-migration 025, every "add to cart" allocated a `bookings` row immediately. Two failure modes followed: (a) abandoned carts piled up garbage `bookings` rows the dashboard had to filter out, (b) cancelling between cart and payment left orphans the refund flow had to chase. Migration 025 moves the row creation **after** the Razorpay payment is verified — the booking row only materializes for a paid order.

The pre-payment intent lives in `payment_orders` (Razorpay order id + the user-selected addons/dates/devotees as JSONB). Once `payments/verify` succeeds, `materializeBooking()` converts that intent into one or more rows in `bookings` / `chadhava_bookings` / `appointments`.

## Sequence

1. **Cart sheet** (web/mobile) collects: puja or chadhava, event id, dates, devotee names, addons, address.
2. **POST `/payments/order`** — `services/booking-service/src/routes/payments.ts` creates a Razorpay order via `razorpayHelpers.createOrder()` and inserts a `payment_orders` row with the cart JSONB. Returns `{ razorpayOrderId, amount, currency, key }`.
3. **Client opens Razorpay Checkout** (web: `apps/savidhi_web/src/lib/razorpay.ts`; mobile: `apps/savidhi_mobile/app/services/payment.ts`). On success the client gets `{ razorpayPaymentId, razorpayOrderId, razorpaySignature }`.
4. **POST `/payments/verify`** — same `payments.ts` route. Verifies the HMAC signature, marks the `payment_orders` row paid, then calls `materializeBooking()`.
5. **`materializeBooking()`** — [`services/booking-service/src/lib/materializeBooking.ts`](../services/booking-service/src/lib/materializeBooking.ts) — reads the `payment_orders` JSONB and inserts the actual booking rows. Idempotency comes from migration 019's `bookings.idempotency_key` column: if `materializeBooking` is called twice with the same order, the second call is a no-op.
6. **Webhook fallback** — if the client never calls `/payments/verify` (closed tab, dropped mobile), Razorpay's `payment.captured` webhook hits `/payments/webhook`. The handler does the same `materializeBooking()` call, guarded by the idempotency key.

## Files

- [`services/booking-service/src/routes/payments.ts`](../services/booking-service/src/routes/payments.ts) — order + verify + webhook.
- [`services/booking-service/src/lib/materializeBooking.ts`](../services/booking-service/src/lib/materializeBooking.ts) — the conversion.
- [`services/booking-service/src/routes/pujaBookings.ts`](../services/booking-service/src/routes/pujaBookings.ts) — list/detail/cancel for puja bookings.
- [`services/booking-service/src/routes/chadhavaBookings.ts`](../services/booking-service/src/routes/chadhavaBookings.ts) — same for chadhavas.
- [`services/booking-service/src/routes/appointments.ts`](../services/booking-service/src/routes/appointments.ts) — astrologer appointments (same materialize pattern).
- [`migrations/025_defer_booking_creation.sql`](../migrations/025_defer_booking_creation.sql) — schema change.
- [`migrations/019_booking_idempotency.sql`](../migrations/019_booking_idempotency.sql) — duplicate-prevention column.

## Stub-mode bypass (local)

When `PAYMENTS_FORCE_STUB=true` in `.env`, `/payments/order` returns a synthetic order id and `/payments/verify` skips signature checks. Use this to exercise the materializer locally without real Razorpay keys.

## Subscription wrinkle

For subscription bookings, `materializeBooking()` creates the first month's `bookings` row plus a `subscriptions` row that the rollover worker consumes monthly. See [subscriptions.md](subscriptions.md).
