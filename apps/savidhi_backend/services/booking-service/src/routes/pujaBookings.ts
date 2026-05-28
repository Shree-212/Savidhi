import { Router, Request, Response, NextFunction } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { cancelToken } from '../lib/razorpayHelpers';

export const pujaBookingsRouter = Router();

/**
 * Shape of the JSON body the puja booking page sends. Mirrors the `req.body`
 * fields read in the POST / handler. Exported because the deferred-creation
 * payment flow (payments.ts /verify) calls createPujaBookingTx() too, passing
 * the same payload that's been stashed on the payments row.
 */
export type PujaBookingPayload = {
  puja_event_id: string;
  devotee_count?: number;
  sankalp?: string | null;
  prasad_delivery_address?: string | null;
  devotees?: Array<{ name: string; relation?: string | null; gotra?: string }>;
  idempotency_key?: string | null;
  booking_type?: string;
  subscription_count?: number;
  ship_to_name?: string;
  ship_to_phone?: string;
  ship_to_line1?: string;
  ship_to_line2?: string;
  ship_to_city?: string;
  ship_to_state?: string;
  ship_to_pincode?: string;
  ship_to_country?: string;
};

export class PujaBookingError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Core puja-booking creation, callable from BOTH the customer POST handler and
 * the payments.verify materializer. Caller owns the transaction (so verify can
 * flip payments.status to CAPTURED in the same tx). Throws PujaBookingError on
 * validation failures — the caller maps it to the right HTTP response.
 *
 * Idempotency: if `body.idempotency_key` matches an existing puja_bookings row
 * for this devotee, returns that row instead of inserting a duplicate. This is
 * what makes a verify+webhook race produce exactly one booking.
 */
export async function createPujaBookingTx(
  client: PoolClient,
  body: PujaBookingPayload,
  userId: string,
): Promise<any> {
  const {
    puja_event_id,
    devotee_count = 1,
    sankalp,
    prasad_delivery_address,
    devotees,
    idempotency_key,
    booking_type: rawBookingType,
    subscription_count: rawSubscriptionCount,
    ship_to_name,
    ship_to_phone,
    ship_to_line1,
    ship_to_line2,
    ship_to_city,
    ship_to_state,
    ship_to_pincode,
    ship_to_country,
  } = body;

  if (!puja_event_id) throw new PujaBookingError(400, 'puja_event_id is required');

  const bookingType = String(rawBookingType ?? 'ONE_TIME').toUpperCase();
  if (bookingType !== 'ONE_TIME' && bookingType !== 'SUBSCRIPTION') {
    throw new PujaBookingError(400, `booking_type must be ONE_TIME or SUBSCRIPTION (got "${rawBookingType}")`);
  }
  let subscriptionCount: number | null = null;
  if (bookingType === 'SUBSCRIPTION') {
    subscriptionCount = Number(rawSubscriptionCount);
    if (!Number.isInteger(subscriptionCount) || subscriptionCount < 2 || subscriptionCount > 12) {
      throw new PujaBookingError(400, 'subscription_count must be an integer between 2 and 12 for SUBSCRIPTION bookings');
    }
  }

  if (idempotency_key) {
    const existing = await client.query(
      `SELECT * FROM puja_bookings WHERE devotee_id = $1 AND idempotency_key = $2`,
      [userId, idempotency_key],
    );
    if (existing.rows.length > 0) {
      const booking = existing.rows[0];
      const devRows = await client.query(
        `SELECT id, name, relation, gotra FROM puja_booking_devotees WHERE puja_booking_id = $1`,
        [booking.id],
      );
      booking.devotees = devRows.rows;
      (booking as any).idempotent_replay = true;
      return booking;
    }
  }

  const eventResult = await client.query(
    `SELECT pe.*, p.price_for_1, p.price_for_2, p.price_for_4, p.price_for_6, p.max_devotee, p.booking_mode, p.send_hamper
     FROM puja_events pe
     JOIN pujas p ON p.id = pe.puja_id
     WHERE pe.id = $1`,
    [puja_event_id],
  );
  if (eventResult.rows.length === 0) throw new PujaBookingError(404, 'Puja event not found');

  const event = eventResult.rows[0];

  const pujaMode = String(event.booking_mode ?? 'ONE_TIME').toUpperCase();
  if (pujaMode === 'ONE_TIME' && bookingType === 'SUBSCRIPTION') {
    throw new PujaBookingError(400, 'This puja does not support subscription bookings');
  }
  if (pujaMode === 'SUBSCRIPTION' && bookingType === 'ONE_TIME') {
    throw new PujaBookingError(400, 'This puja is subscription-only; one-time bookings are not allowed');
  }

  const sendsHamper = !!event.send_hamper;
  if (sendsHamper) {
    const pin = String(ship_to_pincode ?? '').replace(/\D/g, '');
    const phoneDigits = String(ship_to_phone ?? '').replace(/\D/g, '').slice(-10);
    const required = { ship_to_name, ship_to_line1, ship_to_city, ship_to_state };
    const missing = Object.entries(required).filter(([, v]) => !String(v ?? '').trim()).map(([k]) => k);
    if (missing.length || pin.length !== 6 || phoneDigits.length !== 10) {
      console.warn('[puja-bookings.create] incomplete structured ship_to_*', {
        missing, pin_len: pin.length, phone_len: phoneDigits.length,
      });
    }
  }

  const countResult = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM puja_bookings WHERE puja_event_id = $1 AND status != 'CANCELLED'`,
    [puja_event_id],
  );
  if (countResult.rows[0].cnt >= event.max_bookings) {
    throw new PujaBookingError(400, 'Event is fully booked');
  }

  let cost: number;
  const dc = Number(devotee_count);
  if (dc <= 1) cost = Number(event.price_for_1);
  else if (dc <= 2) cost = Number(event.price_for_2);
  else if (dc <= 4) cost = Number(event.price_for_4);
  else cost = Number(event.price_for_6);

  if (!Number.isFinite(cost) || cost <= 0) {
    throw new PujaBookingError(400, 'This puja has no price configured for the selected number of devotees. Please contact support.');
  }

  const subscriptionRemaining = bookingType === 'SUBSCRIPTION' && subscriptionCount
    ? subscriptionCount - 1
    : null;
  const nextChargeAt = bookingType === 'SUBSCRIPTION' ? event.start_time : null;

  const builtLegacyAddress = (() => {
    if (prasad_delivery_address) return prasad_delivery_address;
    if (!sendsHamper) return null;
    const parts = [ship_to_name, ship_to_line1, ship_to_line2, ship_to_city, ship_to_state, ship_to_pincode]
      .map((p) => String(p ?? '').trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  })();

  const bookingResult = await client.query(
    `INSERT INTO puja_bookings (
       puja_event_id, devotee_id, devotee_count, cost,
       sankalp, prasad_delivery_address, idempotency_key,
       booking_type, subscription_count, subscription_remaining, next_charge_at,
       ship_to_name, ship_to_phone, ship_to_line1, ship_to_line2,
       ship_to_city, ship_to_state, ship_to_pincode, ship_to_country
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
             $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
    [
      puja_event_id, userId, dc, cost,
      sankalp ?? null, builtLegacyAddress, idempotency_key ?? null,
      bookingType, subscriptionCount, subscriptionRemaining, nextChargeAt,
      ship_to_name ?? null,
      ship_to_phone ? String(ship_to_phone).replace(/\D/g, '').slice(-10) : null,
      ship_to_line1 ?? null,
      ship_to_line2 ?? null,
      ship_to_city ?? null,
      ship_to_state ?? null,
      ship_to_pincode ? String(ship_to_pincode).replace(/\D/g, '') : null,
      ship_to_country ?? 'India',
    ],
  );
  const booking = bookingResult.rows[0];

  if (Array.isArray(devotees)) {
    for (const dev of devotees) {
      await client.query(
        `INSERT INTO puja_booking_devotees (puja_booking_id, name, relation, gotra)
         VALUES ($1, $2, $3, $4)`,
        [booking.id, dev.name, dev.relation ?? null, dev.gotra ?? null],
      );
    }
  }

  const devRowsTx = await client.query(
    `SELECT id, name, relation, gotra FROM puja_booking_devotees WHERE puja_booking_id = $1`,
    [booking.id],
  );
  booking.devotees = devRowsTx.rows;

  console.log('[puja-bookings.create]', {
    id: booking.id,
    devotee_id: userId,
    devotee_count: dc,
    cost,
    booking_type: bookingType,
    subscription_count: subscriptionCount,
  });

  return booking;
}

/** GET / – list puja bookings. Admin sees all (with filters); Devotee sees own. */
pujaBookingsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { status, puja_event_id, payment_status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Devotees can only see their own bookings AND only PAID ones — the
    // deferred-booking flow (May 2026) means newly created rows are always
    // PAID, but pre-fix ghost rows with PENDING payment_status still exist
    // and must not be shown to customers.
    if (role === 'DEVOTEE') {
      conditions.push(`pb.devotee_id = $${idx++}`);
      params.push(userId);
      conditions.push(`pb.payment_status = 'PAID'`);
    }

    if (status) { conditions.push(`pb.status = $${idx++}`); params.push(status); }
    if (puja_event_id) { conditions.push(`pb.puja_event_id = $${idx++}`); params.push(puja_event_id); }
    if (payment_status) { conditions.push(`pb.payment_status = $${idx++}`); params.push(payment_status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM puja_bookings pb ${where}`,
      params,
    );
    const total = Number(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT pb.*,
              p.name   AS puja_name,
              p.event_repeats,
              p.repeat_duration,
              p.repeats_on,
              t.name   AS temple_name,
              pe.start_time AS event_start_time,
              pe.stage  AS event_stage,
              pe.status AS event_status,
              d.name   AS devotee_name,
              d.phone  AS devotee_phone
       FROM puja_bookings pb
       JOIN puja_events pe ON pe.id = pb.puja_event_id
       JOIN pujas p        ON p.id  = pe.puja_id
       JOIN temples t      ON t.id  = p.temple_id
       JOIN devotees d     ON d.id  = pb.devotee_id
       ${where}
       ORDER BY pb.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limitNum, offset],
    );

    res.json({ success: true, data: rows, meta: { total, page: pageNum, limit: limitNum } });
  } catch (err) { next(err); }
});

/** GET /:id – booking detail with devotees list */
pujaBookingsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;

    const bookingResult = await pool.query(
      `SELECT pb.*,
              p.name AS puja_name,
              p.event_repeats,
              p.repeat_duration,
              p.repeats_on,
              t.name AS temple_name,
              pe.start_time AS event_start_time,
              pe.stage AS event_stage,
              pe.status AS event_status,
              pe.live_link AS event_live_link,
              pe.short_video_url AS event_short_video_url,
              pe.sankalp_video_url AS event_sankalp_video_url,
              p.send_hamper AS event_has_prasad,
              d.name AS devotee_name, d.phone AS devotee_phone
       FROM puja_bookings pb
       JOIN puja_events pe ON pe.id = pb.puja_event_id
       JOIN pujas p        ON p.id  = pe.puja_id
       JOIN temples t      ON t.id  = p.temple_id
       JOIN devotees d     ON d.id  = pb.devotee_id
       WHERE pb.id = $1`,
      [id],
    );
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    // Devotees can only view their own bookings
    if (role === 'DEVOTEE' && booking.devotee_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const devResult = await pool.query(
      `SELECT id, name, relation, gotra FROM puja_booking_devotees WHERE puja_booking_id = $1`,
      [id],
    );
    booking.devotees = devResult.rows;

    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
});

/** POST / – create puja booking (devotee-facing).
 *
 *  Phase A of subscription rollout (migration 023):
 *    - Accepts `booking_type` ('ONE_TIME' | 'SUBSCRIPTION', default ONE_TIME).
 *    - Accepts `subscription_count` (2-12) when type is SUBSCRIPTION.
 *    - Validates against the parent puja's `booking_mode` (ONE_TIME / SUBSCRIPTION / BOTH).
 *    - On SUBSCRIPTION: persists subscription_count, subscription_remaining = N-1,
 *      and sets next_charge_at = the booked event's start_time so Phase B's
 *      weekly rollover worker has a hook.
 *    - No child bookings are created here — that's the worker's job (Phase B).
 *    - No Razorpay subscription/mandate is set up here — that's Phase B.
 */
pujaBookingsRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const userId = req.headers['x-user-id'] as string;
    await client.query('BEGIN');
    const booking = await createPujaBookingTx(client, req.body, userId);
    await client.query('COMMIT');
    const status = (booking as any).idempotent_replay ? 200 : 201;
    res.status(status).json({ success: true, data: booking, ...(booking as any).idempotent_replay ? { idempotent_replay: true } : {} });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof PujaBookingError) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error('[puja-bookings.create] error', err);
    next(err);
  } finally {
    client.release();
  }
});

/**
 * PATCH /:id/cancel-repeat
 * Stops a SUBSCRIPTION booking from re-occurring on future events without
 * cancelling the already-booked one.
 *
 * Three things happen, in order:
 *   1. Flip parent.booking_type → 'ONE_TIME' so the weekly rollover worker
 *      stops picking it up.
 *   2. Cancel any CHILD bookings the worker already pre-created but hasn't
 *      charged yet (status='NOT_STARTED' AND payment_status IS NULL) — those
 *      are placeholder rows representing future cycles, not real attendance.
 *      Past PAID children stay untouched.
 *   3. Tell Razorpay to revoke the e-mandate token (`customers.deleteToken`)
 *      so the customer's bank won't allow any further debit even if our worker
 *      somehow tried. Soft-fail: a Razorpay error here doesn't undo the DB
 *      changes — we surface mandate_cancel_status so the caller can warn.
 *
 * Auth: devotee can only cancel their own subscription. Admin/operator can
 * cancel anyone's (the existing requireAuth + role check already covers this).
 */
pujaBookingsRouter.patch('/:id/cancel-repeat', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;

    const check = await pool.query(
      `SELECT devotee_id, booking_type, razorpay_customer_id, razorpay_token_id
         FROM puja_bookings WHERE id = $1`,
      [id],
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (role === 'DEVOTEE' && check.rows[0].devotee_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (check.rows[0].booking_type !== 'SUBSCRIPTION') {
      return res.status(400).json({ success: false, message: 'Booking is not a subscription' });
    }

    // 1. Flip parent.
    const { rows } = await pool.query(
      `UPDATE puja_bookings SET booking_type = 'ONE_TIME', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );

    // 2. Cancel pre-created but uncharged child placeholders.
    const childCancel = await pool.query(
      `UPDATE puja_bookings
          SET status = 'CANCELLED', booking_type = 'ONE_TIME', updated_at = NOW()
        WHERE parent_booking_id = $1
          AND status = 'NOT_STARTED'
          AND (payment_status IS NULL OR payment_status <> 'PAID')
        RETURNING id`,
      [id],
    );

    // 3. Revoke the Razorpay mandate token.
    let mandateCancelStatus: 'ok' | 'failed' | 'not_required' = 'not_required';
    let mandateCancelError: string | undefined;
    const { razorpay_token_id, razorpay_customer_id } = check.rows[0];
    if (razorpay_token_id && razorpay_customer_id) {
      const cancel = await cancelToken(razorpay_customer_id, razorpay_token_id);
      mandateCancelStatus = cancel.ok ? 'ok' : 'failed';
      if (!cancel.ok) mandateCancelError = cancel.error;
    }

    console.log('[puja-bookings.cancel-repeat]', {
      id, child_placeholders_cancelled: childCancel.rowCount ?? 0, mandate_cancel_status: mandateCancelStatus,
    });

    res.json({
      success: true,
      data: rows[0],
      message: 'Subscription stopped; current booking remains active.',
      meta: {
        child_placeholders_cancelled: childCancel.rowCount ?? 0,
        mandate_cancel_status: mandateCancelStatus,
        mandate_cancel_error: mandateCancelError,
      },
    });
  } catch (err) { next(err); }
});

/** PATCH /:id/ship-address — admin edits a booking's structured shipping
 *  address from the Ship Prashad modal (used to fix typos / missing pin codes
 *  before triggering the bulk shiprocket order). */
pujaBookingsRouter.patch('/:id/ship-address', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const allowed = ['ship_to_name', 'ship_to_phone', 'ship_to_line1', 'ship_to_line2', 'ship_to_city', 'ship_to_state', 'ship_to_pincode', 'ship_to_country'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        let v = req.body[f];
        if (f === 'ship_to_phone' && v) v = String(v).replace(/\D/g, '').slice(-10);
        if (f === 'ship_to_pincode' && v) v = String(v).replace(/\D/g, '');
        sets.push(`${f} = $${idx++}`);
        params.push(v || null);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }
    sets.push(`updated_at = NOW()`);
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE puja_bookings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id/sankalp-timestamp – admin sets the devotee-name timestamp for a booking */
pujaBookingsRouter.patch('/:id/sankalp-timestamp', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { sankalp_video_timestamp } = req.body;
    if (!sankalp_video_timestamp) {
      return res.status(400).json({ success: false, message: 'sankalp_video_timestamp is required' });
    }
    const { rows } = await pool.query(
      `UPDATE puja_bookings SET sankalp_video_timestamp = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [String(sankalp_video_timestamp), id],
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

/** PATCH /:id/cancel – cancel booking */
pujaBookingsRouter.patch('/:id/cancel', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;

    const check = await pool.query(`SELECT devotee_id, status FROM puja_bookings WHERE id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (role === 'DEVOTEE' && check.rows[0].devotee_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (check.rows[0].status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
    }

    const { rows } = await pool.query(
      `UPDATE puja_bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});
