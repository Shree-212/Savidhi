# Razorpay integration

## Why

Razorpay handles every paid action on the platform: puja booking, chadhava booking, astrologer consult fee, subscription first-month, prasad hamper. We use the standard hosted-checkout flow on web + native SDK on mobile + a webhook for resilience.

Test keys live in the `project_razorpay_creds` memory file.

## Sequence

1. **Order create** — client POSTs cart → `services/booking-service/src/routes/payments.ts` → `razorpayClient.orders.create({...})` → Razorpay returns `order_id`. We persist a new `payments` row with `status='CREATED'`, `gateway_order_id`, the cart in `booking_payload JSONB`, and the client UUID in `booking_idempotency_key`. There's no separate `payment_orders` table.
2. **Client checkout** — web uses [`apps/savidhi_web/src/lib/razorpay.ts`](../../savidhi_web/src/lib/razorpay.ts) (`loadRazorpay()` lazy-loads `checkout.js`; `openCheckout()` opens the modal). Mobile uses the native SDK wrapped in [`apps/savidhi_mobile/app/services/payment.ts`](../../savidhi_mobile/app/services/payment.ts).
3. **Verify** — on success the client posts `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` to `/payments/verify`. The handler:
   - HMAC-verifies `signature == hmac_sha256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)`.
   - Locks the `payments` row `FOR UPDATE`, flips `status='CAPTURED'` (idempotent — second call short-circuits at the already-CAPTURED branch).
   - Calls `materializeBookingFromPayment()` (see [booking-flow.md](booking-flow.md)).
4. **Webhook** — `POST /payments/razorpay/webhook` is the fallback. Razorpay signs the body with `RAZORPAY_WEBHOOK_SECRET`; the handler verifies (against the raw body preserved by an express.json verify hook), locks the row `FOR UPDATE`, then runs the same materialize. Events handled: `payment.captured`, `order.paid`, `payment.failed`, plus `token.cancelled`/`token.expired` for subscription mandate lifecycle.
5. **Refund** — admin "Refund" or "Cancel & refund all bookings" routes (`pujaBookings.ts`, `chadhavaBookings.ts`) call into the Razorpay client. The corresponding webhook event flips the `payments` row to `REFUNDED` and the booking to `refunded`.

## Idempotency

Two layers:

- `payments.idempotency_key` (`${booking_type}:${client_uuid}`) — replayed `/create-order` for the same intent returns the existing CREATED `payments` row instead of opening a second Razorpay order. `payments.gateway_order_id` is also effectively unique per intent.
- `payments.booking_idempotency_key` (migration 019/025) — `materializeBookingFromPayment()` checks for an existing booking with the same key and short-circuits, so concurrent `/verify` + webhook fires cannot double-create.

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
