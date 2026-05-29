# Booking flow — deferred creation + materializer

## Why

Pre-migration 025, every "Book Now" allocated a row in `puja_bookings` / `chadhava_bookings` / `appointments` immediately, then opened Razorpay. Two failure modes followed: (a) abandoned carts piled up garbage rows the dashboard had to filter out, (b) cancelling between cart and payment left orphans the refund flow had to chase. Migration 025 moves the row creation **after** the Razorpay payment is verified — the booking row only materializes for a paid order.

There is no separate `payment_orders` table. The pre-payment intent rides on the existing `payments` row: migration 025 adds `payments.booking_payload JSONB` (the cart) and `payments.booking_idempotency_key` (client UUID), and makes `payments.booking_id` nullable until the booking actually exists.

## Sequence

1. **Cart sheet** (web/mobile) collects: puja or chadhava or appointment, event id, dates, devotee names, addons, address. The client generates a `booking_idempotency_key` UUID up front.
2. **POST `/api/v1/bookings/payments/create-order`** — [`payments.ts`](../services/booking-service/src/routes/payments.ts) validates the payload, computes the authoritative `amount` server-side (anti-tamper), creates a Razorpay order via `razorpayClient.orders.create()`, and inserts a `payments` row with `status='CREATED'`, `booking_payload`, `booking_idempotency_key`, and `gateway_order_id`. `booking_id` is NULL at this point.
3. **Client opens Razorpay Checkout** (web: [`apps/savidhi_web/src/lib/razorpay.ts`](../../savidhi_web/src/lib/razorpay.ts); mobile: [`apps/savidhi_mobile/app/services/payment.ts`](../../savidhi_mobile/app/services/payment.ts)). On success the client gets `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }`.
4. **POST `/api/v1/bookings/payments/verify`** — same `payments.ts` route. HMAC-verifies the signature, locks the `payments` row `FOR UPDATE`, calls `materializeBookingFromPayment()` inside the same transaction, then flips `payments.status='CAPTURED'` and sets `booking_id`.
5. **`materializeBookingFromPayment(client, payment)`** — [`materializeBooking.ts`](../services/booking-service/src/lib/materializeBooking.ts) — reads `payment.booking_payload` and inserts the actual booking row (`puja_bookings` / `chadhava_bookings` / `appointments`). Idempotency: the function checks for an existing row with the same `booking_idempotency_key` and returns it instead of double-inserting.
6. **Webhook fallback** — if the client never calls `/verify` (closed tab, dropped mobile), Razorpay's `payment.captured` event hits `/api/v1/bookings/payments/razorpay/webhook`. Same materialize, guarded by `FOR UPDATE` so a race with `/verify` doesn't double-create.
7. **Sweeper** — `expirePendingPaymentsWorker` runs daily and marks `payments` rows that have been in `CREATED` for > 30 min as `EXPIRED`, for ops visibility.

## Files

- [`services/booking-service/src/routes/payments.ts`](../services/booking-service/src/routes/payments.ts) — create-order + verify + webhook.
- [`services/booking-service/src/lib/materializeBooking.ts`](../services/booking-service/src/lib/materializeBooking.ts) — the conversion + amount preview.
- [`services/booking-service/src/routes/pujaBookings.ts`](../services/booking-service/src/routes/pujaBookings.ts) — list/detail/cancel for puja bookings.
- [`services/booking-service/src/routes/chadhavaBookings.ts`](../services/booking-service/src/routes/chadhavaBookings.ts) — same for chadhavas.
- [`services/booking-service/src/routes/appointments.ts`](../services/booking-service/src/routes/appointments.ts) — astrologer appointments (same materialize pattern).
- [`services/booking-service/src/workers/expirePendingPayments.ts`](../services/booking-service/src/workers/expirePendingPayments.ts) — sweeper.
- [`migrations/025_defer_booking_creation.sql`](../migrations/025_defer_booking_creation.sql) — schema change.
- [`migrations/019_booking_idempotency.sql`](../migrations/019_booking_idempotency.sql) — idempotency column.

## Stub-mode bypass (local)

When `PAYMENTS_FORCE_STUB=true` in `.env`, `/create-order` returns a synthetic `order_stub_*` id and `/verify` skips signature checks. Use this to exercise the materializer locally without real Razorpay keys.

## Subscription wrinkle

For subscription bookings (`booking_payload.booking_type === 'SUBSCRIPTION'`), `/create-order` first creates-or-fetches a Razorpay customer for the devotee so the order can authorise an e-mandate token. After `/verify`, the `materializeBookingFromPayment` function captures the token and writes `razorpay_token_id` + `next_charge_at` to the booking row, which the `subscriptionRollover` worker consumes monthly. See [subscriptions.md](subscriptions.md).
