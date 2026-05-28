import type { PoolClient } from 'pg';
import { createPujaBookingTx, PujaBookingError, type PujaBookingPayload } from '../routes/pujaBookings';
import { createChadhavaBookingTx, ChadhavaBookingError, type ChadhavaBookingPayload } from '../routes/chadhavaBookings';
import { createAppointmentTx, AppointmentBookingError, type AppointmentBookingPayload } from '../routes/appointments';

/**
 * Materialises a booking row from a verified payment.
 *
 * Called by:
 *   - POST /payments/verify after Razorpay signature validation succeeds
 *   - POST /payments/razorpay/webhook on payment.captured / order.paid
 *
 * Both call sites must run inside an open transaction that ALSO flips
 * `payments.status` to 'CAPTURED'. If verify and the webhook race, the second
 * caller sees the payment already CAPTURED and skips this function. We also
 * defend against an interleaving where both callers think the payment is still
 * CREATED by:
 *   1. Returning the existing booking row if `payment.booking_id` is already
 *      set (the row was materialised by the other caller and the payment row
 *      was updated).
 *   2. Relying on the per-booking idempotency_key inside createXxxBookingTx —
 *      if two callers try to insert with the same key, the second sees the
 *      first row and returns it instead of duplicating.
 *
 * Returns the booking row. The caller must subsequently:
 *   - UPDATE payments SET booking_id = booking.id, status = 'CAPTURED' …
 *   - UPDATE <table> SET payment_status = 'PAID', payment_id = payment.id …
 */
export async function materializeBookingFromPayment(
  client: PoolClient,
  payment: {
    id: string;
    booking_type: 'PUJA' | 'CHADHAVA' | 'APPOINTMENT';
    booking_id: string | null;
    booking_payload: unknown;
    booking_idempotency_key: string | null;
    devotee_id: string;
  },
): Promise<{ id: string; [k: string]: any }> {
  // If the booking was already materialised (e.g. webhook fired first, now
  // /verify is calling us), the row is on `payment.booking_id`. Fetch and
  // return it — this path keeps verify idempotent.
  if (payment.booking_id) {
    const table = tableForBookingType(payment.booking_type);
    const existing = await client.query(`SELECT * FROM ${table} WHERE id = $1`, [payment.booking_id]);
    if (existing.rows.length > 0) {
      (existing.rows[0] as any).materialized_already = true;
      return existing.rows[0];
    }
  }

  const payload = (payment.booking_payload ?? {}) as Record<string, unknown>;

  // Inject the carried-over idempotency_key so the per-booking-type helpers
  // can detect a concurrent race and dedupe.
  if (payment.booking_idempotency_key) {
    payload.idempotency_key = payment.booking_idempotency_key;
  }

  switch (payment.booking_type) {
    case 'PUJA':
      return createPujaBookingTx(client, payload as PujaBookingPayload, payment.devotee_id);
    case 'CHADHAVA':
      return createChadhavaBookingTx(client, payload as ChadhavaBookingPayload, payment.devotee_id);
    case 'APPOINTMENT':
      return createAppointmentTx(client, payload as AppointmentBookingPayload, payment.devotee_id);
    default:
      throw new Error(`materializeBookingFromPayment: unknown booking_type "${payment.booking_type}"`);
  }
}

export function tableForBookingType(bookingType: string): string {
  if (bookingType === 'PUJA') return 'puja_bookings';
  if (bookingType === 'CHADHAVA') return 'chadhava_bookings';
  return 'appointments';
}

/** Maps any of the per-booking-type validation errors to its HTTP status. */
export function bookingErrorStatus(err: unknown): number | null {
  if (err instanceof PujaBookingError) return err.status;
  if (err instanceof ChadhavaBookingError) return err.status;
  if (err instanceof AppointmentBookingError) return err.status;
  return null;
}

/**
 * Validates a booking payload BEFORE the Razorpay order is created and computes
 * the authoritative server-side amount. Called from POST /payments/create-order.
 *
 * Why: we can't trust the client's `amount_preview` (DevTools tampering, stale
 * UI prices). Re-computing here means the Razorpay order amount and the future
 * materialized booking cost are guaranteed to agree.
 *
 * Returns just the amount + a normalised payload that we'll stash on the
 * payments row verbatim. The actual INSERT happens later in materialize().
 */
export async function previewBookingAmount(
  client: PoolClient,
  bookingType: 'PUJA' | 'CHADHAVA' | 'APPOINTMENT',
  payload: Record<string, unknown>,
): Promise<{ amount: number }> {
  switch (bookingType) {
    case 'PUJA': {
      const puja_event_id = payload.puja_event_id as string | undefined;
      const devotee_count = Number(payload.devotee_count ?? 1);
      if (!puja_event_id) throw new PujaBookingError(400, 'puja_event_id is required');
      const ev = await client.query(
        `SELECT pe.start_time, p.price_for_1, p.price_for_2, p.price_for_4, p.price_for_6
           FROM puja_events pe JOIN pujas p ON p.id = pe.puja_id WHERE pe.id = $1`,
        [puja_event_id],
      );
      if (ev.rows.length === 0) throw new PujaBookingError(404, 'Puja event not found');
      const r = ev.rows[0];
      let cost: number;
      if (devotee_count <= 1) cost = Number(r.price_for_1);
      else if (devotee_count <= 2) cost = Number(r.price_for_2);
      else if (devotee_count <= 4) cost = Number(r.price_for_4);
      else cost = Number(r.price_for_6);
      if (!Number.isFinite(cost) || cost <= 0) {
        throw new PujaBookingError(400, 'This puja has no price configured for the selected number of devotees.');
      }
      return { amount: cost };
    }
    case 'CHADHAVA': {
      const chadhava_event_id = payload.chadhava_event_id as string | undefined;
      const devotees = (payload.devotees as Array<unknown>) ?? [];
      const offerings = (payload.offerings as Array<{ offering_id: string; quantity?: number }>) ?? [];
      if (!chadhava_event_id) throw new ChadhavaBookingError(400, 'chadhava_event_id is required');
      if (!Array.isArray(devotees) || devotees.length < 1 || devotees.length > 6) {
        throw new ChadhavaBookingError(400, 'A chadhava booking must have between 1 and 6 devotees.');
      }
      if (!Array.isArray(offerings) || offerings.length === 0) {
        throw new ChadhavaBookingError(400, 'At least one offering is required');
      }
      let total = 0;
      for (const off of offerings) {
        const pr = await client.query(`SELECT price FROM chadhava_offerings WHERE id = $1`, [off.offering_id]);
        if (pr.rows.length === 0) throw new ChadhavaBookingError(400, `Offering ${off.offering_id} not found`);
        total += Number(pr.rows[0].price) * (off.quantity ?? 1);
      }
      total = total * devotees.length;
      if (!Number.isFinite(total) || total <= 0) {
        throw new ChadhavaBookingError(400, 'Total cost is zero — please select at least one offering with a price.');
      }
      return { amount: total };
    }
    case 'APPOINTMENT': {
      const astrologer_id = payload.astrologer_id as string | undefined;
      const duration = payload.duration as string | undefined;
      if (!astrologer_id || !duration) throw new AppointmentBookingError(400, 'astrologer_id and duration are required');
      const priceCol = { '15min': 'price_15min', '30min': 'price_30min', '1hour': 'price_1hour', '2hour': 'price_2hour' }[duration];
      if (!priceCol) throw new AppointmentBookingError(400, `duration must be one of: 15min, 30min, 1hour, 2hour`);
      const ar = await client.query(
        `SELECT ${priceCol} AS price FROM astrologers WHERE id = $1 AND is_active = true`,
        [astrologer_id],
      );
      if (ar.rows.length === 0) throw new AppointmentBookingError(404, 'Astrologer not found or inactive');
      const cost = Number(ar.rows[0].price);
      if (!Number.isFinite(cost) || cost <= 0) {
        throw new AppointmentBookingError(400, `Astrologer has no valid price configured for ${duration}.`);
      }
      return { amount: cost };
    }
    default:
      throw new Error(`previewBookingAmount: unknown booking_type "${bookingType}"`);
  }
}
