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
    const result = await pool.query('UPDATE pujaris SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Pujari not found' }); return; }
    res.json({ success: true, message: 'Pujari deleted' });
  } catch (err) { next(err); }
});

pujarisRouter.get('/:id/ledger', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Verify pujari exists
    const pujari = await pool.query('SELECT id, name FROM pujaris WHERE id = $1 AND is_active = true', [id]);
    if (pujari.rows.length === 0) { res.status(404).json({ success: false, message: 'Pujari not found' }); return; }

    const countResult = await pool.query('SELECT COUNT(*) FROM pujari_ledger WHERE pujari_id = $1', [id]);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM pujari_ledger WHERE pujari_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Calculate totals
    const totals = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
        COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits
       FROM pujari_ledger WHERE pujari_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        pujari: pujari.rows[0],
        entries: result.rows,
        total_credits: parseFloat(totals.rows[0].total_credits),
        total_debits: parseFloat(totals.rows[0].total_debits),
        balance: parseFloat(totals.rows[0].total_credits) - parseFloat(totals.rows[0].total_debits),
      },
      total,
      page,
      limit,
      message: 'Pujari ledger',
    });
  } catch (err) { next(err); }
});
