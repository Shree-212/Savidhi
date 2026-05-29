# Meta Pixel + Conversions API (CAPI)

## Why

Paid Meta ads need conversion signals to optimise. We send each signal **twice** — once from the browser (Meta Pixel) and once from our server (Conversions API) — and rely on Meta deduplicating on `event_id`. The server fire is the safety net: it survives ad-blockers, ITP, and iOS users who never load `fbevents.js`.

Four standard events feed the funnel:

| Event | Fires when | Pixel (browser) | CAPI (server) |
|-------|------------|-----------------|---------------|
| `PageView` | every page load | base script (layout) | — |
| `ViewContent` | puja/chadhava/consult detail viewed | `trackEvent('view_content', ...)` | `/api/v1/bookings/tracking/event` |
| `AddToCart` | booking sheet opened with selections | `trackEvent('add_to_cart', ...)` | `/api/v1/bookings/tracking/event` |
| `InitiateCheckout` | Razorpay modal about to open | `trackEvent('initiate_checkout', ...)` | `/api/v1/bookings/tracking/event` |
| `Purchase` | `/payments/verify` (or webhook) succeeds | `trackEvent('purchase', ..., { pixelOnly })` | fired inline by `payments.ts` |

Purchase is special: the **server** fires the CAPI sibling itself (from `payments.ts` → `fireCapiPurchase`) using the `event_id` the browser persisted at `/payments/create-order` time. The client only fires the Pixel.

## Dedup mechanism

Meta dedups on a single string per user action — `event_id`. For each conversion the client generates a UUID and uses it BOTH:

1. As the `eventID` field on the browser `fbq('track', ...)` call.
2. As the `event_id` field on the server-side CAPI payload.

For ViewContent/AddToCart/InitiateCheckout the client posts the UUID to `/api/v1/bookings/tracking/event` and the server fires CAPI immediately.

For Purchase the UUID is generated when the booking sheet opens (`useMemo(generateEventId, [open])`), passed to `/payments/create-order` as `meta_event_ids.purchase`, and stashed in `payments.meta_event_ids` (column added by migration 028). When `/verify` or the webhook flips the payment to CAPTURED, `payments.ts` reads that same UUID back and uses it on the CAPI Purchase call.

## Files

- **Server**
  - [`services/booking-service/src/lib/metaCapi.ts`](../services/booking-service/src/lib/metaCapi.ts) — Graph v21 wrapper, SHA256 advanced matching, test_event_code in non-prod, silent no-op when token unset, fire-and-forget helper.
  - [`services/booking-service/src/routes/tracking.ts`](../services/booking-service/src/routes/tracking.ts) — `POST /tracking/event` for client-fired ViewContent/AddToCart/InitiateCheckout. Enriches user_data with the authenticated devotee's email/phone/name when present.
  - [`services/booking-service/src/routes/payments.ts`](../services/booking-service/src/routes/payments.ts) — `fireCapiPurchase()` helper; called after the COMMIT in `/verify` and the webhook.
  - [`migrations/028_meta_event_ids.sql`](../migrations/028_meta_event_ids.sql) — `payments.meta_event_ids JSONB`.
- **Web**
  - [`apps/savidhi_web/src/lib/analytics.ts`](../../savidhi_web/src/lib/analytics.ts) — `trackEvent(name, payload, opts)` with `eventId` + `pixelOnly`; `generateEventId()`; auto-POST to `/tracking/event` for non-Purchase events.
  - [`apps/savidhi_web/src/components/shared/BookingSheet.tsx`](../../savidhi_web/src/components/shared/BookingSheet.tsx), [`ChadhavaBookingSheet.tsx`](../../savidhi_web/src/components/shared/ChadhavaBookingSheet.tsx), [`ConsultBookingSheet.tsx`](../../savidhi_web/src/components/shared/ConsultBookingSheet.tsx) — generate `purchaseEventId`, pass to `/create-order`, fire Pixel-only Purchase after `/verify`.
  - [`apps/savidhi_web/src/app/layout.tsx`](../../savidhi_web/src/app/layout.tsx) — base Pixel + GA4 script tags, only injected when env vars are populated.

## Advanced matching (SHA256)

`metaCapi.buildUserData()` SHA256-hashes (lowercased + trimmed):

- `em` — email
- `ph` — phone (normalized to E.164-ish: digits only; +91 prepended when length looks like a 10-digit Indian mobile)
- `fn` — first name (lowercased)
- `ln` — last name (lowercased)
- `external_id` — internal devotee UUID

Not hashed (Meta spec):

- `client_ip_address` — read from `x-forwarded-for` or socket
- `client_user_agent` — `User-Agent` header
- `fbp` — `_fbp` cookie (browser passes it through)
- `fbc` — `_fbc` cookie (browser passes it through)

## Environment

| Key | Where | Purpose |
|-----|-------|---------|
| `META_PIXEL_ID` | backend `.env` | CAPI: the pixel id events are POSTed under |
| `META_CAPI_ACCESS_TOKEN` | backend `.env` | CAPI auth — long-lived. **Server-side only** |
| `META_TEST_EVENT_CODE` | backend `.env` (defaults to `TEST58456`) | Attached when `NODE_ENV !== 'production'` |
| `NEXT_PUBLIC_META_PIXEL_ID` | web `.env.local` | Browser Pixel — **must equal `META_PIXEL_ID`** |
| `NEXT_PUBLIC_GA4_ID` | web `.env.local` | Google Analytics (also goes through `analytics.ts`) |

## Verifying it works

1. Open Meta Events Manager → your pixel → **Test Events**.
2. Enter `TEST58456` and load the web app with `NODE_ENV !== 'production'`.
3. Walk through a booking. You should see, in order: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase. Each row will show two sources (Browser + Server) with the same `event_id`. The "Deduplicated" column should read "Yes" for ViewContent/AddToCart/InitiateCheckout/Purchase.

If only Browser fires appear, check `META_CAPI_ACCESS_TOKEN` is set in the backend container — `docker-compose logs booking-service | grep meta-capi` should show "sent" lines and no "skipped" lines.

If only Server fires appear, check the browser console — the `_fbq` queue may not have flushed. Confirm `NEXT_PUBLIC_META_PIXEL_ID` is set and `layout.tsx` injected the script.

If two separate rows appear in Test Events (not deduplicated), the `event_id` mismatched between Browser and Server. For Purchase that means `meta_event_ids.purchase` wasn't passed through `/payments/create-order` — confirm the booking sheet imports `generateEventId` and threads it into the `createOrder` call.

## Security note

`META_CAPI_ACCESS_TOKEN` is a long-lived secret with permission to write events under your pixel. **Never** prefix it with `NEXT_PUBLIC_`, never commit it, never put it in a logged URL. Rotate via Meta Events Manager → Settings → CAPI if it ever leaks.
