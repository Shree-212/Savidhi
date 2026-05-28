import { Router, Request, Response, NextFunction } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const appointmentsRouter = Router();

export type AppointmentBookingPayload = {
  astrologer_id: string;
  duration: string;
  scheduled_at: string;
  devotee_name?: string | null;
  devotee_gotra?: string | null;
  idempotency_key?: string | null;
};

export class AppointmentBookingError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const VALID_DURATIONS = ['15min', '30min', '1hour', '2hour'] as const;
const DURATION_PRICE_COL: Record<string, string> = {
  '15min': 'price_15min',
  '30min': 'price_30min',
  '1hour': 'price_1hour',
  '2hour': 'price_2hour',
};

/** Core appointment creation. Same contract as createPujaBookingTx. */
export async function createAppointmentTx(
  client: PoolClient,
  body: AppointmentBookingPayload,
  userId: string,
): Promise<any> {
  const { astrologer_id, duration, scheduled_at, devotee_name, devotee_gotra, idempotency_key } = body;

  if (!astrologer_id || !duration || !scheduled_at) {
    throw new AppointmentBookingError(400, 'astrologer_id, duration, and scheduled_at are required');
  }
  if (!VALID_DURATIONS.includes(duration as any)) {
    throw new AppointmentBookingError(400, `duration must be one of: ${VALID_DURATIONS.join(', ')}`);
  }

  // Appointments don't currently store idempotency_key in their own column, but
  // the materializer needs deterministic replay. Detect duplicates via
  // (devotee_id, astrologer_id, scheduled_at) tuple — same scheduled slot for
  // the same devotee with the same astrologer is treated as a replay.
  if (idempotency_key) {
    const existing = await client.query(
      `SELECT * FROM appointments
        WHERE devotee_id = $1 AND astrologer_id = $2 AND scheduled_at = $3
          AND status != 'CANCELLED'
        ORDER BY created_at DESC LIMIT 1`,
      [userId, astrologer_id, scheduled_at],
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      (row as any).idempotent_replay = true;
      return row;
    }
  }

  const astResult = await client.query(
    `SELECT price_15min, price_30min, price_1hour, price_2hour FROM astrologers WHERE id = $1 AND is_active = true`,
    [astrologer_id],
  );
  if (astResult.rows.length === 0) {
    throw new AppointmentBookingError(404, 'Astrologer not found or inactive');
  }

  const cost = Number(astResult.rows[0][DURATION_PRICE_COL[duration]]);
  if (!Number.isFinite(cost) || cost <= 0) {
    throw new AppointmentBookingError(400, `Astrologer has no valid price configured for ${duration}. Please contact support.`);
  }

  const { rows } = await client.query(
    `INSERT INTO appointments (astrologer_id, devotee_id, duration, scheduled_at, cost, devotee_name, devotee_gotra)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [astrologer_id, userId, duration, scheduled_at, cost, devotee_name ?? null, devotee_gotra ?? null],
  );

  console.log('[appointments.create]', { id: rows[0].id, astrologer_id, devotee_id: userId, duration, cost });
  return rows[0];
}

/** GET / – list appointments. Admin sees all; Devotee sees own. */
appointmentsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { status, astrologer_id, from_date, to_date, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (role === 'DEVOTEE') {
      conditions.push(`a.devotee_id = $${idx++}`);
      params.push(userId);
      conditions.push(`a.payment_status = 'PAID'`);
    }

    if (status) { conditions.push(`a.status = $${idx++}`); params.push(status); }
    if (astrologer_id) { conditions.push(`a.astrologer_id = $${idx++}`); params.push(astrologer_id); }
    if (from_date) { conditions.push(`a.scheduled_at >= $${idx++}`); params.push(from_date); }
    // INCLUSIVE to_date — see reports.ts dateRangeParams for rationale.
    if (to_date) { conditions.push(`a.scheduled_at < ($${idx++}::date + INTERVAL '1 day')`); params.push(to_date); }
    // Search across appointment ID + astrologer name (PDF item 3a — appointments page).
    if (typeof search === 'string' && search.trim()) {
      const p = `$${idx++}`;
      conditions.push(`(a.id::text ILIKE ${p} OR ast.name ILIKE ${p})`);
      params.push(`%${search.trim()}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM appointments a
         JOIN astrologers ast ON ast.id = a.astrologer_id
       ${where}`,
      params,
    );
    const total = Number(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT a.*,
              ast.name AS astrologer_name,
              ast.designation AS astrologer_designation,
              d.name AS devotee_display_name,
              d.phone AS devotee_phone
       FROM appointments a
       JOIN astrologers ast ON ast.id = a.astrologer_id
       JOIN devotees d      ON d.id  = a.devotee_id
       ${where}
       ORDER BY a.scheduled_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limitNum, offset],
    );

    res.json({ success: true, data: rows, meta: { total, page: pageNum, limit: limitNum } });
  } catch (err) { next(err); }
});

/** GET /:id – appointment detail */
appointmentsRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;

    const { rows } = await pool.query(
      `SELECT a.*,
              ast.name AS astrologer_name,
              ast.designation AS astrologer_designation,
              ast.profile_pic AS astrologer_pic,
              d.name AS devotee_display_name,
              d.phone AS devotee_phone
       FROM appointments a
       JOIN astrologers ast ON ast.id = a.astrologer_id
       JOIN devotees d      ON d.id  = a.devotee_id
       WHERE a.id = $1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const appointment = rows[0];
    if (role === 'DEVOTEE' && appointment.devotee_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: appointment });
  } catch (err) { next(err); }
});

/** POST / – book appointment */
appointmentsRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const userId = req.headers['x-user-id'] as string;
    await client.query('BEGIN');
    const row = await createAppointmentTx(client, req.body, userId);
    await client.query('COMMIT');
    const status = (row as any).idempotent_replay ? 200 : 201;
    res.status(status).json({ success: true, data: row, ...(row as any).idempotent_replay ? { idempotent_replay: true } : {} });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof AppointmentBookingError) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  } finally {
    client.release();
  }
});

/** PATCH /:id/generate-link – generate meet link (admin) */
appointmentsRouter.patch('/:id/generate-link', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const check = await pool.query(`SELECT status FROM appointments WHERE id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    if (check.rows[0].status !== 'LINK_YET_TO_BE_GENERATED') {
      return res.status(400).json({ success: false, message: 'Meet link has already been generated or appointment is not in valid state' });
    }

    // Placeholder meet link
    const meetLink = `https://meet.savidhi.in/${id}`;

    const { rows } = await pool.query(
      `UPDATE appointments SET meet_link = $1, status = 'INPROGRESS', updated_at = NOW() WHERE id = $2 RETURNING *`,
      [meetLink, id],
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id/complete – mark appointment complete (admin) */
appointmentsRouter.patch('/:id/complete', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const check = await pool.query(`SELECT status FROM appointments WHERE id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    if (check.rows[0].status === 'COMPLETED' || check.rows[0].status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: `Cannot complete appointment with status "${check.rows[0].status}"` });
    }

    const { rows } = await pool.query(
      `UPDATE appointments SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id/cancel – cancel appointment */
appointmentsRouter.patch('/:id/cancel', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;

    const check = await pool.query(`SELECT devotee_id, status FROM appointments WHERE id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    if (role === 'DEVOTEE' && check.rows[0].devotee_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (check.rows[0].status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
    }
    if (check.rows[0].status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed appointment' });
    }

    const { rows } = await pool.query(
      `UPDATE appointments SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id – reschedule / reassign an appointment (admin only).
 *  Allowed fields: scheduled_at, astrologer_id, duration_minutes. */
appointmentsRouter.patch('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const allowed = ['scheduled_at', 'astrologer_id', 'duration_minutes'];
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
      `UPDATE appointments SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});
