import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const chadhavasRouter = Router();

/* ── Chadhavas CRUD ── */

chadhavasRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const templeId = req.query.temple_id as string;

    const where = templeId ? 'AND c.temple_id = $1' : '';
    const params: any[] = templeId ? [templeId] : [];

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM chadhavas c WHERE c.is_active = true ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT c.*, t.name AS temple_name, t.address AS temple_address,
              (SELECT MIN(co.price) FROM chadhava_offerings co WHERE co.chadhava_id = c.id) AS min_price
       FROM chadhavas c
       LEFT JOIN temples t ON c.temple_id = t.id
       WHERE c.is_active = true ${where}
       ORDER BY c.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );
    res.json({ success: true, data: result.rows, total, page, limit, message: 'Chadhavas fetched' });
  } catch (err) { next(err); }
});

chadhavasRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const chadhava = await pool.query(
      `SELECT c.*, t.name AS temple_name, t.address AS temple_address
       FROM chadhavas c LEFT JOIN temples t ON c.temple_id = t.id
       WHERE c.id = $1 AND c.is_active = true`,
      [id]
    );
    if (chadhava.rows.length === 0) { res.status(404).json({ success: false, message: 'Chadhava not found' }); return; }

    const offerings = await pool.query(
      'SELECT * FROM chadhava_offerings WHERE chadhava_id = $1 ORDER BY created_at',
      [id]
    );

    res.json({
      success: true,
      data: { ...chadhava.rows[0], offerings: offerings.rows },
      message: 'Chadhava details',
    });
  } catch (err) { next(err); }
});

chadhavasRouter.post('/', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, temple_id, description, schedule_day, schedule_time, sample_video_url, slider_images } = req.body;
    const result = await pool.query(
      `INSERT INTO chadhavas (name, temple_id, description, schedule_day, schedule_time, sample_video_url, slider_images)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, temple_id, description, schedule_day, schedule_time, sample_video_url, slider_images || []]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Chadhava created' });
  } catch (err) { next(err); }
});

chadhavasRouter.patch('/:id', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'temple_id', 'description', 'schedule_day', 'schedule_time', 'sample_video_url', 'slider_images'];
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
      `UPDATE chadhavas SET ${updates.join(', ')} WHERE id = $${idx} AND is_active = true RETURNING *`,
      values
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Chadhava not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Chadhava updated' });
  } catch (err) { next(err); }
});

chadhavasRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('UPDATE chadhavas SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Chadhava not found' }); return; }
    res.json({ success: true, message: 'Chadhava deleted' });
  } catch (err) { next(err); }
});

/* ── Offerings sub-resource ── */

chadhavasRouter.post('/:id/offerings', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chadhavaId = req.params.id;

    // Verify chadhava exists
    const chadhava = await pool.query('SELECT id FROM chadhavas WHERE id = $1 AND is_active = true', [chadhavaId]);
    if (chadhava.rows.length === 0) { res.status(404).json({ success: false, message: 'Chadhava not found' }); return; }

    const { name, price, description, image_url } = req.body;
    const result = await pool.query(
      `INSERT INTO chadhava_offerings (chadhava_id, item_name, price, benefit, images)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [chadhavaId, name, price, description, image_url ? [image_url] : []]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Offering added' });
  } catch (err) { next(err); }
});

chadhavasRouter.patch('/:chadhavaId/offerings/:offeringId', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chadhavaId, offeringId } = req.params;
    const { name, price, description, image_url } = req.body;

    const result = await pool.query(
      `UPDATE chadhava_offerings
       SET item_name = COALESCE($1, item_name), price = COALESCE($2, price),
           benefit = COALESCE($3, benefit), images = COALESCE($4, images)
       WHERE id = $5 AND chadhava_id = $6 RETURNING *`,
      [name, price, description, image_url ? [image_url] : null, offeringId, chadhavaId]
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Offering not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Offering updated' });
  } catch (err) { next(err); }
});

chadhavasRouter.delete('/:chadhavaId/offerings/:offeringId', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chadhavaId, offeringId } = req.params;
    const result = await pool.query(
      'DELETE FROM chadhava_offerings WHERE id = $1 AND chadhava_id = $2 RETURNING id',
      [offeringId, chadhavaId]
    );
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Offering not found' }); return; }
    res.json({ success: true, message: 'Offering deleted' });
  } catch (err) { next(err); }
});
