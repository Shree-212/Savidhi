import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const chadhavaEventsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown) => typeof v === 'string' && UUID_RE.test(v);

// ─── Stage transitions (same machine as puja events) ─────────────────────────
const STAGE_TRANSITIONS: Record<string, { next: string; requiredField?: string; statusUpdate?: string }> = {
  YET_TO_START:          { next: 'LIVE_ADDED',            requiredField: 'live_link',          statusUpdate: 'INPROGRESS' },
  LIVE_ADDED:            { next: 'SHORT_VIDEO_ADDED',     requiredField: 'short_video_url' },
  SHORT_VIDEO_ADDED:     { next: 'SANKALP_VIDEO_ADDED',   requiredField: 'sankalp_video_url' },
  SANKALP_VIDEO_ADDED:   { next: 'TO_BE_SHIPPED' },
  TO_BE_SHIPPED:         { next: 'SHIPPED',               statusUpdate: 'COMPLETED' },
};

/** GET / – list chadhava events. Admins see all; devotees see upcoming non-cancelled. */
chadhavaEventsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, chadhava_id, from_date, to_date, upcoming, page = '1', limit = '20' } = req.query;
    const role = req.headers['x-user-role'] as string;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (role === 'DEVOTEE') {
      conditions.push(`ce.status != 'COMPLETED'`);
      conditions.push(`ce.start_time >= NOW() - INTERVAL '1 day'`);
    }

    if (status) { conditions.push(`ce.status = $${idx++}`); params.push(status); }
    if (chadhava_id) {
      // Accept either a UUID directly, or a slug (resolve via subquery on chadhavas.slug)
      if (isUuid(chadhava_id)) {
        conditions.push(`ce.chadhava_id = $${idx++}`);
        params.push(chadhava_id);
      } else {
        conditions.push(`ce.chadhava_id = (SELECT id FROM chadhavas WHERE slug = $${idx++})`);
        params.push(chadhava_id);
      }
    }
    if (from_date) { conditions.push(`ce.start_time >= $${idx++}`); params.push(from_date); }
    if (to_date) { conditions.push(`ce.start_time <= $${idx++}`); params.push(to_date); }
    if (upcoming === 'true') { conditions.push(`ce.start_time >= NOW()`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM chadhava_events ce ${where}`, params);
    const total = Number(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT ce.*,
              c.name AS chadhava_name,
              t.name AS temple_name,
              COALESCE(bk.total_bookings, 0)::int AS total_bookings
       FROM chadhava_events ce
       JOIN chadhavas c ON c.id = ce.chadhava_id
       JOIN temples t   ON t.id = c.temple_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS total_bookings
         FROM chadhava_bookings
         WHERE chadhava_event_id = ce.id AND status != 'CANCELLED'
       ) bk ON true
       ${where}
       ORDER BY ce.start_time DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limitNum, offset],
    );

    res.json({ success: true, data: rows, meta: { total, page: pageNum, limit: limitNum } });
  } catch (err) { next(err); }
});

/** GET /:id – event detail with bookings (admin) / public (devotee) */
chadhavaEventsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;

    const eventResult = await pool.query(
      `SELECT ce.*,
              c.name AS chadhava_name, t.name AS temple_name,
              pj.name AS pujari_name
       FROM chadhava_events ce
       JOIN chadhavas c ON c.id = ce.chadhava_id
       JOIN temples t   ON t.id = c.temple_id
       LEFT JOIN pujaris pj ON pj.id = ce.pujari_id
       WHERE ce.id = $1`,
      [id],
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chadhava event not found' });
    }

    // Devotees get event info only
    if (role === 'DEVOTEE') {
      return res.json({ success: true, data: eventResult.rows[0] });
    }

    const bookingsResult = await pool.query(
      `SELECT cb.*, d.name AS devotee_name, d.phone AS devotee_phone
       FROM chadhava_bookings cb
       JOIN devotees d ON d.id = cb.devotee_id
       WHERE cb.chadhava_event_id = $1
       ORDER BY cb.created_at DESC`,
      [id],
    );

    for (const booking of bookingsResult.rows) {
      const devResult = await pool.query(
        `SELECT id, name, gotra FROM chadhava_booking_devotees WHERE chadhava_booking_id = $1`,
        [booking.id],
      );
      booking.devotees = devResult.rows;

      const offResult = await pool.query(
        `SELECT cbo.*, co.item_name
         FROM chadhava_booking_offerings cbo
         JOIN chadhava_offerings co ON co.id = cbo.offering_id
         WHERE cbo.chadhava_booking_id = $1`,
        [booking.id],
      );
      booking.offerings = offResult.rows;
    }

    const event = eventResult.rows[0];
    event.bookings = bookingsResult.rows;

    res.json({ success: true, data: event });
  } catch (err) { next(err); }
});

/** POST / – create chadhava event (admin) */
chadhavaEventsRouter.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chadhava_id, pujari_id, start_time } = req.body;
    if (!chadhava_id || !start_time) {
      return res.status(400).json({ success: false, message: 'chadhava_id and start_time are required' });
    }

    const chResult = await pool.query(`SELECT max_bookings_per_event FROM chadhavas WHERE id = $1`, [chadhava_id]);
    if (chResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chadhava not found' });
    }

    const maxBookings = chResult.rows[0].max_bookings_per_event;

    const { rows } = await pool.query(
      `INSERT INTO chadhava_events (chadhava_id, pujari_id, start_time, max_bookings)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [chadhava_id, pujari_id ?? null, start_time, maxBookings],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id – admin updates event metadata (pujari / start_time / max_bookings) */
chadhavaEventsRouter.patch('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const allowed = ['pujari_id', 'start_time', 'max_bookings'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(req.body[field]);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE chadhava_events SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chadhava event not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id/stage – advance event stage */
chadhavaEventsRouter.patch('/:id/stage', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const eventResult = await pool.query(`SELECT stage, status FROM chadhava_events WHERE id = $1`, [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Chadhava event not found' });
    }

    const currentStage = eventResult.rows[0].stage as string;
    const transition = STAGE_TRANSITIONS[currentStage];
    if (!transition) {
      return res.status(400).json({ success: false, message: `Cannot advance from stage "${currentStage}"` });
    }

    if (transition.requiredField && !req.body[transition.requiredField]) {
      return res.status(400).json({
        success: false,
        message: `"${transition.requiredField}" is required to advance from "${currentStage}" to "${transition.next}"`,
      });
    }

    const sets: string[] = [`stage = $1`];
    const params: unknown[] = [transition.next];
    let idx = 2;

    if (transition.statusUpdate) {
      sets.push(`status = $${idx++}`);
      params.push(transition.statusUpdate);
    }

    if (transition.requiredField) {
      sets.push(`${transition.requiredField} = $${idx++}`);
      params.push(req.body[transition.requiredField]);
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE chadhava_events SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    if (transition.statusUpdate) {
      const bookingStatus = transition.statusUpdate === 'COMPLETED' ? 'COMPLETED' : 'INPROGRESS';
      await pool.query(
        `UPDATE chadhava_bookings SET status = $1, updated_at = NOW() WHERE chadhava_event_id = $2 AND status != 'CANCELLED'`,
        [bookingStatus, id],
      );
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});
