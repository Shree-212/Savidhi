import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAuth } from '../middleware/auth';

export const chadhavaBookingsRouter = Router();

/** GET / – list chadhava bookings */
chadhavaBookingsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { status, chadhava_event_id, payment_status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (role === 'DEVOTEE') {
      conditions.push(`cb.devotee_id = $${idx++}`);
      params.push(userId);
    }

    if (status) { conditions.push(`cb.status = $${idx++}`); params.push(status); }
    if (chadhava_event_id) { conditions.push(`cb.chadhava_event_id = $${idx++}`); params.push(chadhava_event_id); }
    if (payment_status) { conditions.push(`cb.payment_status = $${idx++}`); params.push(payment_status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM chadhava_bookings cb ${where}`, params);
    const total = Number(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT cb.*,
              c.name   AS chadhava_name,
              t.name   AS temple_name,
              ce.start_time AS event_start_time,
              d.name   AS devotee_name,
              d.phone  AS devotee_phone
       FROM chadhava_bookings cb
       JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id
       JOIN chadhavas c        ON c.id  = ce.chadhava_id
       JOIN temples t          ON t.id  = c.temple_id
       JOIN devotees d         ON d.id  = cb.devotee_id
       ${where}
       ORDER BY cb.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limitNum, offset],
    );

    res.json({ success: true, data: rows, meta: { total, page: pageNum, limit: limitNum } });
  } catch (err) { next(err); }
});

/** GET /:id – booking detail with devotees and offerings */
chadhavaBookingsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;

    const bookingResult = await pool.query(
      `SELECT cb.*,
              c.name AS chadhava_name, t.name AS temple_name,
              ce.start_time AS event_start_time,
              d.name AS devotee_name, d.phone AS devotee_phone
       FROM chadhava_bookings cb
       JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id
       JOIN chadhavas c        ON c.id  = ce.chadhava_id
       JOIN temples t          ON t.id  = c.temple_id
       JOIN devotees d         ON d.id  = cb.devotee_id
       WHERE cb.id = $1`,
      [id],
    );
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    if (role === 'DEVOTEE' && booking.devotee_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const devResult = await pool.query(
      `SELECT id, name, gotra FROM chadhava_booking_devotees WHERE chadhava_booking_id = $1`,
      [id],
    );
    booking.devotees = devResult.rows;

    const offResult = await pool.query(
      `SELECT cbo.*, co.item_name
       FROM chadhava_booking_offerings cbo
       JOIN chadhava_offerings co ON co.id = cbo.offering_id
       WHERE cbo.chadhava_booking_id = $1`,
      [id],
    );
    booking.offerings = offResult.rows;

    res.json({ success: true, data: booking });
  } catch (err) { next(err); }
});

/** POST / – create chadhava booking */
chadhavaBookingsRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const userId = req.headers['x-user-id'] as string;
    const { chadhava_event_id, sankalp, prasad_delivery_address, devotees, offerings } = req.body;

    if (!chadhava_event_id) {
      return res.status(400).json({ success: false, message: 'chadhava_event_id is required' });
    }
    if (!Array.isArray(offerings) || offerings.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one offering is required' });
    }

    await client.query('BEGIN');

    // Validate event exists
    const eventResult = await client.query(
      `SELECT ce.*, c.max_bookings_per_event
       FROM chadhava_events ce
       JOIN chadhavas c ON c.id = ce.chadhava_id
       WHERE ce.id = $1`,
      [chadhava_event_id],
    );
    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Chadhava event not found' });
    }

    const event = eventResult.rows[0];

    // Check capacity
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM chadhava_bookings WHERE chadhava_event_id = $1 AND status != 'CANCELLED'`,
      [chadhava_event_id],
    );
    if (countResult.rows[0].cnt >= event.max_bookings) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    // Fetch offering prices and calculate total cost
    let totalCost = 0;
    const offeringDetails: { offering_id: string; quantity: number; unit_price: number }[] = [];

    for (const off of offerings) {
      const priceResult = await client.query(
        `SELECT id, price FROM chadhava_offerings WHERE id = $1`,
        [off.offering_id],
      );
      if (priceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Offering ${off.offering_id} not found` });
      }
      const unitPrice = Number(priceResult.rows[0].price);
      const qty = off.quantity ?? 1;
      totalCost += unitPrice * qty;
      offeringDetails.push({ offering_id: off.offering_id, quantity: qty, unit_price: unitPrice });
    }

    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Total cost is zero — please select at least one offering with a price.',
      });
    }

    const bookingResult = await client.query(
      `INSERT INTO chadhava_bookings (chadhava_event_id, devotee_id, cost, sankalp, prasad_delivery_address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [chadhava_event_id, userId, totalCost, sankalp ?? null, prasad_delivery_address ?? null],
    );
    const booking = bookingResult.rows[0];

    // Insert booking devotees
    if (Array.isArray(devotees)) {
      for (const dev of devotees) {
        await client.query(
          `INSERT INTO chadhava_booking_devotees (chadhava_booking_id, name, gotra)
           VALUES ($1, $2, $3)`,
          [booking.id, dev.name, dev.gotra],
        );
      }
    }

    // Insert booking offerings
    for (const off of offeringDetails) {
      await client.query(
        `INSERT INTO chadhava_booking_offerings (chadhava_booking_id, offering_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [booking.id, off.offering_id, off.quantity, off.unit_price],
      );
    }

    await client.query('COMMIT');

    // Fetch nested data
    const devRows = await pool.query(
      `SELECT id, name, gotra FROM chadhava_booking_devotees WHERE chadhava_booking_id = $1`,
      [booking.id],
    );
    booking.devotees = devRows.rows;

    const offRows = await pool.query(
      `SELECT cbo.*, co.item_name
       FROM chadhava_booking_offerings cbo
       JOIN chadhava_offerings co ON co.id = cbo.offering_id
       WHERE cbo.chadhava_booking_id = $1`,
      [booking.id],
    );
    booking.offerings = offRows.rows;

    console.log('[chadhava-bookings.create]', { id: booking.id, devotee_id: userId, cost: totalCost, offering_count: offeringDetails.length });
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[chadhava-bookings.create] error', err);
    next(err);
  } finally {
    client.release();
  }
});

/** PATCH /:id/cancel – cancel chadhava booking */
chadhavaBookingsRouter.patch('/:id/cancel', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;

    const check = await pool.query(`SELECT devotee_id, status FROM chadhava_bookings WHERE id = $1`, [id]);
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
      `UPDATE chadhava_bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});
