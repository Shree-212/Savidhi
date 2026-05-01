import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { translateToHindi } from '../lib/translate';
import { applyLocale, applyLocaleArray, parseLocale } from '../lib/locale';

export const templesRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

const TEMPLE_TX = ['name', 'address', 'about', 'history_and_significance'] as const;

async function translateAndUpdateTemple(client: { query: typeof pool.query }, id: string, body: Record<string, unknown>) {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const f of TEMPLE_TX) {
    if (body[f] === undefined) continue;
    const hi = await translateToHindi(body[f] as string | null);
    updates.push(`${f}_hi = $${idx}`); values.push(hi); idx++;
  }
  if (updates.length === 0) return;
  values.push(id);
  await client.query(`UPDATE temples SET ${updates.join(', ')} WHERE id = $${idx}`, values);
}

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

    const locale = parseLocale(req.query.locale);
    res.json({
      success: true,
      data: applyLocaleArray(result.rows, locale, [...TEMPLE_TX]),
      total, page, limit,
      message: 'Temples fetched',
    });
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
    const pujas = await pool.query('SELECT id, name, name_hi, price_for_1, schedule_day, schedule_time, slider_images FROM pujas WHERE temple_id = $1 AND is_active = true', [id]);
    const chadhavas = await pool.query('SELECT id, name, name_hi, schedule_day, schedule_time, slider_images FROM chadhavas WHERE temple_id = $1 AND is_active = true', [id]);
    const deities = await pool.query('SELECT d.id, d.name, d.name_hi, d.image_url FROM deities d JOIN temple_deities td ON d.id = td.deity_id WHERE td.temple_id = $1', [id]);

    const locale = parseLocale(req.query.locale);
    res.json({
      success: true,
      data: {
        ...applyLocale(temple.rows[0], locale, [...TEMPLE_TX]),
        pujaris: pujaris.rows,
        pujas_offered: applyLocaleArray(pujas.rows, locale, ['name']),
        chadhavas_offered: applyLocaleArray(chadhavas.rows, locale, ['name']),
        deities: applyLocaleArray(deities.rows, locale, ['name']),
      },
      message: 'Temple details',
    });
  } catch (err) { next(err); }
});

templesRouter.post('/', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { name, slug, address, pincode, google_map_link, about, history_and_significance, sample_video_url, slider_images } = req.body;
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO temples (name, slug, address, pincode, google_map_link, about, history_and_significance, sample_video_url, slider_images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, slug || null, address, pincode, google_map_link, about, history_and_significance, sample_video_url, slider_images || []]
    );
    const created = result.rows[0];
    await translateAndUpdateTemple(client, created.id, req.body).catch((e) =>
      console.error('[temples] translate-on-create failed:', e),
    );
    await client.query('COMMIT');
    const fresh = await pool.query('SELECT * FROM temples WHERE id = $1', [created.id]);
    res.status(201).json({ success: true, data: fresh.rows[0], message: 'Temple created' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
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

    // Re-translate any English fields touched in this PATCH.
    await translateAndUpdateTemple(client, id, req.body).catch((e) =>
      console.error('[temples] translate-on-update failed:', e),
    );

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
    // Block delete if ANY pujari/puja/chadhava references this temple — including
    // soft-deleted ones, since their FK is still live and Postgres will reject
    // the DELETE with code 23503. Counting only `is_active = true` previously
    // let inactive references slip through and surface as a 500 in the UI.
    const [pujariCount, pujaCount, chadhavaCount] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active FROM pujaris  WHERE temple_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active FROM pujas    WHERE temple_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active FROM chadhavas WHERE temple_id = $1', [id]),
    ]);
    const blockers: string[] = [];
    const fmt = (label: string, row: { n: number; active: number }) => {
      const inactive = row.n - row.active;
      const bits: string[] = [];
      if (row.active > 0)  bits.push(`${row.active} active`);
      if (inactive > 0)    bits.push(`${inactive} archived`);
      blockers.push(`${row.n} ${label} (${bits.join(', ')})`);
    };
    if (pujariCount.rows[0].n  > 0) fmt('pujari(s)',   pujariCount.rows[0]);
    if (pujaCount.rows[0].n    > 0) fmt('puja(s)',     pujaCount.rows[0]);
    if (chadhavaCount.rows[0].n > 0) fmt('chadhava(s)', chadhavaCount.rows[0]);
    if (blockers.length > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete temple — still referenced by ${blockers.join(', ')}. Remove or reassign these first.`,
      });
      return;
    }
    // No dependents — hard delete (PDF: temples cannot be disabled, only deleted).
    await pool.query('DELETE FROM temple_deities WHERE temple_id = $1', [id]);
    const result = await pool.query('DELETE FROM temples WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Temple not found' }); return; }
    res.json({ success: true, message: 'Temple deleted' });
  } catch (err) { next(err); }
});
