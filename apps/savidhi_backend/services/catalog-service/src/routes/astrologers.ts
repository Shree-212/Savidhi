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

astrologersRouter.get('/:id/ledger', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Verify astrologer exists
    const astrologer = await pool.query('SELECT id, name FROM astrologers WHERE id = $1 AND is_active = true', [id]);
    if (astrologer.rows.length === 0) { res.status(404).json({ success: false, message: 'Astrologer not found' }); return; }

    const countResult = await pool.query('SELECT COUNT(*) FROM astrologer_ledger WHERE astrologer_id = $1', [id]);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM astrologer_ledger WHERE astrologer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Calculate totals
    const totals = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
        COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits
       FROM astrologer_ledger WHERE astrologer_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        astrologer: astrologer.rows[0],
        entries: result.rows,
        total_credits: parseFloat(totals.rows[0].total_credits),
        total_debits: parseFloat(totals.rows[0].total_debits),
        balance: parseFloat(totals.rows[0].total_credits) - parseFloat(totals.rows[0].total_debits),
      },
      total,
      page,
      limit,
      message: 'Astrologer ledger',
    });
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
