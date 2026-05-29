# Razorpay integration

## Why

Razorpay handles every paid action on the platform: puja booking, chadhava booking, astrologer consult fee, subscription first-month, prasad hamper. We use the standard hosted-checkout flow on web + native SDK on mobile + a webhook for resilience.

Test keys live in the `project_razorpay_creds` memory file.

## Sequence

1. **Order create** — client POSTs cart → `services/booking-service/src/routes/payments.ts` → `razorpayHelpers.createOrder(amount, currency, receipt)` → Razorpay returns `order_id`. We persist `(order_id, cart JSONB, status='pending')` to `payment_orders`.
2. **Client checkout** — web uses [`apps/savidhi_web/src/lib/razorpay.ts`](../../savidhi_web/src/lib/razorpay.ts) (`loadRazorpay()` lazy-loads `checkout.js`; `openCheckout()` opens the modal). Mobile uses the native SDK wrapped in [`apps/savidhi_mobile/app/services/payment.ts`](../../savidhi_mobile/app/services/payment.ts).
3. **Verify** — on success the client posts `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }` to `/payments/verify`. The handler:
   - HMAC-verifies `signature == hmac_sha256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)`.
   - Marks the `payment_orders` row paid (idempotent — second call is no-op).
   - Calls `materializeBooking()` (see [booking-flow.md](booking-flow.md)).
4. **Webhook** — `POST /payments/webhook` is the fallback. Razorpay signs the body with `RAZORPAY_WEBHOOK_SECRET`; the handler verifies, then runs the same materialize. Events handled: `payment.captured`, `payment.failed`, `refund.processed`.
5. **Refund** — admin "Refund" or "Cancel & refund all bookings" routes (`pujaBookings.ts`, `chadhavaBookings.ts`) call `razorpayHelpers.refund(paymentId, amount)`. The corresponding webhook event flips the booking to `refunded`.

## Idempotency

Two layers:

- `payment_orders.razorpay_order_id UNIQUE` — replayed verify/webhook for the same order can't create duplicate bookings.
- `bookings.idempotency_key` (migration 019) — `materializeBooking()` writes a deterministic key derived from the order id + sub-item index; a second call with the same key is dropped.

## Files

- [`services/booking-service/src/lib/razorpayHelpers.ts`](../services/booking-service/src/lib/razorpayHelpers.ts) — order create, signature verify, refund.
- [`services/booking-service/src/routes/payments.ts`](../services/booking-service/src/routes/payments.ts) — order / verify / webhook routes.
- [`apps/savidhi_web/src/lib/razorpay.ts`](../../savidhi_web/src/lib/razorpay.ts) — web client wrapper.
- [`apps/savidhi_mobile/app/services/payment.ts`](../../savidhi_mobile/app/services/payment.ts) — mobile wrapper.

## Env

| Key | Purpose |
|-----|---------|
| `RAZORPAY_KEY_ID` | Public key — also returned to client so checkout.js can identify the merchant |
| `RAZORPAY_KEY_SECRET` | Private — order create + signature verify only |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies the `X-Razorpay-Signature` header on webhooks |
| `PAYMENTS_FORCE_STUB` | When `true`, all three above are bypassed — see [booking-flow.md](booking-flow.md) |
