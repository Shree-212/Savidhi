import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const templesRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

templesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let query = 'SELECT * FROM temples WHERE 1=1';
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

    // Add pujaris count and pujas count
    for (const temple of result.rows) {
      const pujariCount = await pool.query('SELECT COUNT(*) FROM pujaris WHERE temple_id = $1 AND is_active = true', [temple.id]);
      const pujaCount = await pool.query('SELECT COUNT(*) FROM pujas WHERE temple_id = $1 AND is_active = true', [temple.id]);
      temple.pujaris_count = parseInt(pujariCount.rows[0].count);
      temple.pujas_count = parseInt(pujaCount.rows[0].count);
    }

    res.json({ success: true, data: result.rows, total, page, limit, message: 'Temples fetched' });
  } catch (err) { next(err); }
});

templesRouter.get('/:identifier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.params;
    const where = isUuid(identifier) ? 'id = $1' : 'slug = $1';
    const temple = await pool.query(`SELECT * FROM temples WHERE ${where}`, [identifier]);
    if (temple.rows.length === 0) { res.status(404).json({ success: false, message: 'Temple not found' }); return; }
    const id = temple.rows[0].id;

    const pujaris = await pool.query('SELECT id, name, designation, profile_pic, rating FROM pujaris WHERE temple_id = $1 AND is_active = true', [id]);
    const pujas = await pool.query('SELECT id, name, price_for_1, schedule_day, schedule_time, slider_images FROM pujas WHERE temple_id = $1 AND is_active = true', [id]);
    const chadhavas = await pool.query('SELECT id, name, schedule_day, schedule_time, slider_images FROM chadhavas WHERE temple_id = $1 AND is_active = true', [id]);
    const deities = await pool.query('SELECT d.id, d.name, d.image_url FROM deities d JOIN temple_deities td ON d.id = td.deity_id WHERE td.temple_id = $1', [id]);

    res.json({
      success: true,
      data: { ...temple.rows[0], pujaris: pujaris.rows, pujas_offered: pujas.rows, chadhavas_offered: chadhavas.rows, deities: deities.rows },
      message: 'Temple details',
    });
  } catch (err) { next(err); }
});

templesRouter.post('/', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, address, pincode, google_map_link, about, history_and_significance, sample_video_url, slider_images } = req.body;
    const result = await pool.query(
      `INSERT INTO temples (name, slug, address, pincode, google_map_link, about, history_and_significance, sample_video_url, slider_images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, slug || null, address, pincode, google_map_link, about, history_and_significance, sample_video_url, slider_images || []]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Temple created' });
  } catch (err) { next(err); }
});

templesRouter.patch('/:id', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    // post-edit + raw media + audit fields (all optional on PATCH)
    const fields = [
      'name', 'slug', 'address', 'pincode', 'google_map_link', 'about', 'history_and_significance',
      'sample_video_url', 'slider_images',
      'sample_video_url_raw', 'slider_images_raw', 'raw_media_audit_note',
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

    await client.query('BEGIN');

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(id);
      const result = await client.query(
        `UPDATE temples SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values,
      );
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Temple not found' });
        return;
      }
    }

    // Sync temple<->deity many-to-many if deity_ids is provided
    if (Array.isArray(req.body.deity_ids)) {
      await client.query(`DELETE FROM temple_deities WHERE temple_id = $1`, [id]);
      for (const deityId of req.body.deity_ids) {
        await client.query(
          `INSERT INTO temple_deities (temple_id, deity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, deityId],
        );
      }
    }

    const finalResult = await client.query(`SELECT * FROM temples WHERE id = $1`, [id]);
    await client.query('COMMIT');

    res.json({ success: true, data: finalResult.rows[0], message: 'Temple updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

templesRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // PDF page 19: temple cannot be deleted while active dependencies exist.
    const pujariCount = await pool.query('SELECT COUNT(*)::int AS n FROM pujaris WHERE temple_id = $1 AND is_active = true', [id]);
    if (pujariCount.rows[0].n > 0) {
      res.status(409).json({ success: false, message: 'Temple has active pujaris; deactivate them first' });
      return;
    }
    const pujaCount = await pool.query('SELECT COUNT(*)::int AS n FROM pujas WHERE temple_id = $1 AND is_active = true', [id]);
    if (pujaCount.rows[0].n > 0) {
      res.status(409).json({ success: false, message: 'Temple has active pujas; deactivate them first' });
      return;
    }
    const chadhavaCount = await pool.query('SELECT COUNT(*)::int AS n FROM chadhavas WHERE temple_id = $1 AND is_active = true', [id]);
    if (chadhavaCount.rows[0].n > 0) {
      res.status(409).json({ success: false, message: 'Temple has active chadhavas; deactivate them first' });
      return;
    }
    // No dependents — hard delete (PDF: temples cannot be disabled, only deleted).
    await pool.query('DELETE FROM temple_deities WHERE temple_id = $1', [id]);
    const result = await pool.query('DELETE FROM temples WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Temple not found' }); return; }
    res.json({ success: true, message: 'Temple deleted' });
  } catch (err) { next(err); }
});
