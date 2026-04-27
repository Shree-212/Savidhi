import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const pujarisRouter = Router();

pujarisRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const templeId = req.query.temple_id as string;

    let query = 'SELECT p.*, t.name AS temple_name FROM pujaris p LEFT JOIN temples t ON p.temple_id = t.id WHERE p.is_active = true';
    const params: any[] = [];

    if (templeId) {
      params.push(templeId);
      query += ` AND p.temple_id = $${params.length}`;
    }

    const countQuery = query.replace('SELECT p.*, t.name AS temple_name', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, total, page, limit, message: 'Pujaris fetched' });
  } catch (err) { next(err); }
});

pujarisRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT p.*, t.name AS temple_name
       FROM pujaris p LEFT JOIN temples t ON p.temple_id = t.id
       WHERE p.id = $1 AND p.is_active = true`,
      [req.params.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Pujari not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Pujari details' });
  } catch (err) { next(err); }
});

pujarisRouter.post('/', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, phone, designation, profile_pic, temple_id,
      bank_account_no, bank_ifsc, bank_name, upi_id, commission_percent
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pujaris (name, phone, designation, profile_pic, temple_id,
        bank_account_no, bank_ifsc, bank_name, upi_id, commission_percent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, phone, designation, profile_pic, temple_id,
        bank_account_no, bank_ifsc, bank_name, upi_id, commission_percent || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Pujari created' });
  } catch (err) { next(err); }
});

pujarisRouter.patch('/:id', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const fields = [
      'name', 'phone', 'designation', 'profile_pic', 'temple_id',
      'bank_account_no', 'bank_ifsc', 'bank_name', 'upi_id', 'commission_percent', 'rating'
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
      `UPDATE pujaris SET ${updates.join(', ')} WHERE id = $${idx} AND is_active = true RETURNING *`,
      values
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Pujari not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Pujari updated' });
  } catch (err) { next(err); }
});

pujarisRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const inUse = await pool.query(
      `SELECT COUNT(*)::int AS n FROM pujas WHERE default_pujari_id = $1 AND is_active = true`,
      [id],
    );
    if (inUse.rows[0].n > 0) {
      res.status(409).json({ success: false, message: 'Pujari is the default for active pujas; reassign them first' });
      return;
    }
    const result = await pool.query('UPDATE pujaris SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Pujari not found' }); return; }
    res.json({ success: true, message: 'Pujari deleted' });
  } catch (err) { next(err); }
});

/**
 * GET /:id/ledger — pujari earnings ledger using canonical `ledger_entries`.
 */
pujarisRouter.get('/:id/ledger', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const pujari = await pool.query('SELECT id, name, unsettled_amount FROM pujaris WHERE id = $1', [id]);
    if (pujari.rows.length === 0) { res.status(404).json({ success: false, message: 'Pujari not found' }); return; }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM ledger_entries WHERE party_type = 'PUJARI' AND party_id = $1`,
      [id],
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT le.*,
              COALESCE(pe.start_time, ce.start_time) AS event_time,
              COALESCE(p.name, c.name) AS event_name,
              CASE le.event_type
                WHEN 'PUJA' THEN t1.name
                WHEN 'CHADHAVA' THEN t2.name
                ELSE NULL
              END AS temple_name
       FROM ledger_entries le
       LEFT JOIN puja_events pe     ON pe.id = le.event_id AND le.event_type = 'PUJA'
       LEFT JOIN pujas p            ON p.id  = pe.puja_id
       LEFT JOIN temples t1         ON t1.id = p.temple_id
       LEFT JOIN chadhava_events ce ON ce.id = le.event_id AND le.event_type = 'CHADHAVA'
       LEFT JOIN chadhavas c        ON c.id  = ce.chadhava_id
       LEFT JOIN temples t2         ON t2.id = c.temple_id
       WHERE le.party_type = 'PUJARI' AND le.party_id = $1
       ORDER BY le.created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset],
    );

    const totals = await pool.query(
      `SELECT
         COALESCE(SUM(fee) FILTER (WHERE settled = false), 0) AS unsettled,
         COALESCE(SUM(fee) FILTER (WHERE settled = true), 0) AS settled,
         COALESCE(SUM(fee), 0) AS total_earned
       FROM ledger_entries WHERE party_type = 'PUJARI' AND party_id = $1`,
      [id],
    );

    res.json({
      success: true,
      data: {
        pujari: pujari.rows[0],
        entries: result.rows,
        unsettled: parseFloat(totals.rows[0].unsettled),
        settled: parseFloat(totals.rows[0].settled),
        total_earned: parseFloat(totals.rows[0].total_earned),
      },
      total, page, limit,
      message: 'Pujari ledger',
    });
  } catch (err) { next(err); }
});

/** POST /:id/ledger/settle — mark unsettled rows as paid. */
pujarisRouter.post('/:id/ledger/settle', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE ledger_entries SET settled = true, settled_at = NOW()
       WHERE party_type = 'PUJARI' AND party_id = $1 AND settled = false
       RETURNING id, fee`,
      [id],
    );
    const amount = updated.rows.reduce((s, r) => s + Number(r.fee), 0);
    await client.query(`UPDATE pujaris SET unsettled_amount = 0, updated_at = NOW() WHERE id = $1`, [id]);
    await client.query('COMMIT');
    res.json({ success: true, data: { settled_count: updated.rows.length, amount }, message: 'Ledger settled' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});
