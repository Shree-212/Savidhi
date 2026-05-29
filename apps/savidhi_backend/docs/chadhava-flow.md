# Chadhava flow

## Why

A "chadhava" is a light-touch offering devotees can dedicate to a specific deity at a specific temple — flowers, sweets, garland, vastra. Distinct from a puja (which is a full priest-led ritual): faster, cheaper, no shipping, no prasad return-leg.

Chadhavas share most of their plumbing with pujas (event scheduling, materialization, Razorpay) but **terminal status is `COMPLETED` — no `awaiting_shipping` step**. Migration 008 was the one that ripped the shipping step out after the first weeks of prod data showed devotees expected the offering itself to be the deliverable, not a follow-up package.

## Schema highlights

- `chadhavas` — catalog row. `deity_id` FK added in migration 014 mirrors `pujas`.
- `chadhava_events` — scheduled instances. `event_repeats` column (migration 012) lets one event repeat daily/weekly without a row per occurrence.
- `chadhava_bookings` — one row per devotee booking. No `shipping_*` columns — those were dropped in 008.

## Sequence (devotee)

1. Browse `/chadhava` (web/mobile).
2. Pick chadhava + (optional) deity + date + addons → booking sheet.
3. Pay via Razorpay (same flow as pujas — see [booking-flow.md](booking-flow.md)).
4. After payment verified, `materializeBooking()` inserts `chadhava_bookings` with `status='pending'`.
5. On the event day, the pujari marks performed → `status='COMPLETED'`. **End of flow.** No shipping.

## Sequence (admin)

Same as puja-bookings admin (`DataTable`, status toggle, cancel/refund) **minus** the Ship Prashad button. Migration 008 also hides the "shipping" tab from the admin nav for chadhavas.

## Files

- Catalog routes: [`services/catalog-service/src/routes/chadhavas.ts`](../services/catalog-service/src/routes/chadhavas.ts) — also owns chadhava events (no separate `chadhavaEvents.ts`).
- Booking routes: [`services/booking-service/src/routes/chadhavaBookings.ts`](../services/booking-service/src/routes/chadhavaBookings.ts), [`chadhavaEvents.ts`](../services/booking-service/src/routes/chadhavaEvents.ts).
- Migrations:
  - [`008_chadhava_no_ship.sql`](../migrations/008_chadhava_no_ship.sql) — drops shipping step.
  - [`012_chadhava_event_repeats.sql`](../migrations/012_chadhava_event_repeats.sql) — repeat schedule.
  - [`014_chadhava_deity.sql`](../migrations/014_chadhava_deity.sql) — deity FK.
- Mobile: `apps/savidhi_mobile/app/screens/chadhava/`.
- Web: `apps/savidhi_web/src/app/chadhava/`.

## Why the schema gap (`007_*.sql`)

There's no `007_*.sql` — sequence jumps `006` → `008`. Originally a chadhava shipping iteration that was abandoned in favour of dropping shipping entirely. Kept as a gap rather than renumbering so the git history of each migration stays grep-able.
