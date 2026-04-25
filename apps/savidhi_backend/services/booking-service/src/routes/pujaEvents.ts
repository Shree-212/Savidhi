import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const pujaEventsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown) => typeof v === 'string' && UUID_RE.test(v);

// ─── Allowed stage transitions & side-effects ────────────────────────────────
const STAGE_TRANSITIONS: Record<string, { next: string; requiredField?: string; statusUpdate?: string }> = {
  YET_TO_START:          { next: 'LIVE_ADDED',            requiredField: 'live_link',          statusUpdate: 'INPROGRESS' },
  LIVE_ADDED:            { next: 'SHORT_VIDEO_ADDED',     requiredField: 'short_video_url' },
  SHORT_VIDEO_ADDED:     { next: 'SANKALP_VIDEO_ADDED',   requiredField: 'sankalp_video_url' },
  SANKALP_VIDEO_ADDED:   { next: 'TO_BE_SHIPPED' },
  TO_BE_SHIPPED:         { next: 'SHIPPED',               statusUpdate: 'COMPLETED' },
};

/** GET / – list puja events. Admins see all; devotees see future non-cancelled events. */
pujaEventsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, puja_id, from_date, to_date, upcoming, page = '1', limit = '20' } = req.query;
    const role = req.headers['x-user-role'] as string;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Devotees can only see events they can still book (future, not completed)
    if (role === 'DEVOTEE') {
      conditions.push(`pe.status != 'COMPLETED'`);
      conditions.push(`pe.start_time >= NOW() - INTERVAL '1 day'`);
    }

    if (status) { conditions.push(`pe.status = $${idx++}`); params.push(status); }
    if (puja_id) {
      // Accept either a UUID directly, or a slug (resolve via subquery on pujas.slug)
      if (isUuid(puja_id)) {
        conditions.push(`pe.puja_id = $${idx++}`);
        params.push(puja_id);
      } else {
        conditions.push(`pe.puja_id = (SELECT id FROM pujas WHERE slug = $${idx++})`);
        params.push(puja_id);
      }
    }
    if (from_date) { conditions.push(`pe.start_time >= $${idx++}`); params.push(from_date); }
    if (to_date) { conditions.push(`pe.start_time <= $${idx++}`); params.push(to_date); }
    if (upcoming === 'true') { conditions.push(`pe.start_time >= NOW()`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM puja_events pe ${where}`, params);
    const total = Number(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT pe.*,
              p.name  AS puja_name,
              t.name  AS temple_name,
              COALESCE(bk.total_bookings, 0)::int  AS total_bookings,
              COALESCE(bk.total_devotees, 0)::int   AS total_devotees
       FROM puja_events pe
       JOIN pujas p   ON p.id = pe.puja_id
       JOIN temples t ON t.id = p.temple_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)                        AS total_bookings,
                COALESCE(SUM(devotee_count), 0) AS total_devotees
         FROM puja_bookings
         WHERE puja_event_id = pe.id AND status != 'CANCELLED'
       ) bk ON true
       ${where}
       ORDER BY pe.start_time DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limitNum, offset],
    );

    res.json({ success: true, data: rows, meta: { total, page: pageNum, limit: limitNum } });
  } catch (err) { next(err); }
});

/** GET /:id – event detail with nested bookings (admin) / public event info (devotee) */
pujaEventsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;

    const eventResult = await pool.query(
      `SELECT pe.*,
              p.name AS puja_name, t.name AS temple_name,
              pj.name AS pujari_name
       FROM puja_events pe
       JOIN pujas p   ON p.id = pe.puja_id
       JOIN temples t ON t.id = p.temple_id
       LEFT JOIN pujaris pj ON pj.id = pe.pujari_id
       WHERE pe.id = $1`,
      [id],
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }

    // Devotees get event info only — no bookings list
    if (role === 'DEVOTEE') {
      return res.json({ success: true, data: eventResult.rows[0] });
    }

    const bookingsResult = await pool.query(
      `SELECT pb.*, d.name AS devotee_name, d.phone AS devotee_phone
       FROM puja_bookings pb
       JOIN devotees d ON d.id = pb.devotee_id
       WHERE pb.puja_event_id = $1
       ORDER BY pb.created_at DESC`,
      [id],
    );

    // Attach devotee details per booking
    for (const booking of bookingsResult.rows) {
      const devResult = await pool.query(
        `SELECT id, name, relation, gotra FROM puja_booking_devotees WHERE puja_booking_id = $1`,
        [booking.id],
      );
      booking.devotees = devResult.rows;
    }

    const event = eventResult.rows[0];
    event.bookings = bookingsResult.rows;

    res.json({ success: true, data: event });
  } catch (err) { next(err); }
});

/** POST / – create puja event */
pujaEventsRouter.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { puja_id, pujari_id, start_time } = req.body;
    if (!puja_id || !start_time) {
      return res.status(400).json({ success: false, message: 'puja_id and start_time are required' });
    }

    // Fetch max_bookings from puja definition
    const pujaResult = await pool.query(`SELECT max_bookings_per_event FROM pujas WHERE id = $1`, [puja_id]);
    if (pujaResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja not found' });
    }

    const maxBookings = pujaResult.rows[0].max_bookings_per_event;

    const { rows } = await pool.query(
      `INSERT INTO puja_events (puja_id, pujari_id, start_time, max_bookings)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [puja_id, pujari_id ?? null, start_time, maxBookings],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id – update puja event fields */
pujaEventsRouter.patch('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
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
      `UPDATE puja_events SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id/stage – advance event stage with state machine validation */
pujaEventsRouter.patch('/:id/stage', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const eventResult = await pool.query(`SELECT stage, status FROM puja_events WHERE id = $1`, [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }

    const currentStage = eventResult.rows[0].stage as string;
    const transition = STAGE_TRANSITIONS[currentStage];
    if (!transition) {
      return res.status(400).json({ success: false, message: `Cannot advance from stage "${currentStage}"` });
    }

    // Validate required field in body
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

    // Persist the media field
    if (transition.requiredField) {
      sets.push(`${transition.requiredField} = $${idx++}`);
      params.push(req.body[transition.requiredField]);
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE puja_events SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    // If transitioning to INPROGRESS or COMPLETED, update related bookings
    if (transition.statusUpdate) {
      const bookingStatus = transition.statusUpdate === 'COMPLETED' ? 'COMPLETED' : 'INPROGRESS';
      await pool.query(
        `UPDATE puja_bookings SET status = $1, updated_at = NOW() WHERE puja_event_id = $2 AND status != 'CANCELLED'`,
        [bookingStatus, id],
      );
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});
