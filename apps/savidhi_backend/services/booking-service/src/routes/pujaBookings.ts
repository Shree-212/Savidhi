import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

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
              t.name   AS temple_name,
              pe.start_time AS event_start_time,
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
              p.name AS puja_name, t.name AS temple_name,
              pe.start_time AS event_start_time,
              pe.stage AS event_stage,
              pe.live_link AS event_live_link,
              pe.short_video_url AS event_short_video_url,
              pe.sankalp_video_url AS event_sankalp_video_url,
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

/** POST / – create puja booking (devotee-facing) */
pujaBookingsRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const userId = req.headers['x-user-id'] as string;
    const { puja_event_id, devotee_count = 1, sankalp, prasad_delivery_address, devotees } = req.body;

    if (!puja_event_id) {
      return res.status(400).json({ success: false, message: 'puja_event_id is required' });
    }

    await client.query('BEGIN');

    // Fetch event + puja to calculate cost
    const eventResult = await client.query(
      `SELECT pe.*, p.price_for_1, p.price_for_2, p.price_for_4, p.price_for_6, p.max_bookings_per_event
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

    const bookingResult = await client.query(
      `INSERT INTO puja_bookings (puja_event_id, devotee_id, devotee_count, cost, sankalp, prasad_delivery_address)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [puja_event_id, userId, dc, cost, sankalp ?? null, prasad_delivery_address ?? null],
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

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * PATCH /:id/cancel-repeat
 * Stops a SUBSCRIPTION booking from re-occurring on future events without
 * cancelling the already-booked one. Flips `booking_type` to 'ONE_TIME'.
 */
pujaBookingsRouter.patch('/:id/cancel-repeat', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;

    const check = await pool.query(`SELECT devotee_id, booking_type FROM puja_bookings WHERE id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (role === 'DEVOTEE' && check.rows[0].devotee_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (check.rows[0].booking_type !== 'SUBSCRIPTION') {
      return res.status(400).json({ success: false, message: 'Booking is not a subscription' });
    }

    const { rows } = await pool.query(
      `UPDATE puja_bookings SET booking_type = 'ONE_TIME', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    res.json({ success: true, data: rows[0], message: 'Subscription stopped; current booking remains active.' });
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
