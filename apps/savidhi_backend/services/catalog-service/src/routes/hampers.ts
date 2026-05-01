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

    let query = 'SELECT * FROM hampers';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` WHERE name ILIKE $${params.length}`;
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
    const result = await pool.query('SELECT * FROM hampers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Hamper not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Hamper details' });
  } catch (err) { next(err); }
});

hampersRouter.post('/', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, content_description, stock_qty } = req.body;
    const result = await pool.query(
      `INSERT INTO hampers (name, content_description, stock_qty) VALUES ($1,$2,$3) RETURNING *`,
      [name, content_description || '', stock_qty || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Hamper created' });
  } catch (err) { next(err); }
});

hampersRouter.patch('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'content_description', 'stock_qty'];
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
      `UPDATE hampers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Hamper not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Hamper updated' });
  } catch (err) { next(err); }
});

hampersRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // Any puja/chadhava (active OR soft-deleted, send_hamper or not) holding
    // hamper_id holds the FK; ignoring them caused the hard-delete to surface
    // a Postgres FK violation as a 500.
    const [pujaUse, chadhavaUse] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active
           FROM pujas WHERE hamper_id = $1`,
        [id],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active
           FROM chadhavas WHERE hamper_id = $1`,
        [id],
      ),
    ]);
    const blockers: string[] = [];
    const fmt = (label: string, row: { n: number; active: number }) => {
      const inactive = row.n - row.active;
      const bits: string[] = [];
      if (row.active > 0)  bits.push(`${row.active} active`);
      if (inactive > 0)    bits.push(`${inactive} archived`);
      blockers.push(`${row.n} ${label} (${bits.join(', ')})`);
    };
    if (pujaUse.rows[0].n     > 0) fmt('puja(s)',     pujaUse.rows[0]);
    if (chadhavaUse.rows[0].n > 0) fmt('chadhava(s)', chadhavaUse.rows[0]);
    if (blockers.length > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete hamper — still referenced by ${blockers.join(', ')}. Remove or reassign these first.`,
      });
      return;
    }
    const result = await pool.query('DELETE FROM hampers WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Hamper not found' }); return; }
    res.json({ success: true, message: 'Hamper deleted' });
  } catch (err) { next(err); }
});
