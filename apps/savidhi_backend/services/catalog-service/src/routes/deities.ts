import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { translateToHindi } from '../lib/translate';
import { applyLocaleArray, parseLocale } from '../lib/locale';

export const deitiesRouter = Router();

deitiesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM deities ORDER BY name');
    const locale = parseLocale(req.query.locale);
    res.json({
      success: true,
      data: applyLocaleArray(result.rows, locale, ['name']),
      message: 'Deities fetched',
    });
  } catch (err) { next(err); }
});

deitiesRouter.post('/', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, image_url } = req.body;
    const nameHi = await translateToHindi(name).catch(() => null);
    const result = await pool.query(
      'INSERT INTO deities (name, image_url, name_hi) VALUES ($1, $2, $3) RETURNING *',
      [name, image_url, nameHi],
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Deity created' });
  } catch (err) { next(err); }
});

deitiesRouter.patch('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, image_url } = req.body;
    // Re-translate name if it changed.
    let nameHi: string | null | undefined = undefined;
    if (name !== undefined) nameHi = await translateToHindi(name).catch(() => null);
    const result = await pool.query(
      `UPDATE deities
         SET name = COALESCE($1, name),
             image_url = COALESCE($2, image_url),
             name_hi = CASE WHEN $4::boolean THEN $3 ELSE name_hi END,
             updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, image_url, nameHi, name !== undefined, req.params.id],
    );
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Deity not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Deity updated' });
  } catch (err) { next(err); }
});

deitiesRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // Count ALL pujas (active + soft-deleted) that point at this deity — both
    // hold a live FK and would 500 the hard-delete with Postgres code 23503.
    const pujaUse = await pool.query(
      `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active
         FROM pujas WHERE deity_id = $1`,
      [id],
    );
    if (pujaUse.rows[0].n > 0) {
      const { n, active } = pujaUse.rows[0];
      const inactive = n - active;
      const bits: string[] = [];
      if (active > 0)   bits.push(`${active} active`);
      if (inactive > 0) bits.push(`${inactive} archived`);
      res.status(409).json({
        success: false,
        message: `Cannot delete deity — referenced by ${n} puja(s) (${bits.join(', ')}). Remove or reassign these first.`,
      });
      return;
    }
    await pool.query('DELETE FROM temple_deities WHERE deity_id = $1', [id]);
    const result = await pool.query('DELETE FROM deities WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Deity not found' }); return; }
    res.json({ success: true, message: 'Deity deleted' });
  } catch (err) { next(err); }
});
