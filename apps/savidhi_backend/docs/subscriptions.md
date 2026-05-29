# Subscription bookings + monthly rollover

## Why

Some pujas — daily Sandhya Aarti, weekly Hanuman Chalisa — are recurring. Rather than asking devotees to re-book every month, they subscribe once: they pay for month 1 at checkout, then a worker auto-generates the next month's booking before the previous one runs out.

Migration 023 introduced the `subscriptions` table and the `bookings.subscription_id` FK; commit `05fdec0` shipped the rollover worker.

## Sequence

1. **Subscription checkout** — devotee picks "subscribe" in the puja sheet. `materializeBooking()` creates BOTH a `subscriptions` row (with cadence + start date + total months) AND the first month's `bookings` row, with `bookings.subscription_id` set.
2. **Rollover worker** — `subscriptionRollover.ts` runs daily. For each active subscription whose next billing date is within a configurable window:
   - Generates the next `bookings` row using the same cart JSONB from the parent subscription.
   - Issues a Razorpay recurring charge (mandate-based, using the saved token from month 1).
   - On success, advances `subscriptions.next_billing_date`. On failure, retries N times then marks the subscription `dunning`.
3. **Devotee cancels** — admin "Cancel subscription" (or self-serve on mobile) sets `subscriptions.status='cancelled'`. The worker skips cancelled rows.

## Schedule

- **Prod** — k8s CronJob in [`k8s/31-cronjob-subscription-rollover.yaml`](../k8s/31-cronjob-subscription-rollover.yaml). Triggers a one-shot pod that runs `subscriptionRollover.ts` once and exits.
- **Local** — set `SUBSCRIPTION_ROLLOVER_VERBOSE=true` and run manually:
  ```
  docker-compose exec booking-service node dist/workers/subscriptionRollover.js
  ```

## Files

- [`services/booking-service/src/workers/subscriptionRollover.ts`](../services/booking-service/src/workers/subscriptionRollover.ts) — the worker entrypoint.
- [`services/booking-service/src/lib/materializeBooking.ts`](../services/booking-service/src/lib/materializeBooking.ts) — initial subscription + first-month creation.
- [`migrations/023_subscription_bookings.sql`](../migrations/023_subscription_bookings.sql) — schema.
- [`k8s/31-cronjob-subscription-rollover.yaml`](../k8s/31-cronjob-subscription-rollover.yaml) — prod schedule.

## Env

| Key | Purpose |
|-----|---------|
| `SUBSCRIPTION_ROLLOVER_VERBOSE` | Verbose logging for local debugging |
| `RAZORPAY_KEY_*` | Same keys as one-off payments — mandate charges use the same Razorpay account |
