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
  const force = req.query.force === 'true';
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const pujaUse = await client.query(
      `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active
         FROM pujas WHERE deity_id = $1`,
      [id],
    );
    const { n, active } = pujaUse.rows[0];

    if (active > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete deity — referenced by ${active} active puja(s). Disable or reassign these first.`,
        canForce: false,
      });
      return;
    }
    if (!force && n > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete deity — referenced by ${n} archived puja(s). Pass force=true to null these references and proceed.`,
        canForce: true,
      });
      return;
    }

    await client.query('BEGIN');
    // pujas.deity_id is nullable — preserve the (archived) puja and just clear the link.
    if (n > 0) {
      await client.query(`UPDATE pujas SET deity_id = NULL WHERE deity_id = $1`, [id]);
    }
    await client.query('DELETE FROM temple_deities WHERE deity_id = $1', [id]);
    const result = await client.query('DELETE FROM deities WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Deity not found' });
      return;
    }
    await client.query('COMMIT');
    res.json({
      success: true,
      message: n > 0 ? `Deity deleted (cleared link from ${n} archived puja(s))` : 'Deity deleted',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});
