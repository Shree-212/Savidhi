import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { cancelToken } from '../lib/razorpayHelpers';

export const pujaBookingsRouter = Router();

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

    // Devotees can only see their own bookings
    if (role === 'DEVOTEE') {
      conditions.push(`pb.devotee_id = $${idx++}`);
      params.push(userId);
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
    const {
      puja_event_id,
      devotee_count = 1,
      sankalp,
      prasad_delivery_address,
      devotees,
      idempotency_key,
      booking_type: rawBookingType,
      subscription_count: rawSubscriptionCount,
      // Structured shipping address — required when the parent puja.send_hamper
      // is true (validated below). Legacy callers that still send only the TEXT
      // prasad_delivery_address keep working — we just won't have an AWB-able
      // address until the admin fills these in from the Ship modal.
      ship_to_name,
      ship_to_phone,
      ship_to_line1,
      ship_to_line2,
      ship_to_city,
      ship_to_state,
      ship_to_pincode,
      ship_to_country,
    } = req.body;

    if (!puja_event_id) {
      return res.status(400).json({ success: false, message: 'puja_event_id is required' });
    }

    // ── Subscription params validation ─────────────────────────────────────
    const bookingType = String(rawBookingType ?? 'ONE_TIME').toUpperCase();
    if (bookingType !== 'ONE_TIME' && bookingType !== 'SUBSCRIPTION') {
      return res.status(400).json({ success: false, message: `booking_type must be ONE_TIME or SUBSCRIPTION (got "${rawBookingType}")` });
    }
    let subscriptionCount: number | null = null;
    if (bookingType === 'SUBSCRIPTION') {
      subscriptionCount = Number(rawSubscriptionCount);
      // Range guard: 2 (otherwise it's a one-time booking) — 12 (anti-abuse;
      // tune later if devotees actually want longer commitments).
      if (!Number.isInteger(subscriptionCount) || subscriptionCount < 2 || subscriptionCount > 12) {
        return res.status(400).json({ success: false, message: 'subscription_count must be an integer between 2 and 12 for SUBSCRIPTION bookings' });
      }
    }

    // Idempotency: replay-safe inserts. See chadhavaBookings.ts for rationale.
    if (idempotency_key) {
      const existing = await pool.query(
        `SELECT * FROM puja_bookings WHERE devotee_id = $1 AND idempotency_key = $2`,
        [userId, idempotency_key],
      );
      if (existing.rows.length > 0) {
        const booking = existing.rows[0];
        const devRows = await pool.query(
          `SELECT id, name, relation, gotra FROM puja_booking_devotees WHERE puja_booking_id = $1`,
          [booking.id],
        );
        booking.devotees = devRows.rows;
        return res.status(200).json({ success: true, data: booking, idempotent_replay: true });
      }
    }

    await client.query('BEGIN');

    // Fetch event + puja to calculate cost and validate booking_mode
    const eventResult = await client.query(
      `SELECT pe.*, p.price_for_1, p.price_for_2, p.price_for_4, p.price_for_6, p.max_devotee, p.booking_mode, p.send_hamper
       FROM puja_events pe
       JOIN pujas p ON p.id = pe.puja_id
       WHERE pe.id = $1`,
      [puja_event_id],
    );
    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }

    const event = eventResult.rows[0];

    // Validate booking_type against the parent puja's booking_mode.
    //   ONE_TIME mode      → reject SUBSCRIPTION requests
    //   SUBSCRIPTION mode  → reject ONE_TIME requests
    //   BOTH               → both allowed
    const pujaMode = String(event.booking_mode ?? 'ONE_TIME').toUpperCase();
    if (pujaMode === 'ONE_TIME' && bookingType === 'SUBSCRIPTION') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This puja does not support subscription bookings' });
    }
    if (pujaMode === 'SUBSCRIPTION' && bookingType === 'ONE_TIME') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This puja is subscription-only; one-time bookings are not allowed' });
    }

    // Structured shipping address validation. When the puja ships a hamper,
    // we require the new fields so the admin Ship modal has AWB-able data.
    // The legacy TEXT field stays accepted for backward compat.
    const sendsHamper = !!event.send_hamper;
    if (sendsHamper) {
      const pin = String(ship_to_pincode ?? '').replace(/\D/g, '');
      const phoneDigits = String(ship_to_phone ?? '').replace(/\D/g, '').slice(-10);
      const required = { ship_to_name, ship_to_line1, ship_to_city, ship_to_state };
      const missing = Object.entries(required).filter(([, v]) => !String(v ?? '').trim()).map(([k]) => k);
      if (missing.length || pin.length !== 6 || phoneDigits.length !== 10) {
        // Don't hard-fail here yet — legacy clients still POST only the TEXT
        // blob. Just log so the admin Ship modal can later refuse to ship
        // until the address is fixed. (Strict validation lives in /:id/ship.)
        console.warn('[puja-bookings.create] incomplete structured ship_to_*', {
          missing, pin_len: pin.length, phone_len: phoneDigits.length,
        });
      }
    }

    // Check capacity
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM puja_bookings WHERE puja_event_id = $1 AND status != 'CANCELLED'`,
      [puja_event_id],
    );
    if (countResult.rows[0].cnt >= event.max_bookings) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    // Calculate cost based on devotee_count
    let cost: number;
    const dc = Number(devotee_count);
    if (dc <= 1) cost = Number(event.price_for_1);
    else if (dc <= 2) cost = Number(event.price_for_2);
    else if (dc <= 4) cost = Number(event.price_for_4);
    else cost = Number(event.price_for_6);

    if (!Number.isFinite(cost) || cost <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This puja has no price configured for the selected number of devotees. Please contact support.',
      });
    }

    // Subscription bookkeeping (Phase A):
    //   - subscription_remaining starts at N-1 because the current booking IS
    //     the first cycle. The worker decrements as it materialises children.
    //   - next_charge_at hooks the worker to the first event we already booked;
    //     the verify step (Phase B) will advance this to the NEXT event after
    //     capturing the Razorpay token.
    const subscriptionRemaining = bookingType === 'SUBSCRIPTION' && subscriptionCount
      ? subscriptionCount - 1
      : null;
    const nextChargeAt = bookingType === 'SUBSCRIPTION' ? event.start_time : null;

    // If structured fields are present but the legacy TEXT field is not, build
    // it server-side so any code still reading prasad_delivery_address keeps
    // working without forcing the client to send both copies.
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

    // Insert booking devotees
    if (Array.isArray(devotees)) {
      for (const dev of devotees) {
        await client.query(
          `INSERT INTO puja_booking_devotees (puja_booking_id, name, relation, gotra)
           VALUES ($1, $2, $3, $4)`,
          [booking.id, dev.name, dev.relation ?? null, dev.gotra],
        );
      }
    }

    await client.query('COMMIT');

    // Fetch inserted devotees
    const devRows = await pool.query(
      `SELECT id, name, relation, gotra FROM puja_booking_devotees WHERE puja_booking_id = $1`,
      [booking.id],
    );
    booking.devotees = devRows.rows;

    console.log('[puja-bookings.create]', {
      id: booking.id,
      devotee_id: userId,
      devotee_count: dc,
      cost,
      booking_type: bookingType,
      subscription_count: subscriptionCount,
    });
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    await client.query('ROLLBACK');
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
