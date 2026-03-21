import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const hampersRouter = Router();

hampersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let query = 'SELECT * FROM hampers WHERE is_active = true';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }

    const countResult = await pool.query(query.replace('SELECT *', 'SELECT COUNT(*)'), params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, total, page, limit, message: 'Hampers fetched' });
  } catch (err) { next(err); }
});

hampersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM hampers WHERE id = $1 AND is_active = true', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Hamper not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Hamper details' });
  } catch (err) { next(err); }
});

hampersRouter.post('/', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, image_url, items, slider_images } = req.body;
    const result = await pool.query(
      `INSERT INTO hampers (name, description, price, image_url, items, slider_images)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description, price, image_url, items || [], slider_images || []]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Hamper created' });
  } catch (err) { next(err); }
});

hampersRouter.patch('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'description', 'price', 'image_url', 'items', 'slider_images'];
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
      `UPDATE hampers SET ${updates.join(', ')} WHERE id = $${idx} AND is_active = true RETURNING *`,
      values
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Hamper not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Hamper updated' });
  } catch (err) { next(err); }
});

hampersRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('UPDATE hampers SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Hamper not found' }); return; }
    res.json({ success: true, message: 'Hamper deleted' });
  } catch (err) { next(err); }
});
