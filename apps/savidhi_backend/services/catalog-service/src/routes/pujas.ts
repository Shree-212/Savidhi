import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const pujasRouter = Router();

pujasRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const templeId = req.query.temple_id as string;

    let query = 'SELECT p.*, t.name AS temple_name FROM pujas p LEFT JOIN temples t ON p.temple_id = t.id WHERE p.is_active = true';
    const params: any[] = [];

    if (templeId) {
      params.push(templeId);
      query += ` AND p.temple_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND p.name ILIKE $${params.length}`;
    }

    const countQuery = query.replace('SELECT p.*, t.name AS temple_name', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, total, page, limit, message: 'Pujas fetched' });
  } catch (err) { next(err); }
});

pujasRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, t.name AS temple_name, d.name AS deity_name
       FROM pujas p
       LEFT JOIN temples t ON p.temple_id = t.id
       LEFT JOIN deities d ON p.deity_id = d.id
       WHERE p.id = $1 AND p.is_active = true`,
      [id]
    );
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Puja not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Puja details' });
  } catch (err) { next(err); }
});

pujasRouter.post('/', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, temple_id, deity_id, description, price_for_1, price_for_2,
      schedule_day, schedule_time, duration_minutes, sample_video_url,
      slider_images, benefits, items_used, how_will_it_happen
    } = req.body;

    const result = await pool.query(
      `INSERT INTO pujas (name, temple_id, deity_id, description, price_for_1, price_for_2,
        schedule_day, schedule_time, duration_minutes, sample_video_url,
        slider_images, benefits, items_used, how_will_it_happen)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [name, temple_id, deity_id, description, price_for_1, price_for_2,
        schedule_day, schedule_time, duration_minutes, sample_video_url,
        slider_images || [], benefits || [], items_used || [], how_will_it_happen]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Puja created' });
  } catch (err) { next(err); }
});

pujasRouter.patch('/:id', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const fields = [
      'name', 'temple_id', 'deity_id', 'description', 'price_for_1', 'price_for_2',
      'schedule_day', 'schedule_time', 'duration_minutes', 'sample_video_url',
      'slider_images', 'benefits', 'items_used', 'how_will_it_happen'
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
      `UPDATE pujas SET ${updates.join(', ')} WHERE id = $${idx} AND is_active = true RETURNING *`,
      values
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Puja not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Puja updated' });
  } catch (err) { next(err); }
});

pujasRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('UPDATE pujas SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Puja not found' }); return; }
    res.json({ success: true, message: 'Puja deleted' });
  } catch (err) { next(err); }
});
