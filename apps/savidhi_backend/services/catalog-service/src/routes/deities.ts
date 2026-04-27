import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const deitiesRouter = Router();

deitiesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM deities ORDER BY name');
    res.json({ success: true, data: result.rows, message: 'Deities fetched' });
  } catch (err) { next(err); }
});

deitiesRouter.post('/', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, image_url } = req.body;
    const result = await pool.query('INSERT INTO deities (name, image_url) VALUES ($1, $2) RETURNING *', [name, image_url]);
    res.status(201).json({ success: true, data: result.rows[0], message: 'Deity created' });
  } catch (err) { next(err); }
});

deitiesRouter.patch('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, image_url } = req.body;
    const result = await pool.query('UPDATE deities SET name = COALESCE($1, name), image_url = COALESCE($2, image_url), updated_at = NOW() WHERE id = $3 RETURNING *', [name, image_url, req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Deity not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Deity updated' });
  } catch (err) { next(err); }
});

deitiesRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const pujaUse = await pool.query(
      `SELECT COUNT(*)::int AS n FROM pujas WHERE deity_id = $1 AND is_active = true`,
      [id],
    );
    if (pujaUse.rows[0].n > 0) {
      res.status(409).json({ success: false, message: 'Deity is referenced by active pujas; deactivate them first' });
      return;
    }
    await pool.query('DELETE FROM temple_deities WHERE deity_id = $1', [id]);
    const result = await pool.query('DELETE FROM deities WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Deity not found' }); return; }
    res.json({ success: true, message: 'Deity deleted' });
  } catch (err) { next(err); }
});
