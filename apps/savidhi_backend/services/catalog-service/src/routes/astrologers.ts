import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const astrologersRouter = Router();

astrologersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let query = 'SELECT * FROM astrologers WHERE is_active = true';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }

    const countResult = await pool.query(query.replace('SELECT *', 'SELECT COUNT(*)'), params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY rating DESC NULLS LAST, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, total, page, limit, message: 'Astrologers fetched' });
  } catch (err) { next(err); }
});

astrologersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM astrologers WHERE id = $1 AND is_active = true', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Astrologer not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Astrologer details' });
  } catch (err) { next(err); }
});

astrologersRouter.post('/', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, phone, profile_pic, specializations, experience_years,
      per_minute_price, description, languages,
      bank_account_no, bank_ifsc, bank_name, upi_id, commission_percent,
      off_days
    } = req.body;

    const result = await pool.query(
      `INSERT INTO astrologers (name, phone, profile_pic, specializations, experience_years,
        per_minute_price, description, languages,
        bank_account_no, bank_ifsc, bank_name, upi_id, commission_percent, off_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [name, phone, profile_pic, specializations || [], experience_years,
        per_minute_price, description, languages || [],
        bank_account_no, bank_ifsc, bank_name, upi_id, commission_percent || 0,
        off_days || []]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Astrologer created' });
  } catch (err) { next(err); }
});

astrologersRouter.patch('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const fields = [
      'name', 'phone', 'profile_pic', 'specializations', 'experience_years',
      'per_minute_price', 'description', 'languages',
      'bank_account_no', 'bank_ifsc', 'bank_name', 'upi_id', 'commission_percent',
      'rating'
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        values.push(req.body[field]);
        idx++;
      }
    }

    if (updates.length === 0) { res.status(400).json({ success: false, message: 'No fields to update' }); return; }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE astrologers SET ${updates.join(', ')} WHERE id = $${idx} AND is_active = true RETURNING *`,
      values
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Astrologer not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Astrologer updated' });
  } catch (err) { next(err); }
});

astrologersRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('UPDATE astrologers SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Astrologer not found' }); return; }
    res.json({ success: true, message: 'Astrologer deleted' });
  } catch (err) { next(err); }
});

/**
 * GET /:id/ledger — ledger entries for an astrologer with settlement totals.
 * Uses the canonical `ledger_entries` table (party_type='ASTROLOGER').
 */
astrologersRouter.get('/:id/ledger', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const astrologer = await pool.query('SELECT id, name, unsettled_amount FROM astrologers WHERE id = $1', [id]);
    if (astrologer.rows.length === 0) { res.status(404).json({ success: false, message: 'Astrologer not found' }); return; }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ledger_entries WHERE party_type = 'ASTROLOGER' AND party_id = $1`,
      [id],
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT le.*,
              COALESCE(a.scheduled_at, a.created_at) AS event_time,
              d.name AS devotee_name,
              a.duration AS appointment_duration
       FROM ledger_entries le
       LEFT JOIN appointments a ON a.id = le.event_id AND le.event_type = 'APPOINTMENT'
       LEFT JOIN devotees d ON d.id = a.devotee_id
       WHERE le.party_type = 'ASTROLOGER' AND le.party_id = $1
       ORDER BY le.created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset],
    );

    const totals = await pool.query(
      `SELECT
         COALESCE(SUM(fee) FILTER (WHERE settled = false), 0) AS unsettled,
         COALESCE(SUM(fee) FILTER (WHERE settled = true), 0) AS settled,
         COALESCE(SUM(fee), 0) AS total_earned
       FROM ledger_entries WHERE party_type = 'ASTROLOGER' AND party_id = $1`,
      [id],
    );

    res.json({
      success: true,
      data: {
        astrologer: astrologer.rows[0],
        entries: result.rows,
        unsettled: parseFloat(totals.rows[0].unsettled),
        settled: parseFloat(totals.rows[0].settled),
        total_earned: parseFloat(totals.rows[0].total_earned),
      },
      total, page, limit,
      message: 'Astrologer ledger',
    });
  } catch (err) { next(err); }
});

/** POST /:id/ledger/settle — mark all unsettled rows as settled (admin action). */
astrologersRouter.post('/:id/ledger/settle', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE ledger_entries SET settled = true, settled_at = NOW()
       WHERE party_type = 'ASTROLOGER' AND party_id = $1 AND settled = false
       RETURNING id, fee`,
      [id],
    );
    const amount = updated.rows.reduce((s, r) => s + Number(r.fee), 0);
    await client.query(`UPDATE astrologers SET unsettled_amount = 0, updated_at = NOW() WHERE id = $1`, [id]);
    await client.query('COMMIT');
    res.json({ success: true, data: { settled_count: updated.rows.length, amount }, message: 'Ledger settled' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─── Blackout Dates ──────────────────────────────────────────────────────────

astrologersRouter.get('/:id/blackouts', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT blackout_date, reason, created_at FROM astrologer_blackout_dates
       WHERE astrologer_id = $1 AND blackout_date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY blackout_date`,
      [id],
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

astrologersRouter.post('/:id/blackouts', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { dates, reason } = req.body ?? {};
    if (!Array.isArray(dates) || dates.length === 0) {
      res.status(400).json({ success: false, message: 'dates must be a non-empty array of YYYY-MM-DD' });
      return;
    }
    const values: string[] = [];
    const params: unknown[] = [id];
    dates.forEach((d: string) => {
      params.push(d, reason ?? null);
      values.push(`($1, $${params.length - 1}, $${params.length})`);
    });
    const { rows } = await pool.query(
      `INSERT INTO astrologer_blackout_dates (astrologer_id, blackout_date, reason)
       VALUES ${values.join(', ')}
       ON CONFLICT (astrologer_id, blackout_date) DO UPDATE SET reason = EXCLUDED.reason
       RETURNING *`,
      params,
    );
    res.status(201).json({ success: true, data: rows });
  } catch (err) { next(err); }
});

astrologersRouter.delete('/:id/blackouts/:date', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, date } = req.params;
    const { rowCount } = await pool.query(
      `DELETE FROM astrologer_blackout_dates WHERE astrologer_id = $1 AND blackout_date = $2`,
      [id, date],
    );
    if (!rowCount) { res.status(404).json({ success: false, message: 'Blackout not found' }); return; }
    res.json({ success: true });
  } catch (err) { next(err); }
});

astrologersRouter.patch('/:id/off-days', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { off_days } = req.body;

    if (!Array.isArray(off_days)) {
      res.status(400).json({ success: false, message: 'off_days must be an array' });
      return;
    }

    const result = await pool.query(
      `UPDATE astrologers SET off_days = $1, updated_at = NOW() WHERE id = $2 AND is_active = true RETURNING *`,
      [off_days, id]
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Astrologer not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Off days updated' });
  } catch (err) { next(err); }
});
