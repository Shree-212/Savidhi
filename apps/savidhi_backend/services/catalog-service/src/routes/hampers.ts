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
      // PDF item 3a (hampers) — ID, name, content description.
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      query += ` WHERE (id::text ILIKE ${p} OR name ILIKE ${p} OR COALESCE(content_description, '') ILIKE ${p})`;
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
    const { name, content_description, stock_qty, length_cm, breadth_cm, height_cm, weight_kg, declared_value } = req.body;
    const result = await pool.query(
      `INSERT INTO hampers (name, content_description, stock_qty,
                            length_cm, breadth_cm, height_cm, weight_kg, declared_value)
       VALUES ($1,$2,$3, COALESCE($4, 20), COALESCE($5, 15), COALESCE($6, 10),
               COALESCE($7, 0.5), COALESCE($8, 100)) RETURNING *`,
      [
        name, content_description || '', stock_qty || 0,
        length_cm ?? null, breadth_cm ?? null, height_cm ?? null,
        weight_kg ?? null, declared_value ?? null,
      ],
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Hamper created' });
  } catch (err) { next(err); }
});

hampersRouter.patch('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'content_description', 'stock_qty', 'length_cm', 'breadth_cm', 'height_cm', 'weight_kg', 'declared_value'];
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
  const force = req.query.force === 'true';
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const [pujaUse, chadhavaUse] = await Promise.all([
      client.query(
        `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active
           FROM pujas WHERE hamper_id = $1`,
        [id],
      ),
      client.query(
        `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active
           FROM chadhavas WHERE hamper_id = $1`,
        [id],
      ),
    ]);

    const activeBlockers: string[] = [];
    if (pujaUse.rows[0].active     > 0) activeBlockers.push(`${pujaUse.rows[0].active} active puja(s)`);
    if (chadhavaUse.rows[0].active > 0) activeBlockers.push(`${chadhavaUse.rows[0].active} active chadhava(s)`);
    if (activeBlockers.length > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete hamper — still referenced by ${activeBlockers.join(', ')}. Disable or reassign these first.`,
        canForce: false,
      });
      return;
    }

    const archivedPujas     = pujaUse.rows[0].n;
    const archivedChadhavas = chadhavaUse.rows[0].n;
    if (!force && archivedPujas + archivedChadhavas > 0) {
      const archivedBlockers: string[] = [];
      if (archivedPujas     > 0) archivedBlockers.push(`${archivedPujas} archived puja(s)`);
      if (archivedChadhavas > 0) archivedBlockers.push(`${archivedChadhavas} archived chadhava(s)`);
      res.status(409).json({
        success: false,
        message: `Cannot delete hamper — referenced by ${archivedBlockers.join(', ')}. Pass force=true to null these references and proceed.`,
        canForce: true,
      });
      return;
    }

    await client.query('BEGIN');
    // hamper_id and send_hamper are both nullable/optional — null them on archived rows
    // to preserve the puja/chadhava history while breaking the FK link.
    if (archivedPujas > 0) {
      await client.query(`UPDATE pujas SET hamper_id = NULL, send_hamper = false WHERE hamper_id = $1`, [id]);
    }
    if (archivedChadhavas > 0) {
      await client.query(`UPDATE chadhavas SET hamper_id = NULL, send_hamper = false WHERE hamper_id = $1`, [id]);
    }
    const result = await client.query('DELETE FROM hampers WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Hamper not found' });
      return;
    }
    await client.query('COMMIT');
    const cleanedBits: string[] = [];
    if (archivedPujas > 0)     cleanedBits.push(`${archivedPujas} archived puja(s)`);
    if (archivedChadhavas > 0) cleanedBits.push(`${archivedChadhavas} archived chadhava(s)`);
    res.json({
      success: true,
      message: cleanedBits.length > 0
        ? `Hamper deleted (cleared link from ${cleanedBits.join(', ')})`
        : 'Hamper deleted',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});
