import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { applyLocale, applyLocaleArray, parseLocale } from '../lib/locale';
import { scheduleBackfill, writeBothSiblings } from '../lib/lazyTranslate';

export const templesRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

const TEMPLE_TX = ['name', 'address', 'about', 'history_and_significance'] as const;
const TEMPLE_TX_CONFIG = { scalars: TEMPLE_TX, arrays: [] as const };

async function translateAndUpdateTemple(_client: unknown, id: string, body: Record<string, unknown>) {
  await writeBothSiblings('temples', id, body, TEMPLE_TX_CONFIG);
}

templesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let query = 'SELECT * FROM temples WHERE 1=1';
    const params: any[] = [];

    if (req.query.include_inactive !== 'true') {
      query += ' AND is_active = true';
    }

    if (search) {
      // PDF item 3a (temples) — ID, temple name, address.
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      query += ` AND (id::text ILIKE ${p} OR name ILIKE ${p} OR COALESCE(address, '') ILIKE ${p})`;
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
    scheduleBackfill('temples', result.rows, TEMPLE_TX_CONFIG);
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
    const activeFilter = req.query.include_inactive === 'true' ? '' : ' AND is_active = true';
    const temple = await pool.query(`SELECT * FROM temples WHERE ${where}${activeFilter}`, [identifier]);
    if (temple.rows.length === 0) { res.status(404).json({ success: false, message: 'Temple not found' }); return; }
    const id = temple.rows[0].id;

    const pujaris = await pool.query('SELECT id, name, name_en, name_hi, designation, designation_en, designation_hi, profile_pic, rating FROM pujaris WHERE temple_id = $1 AND is_active = true', [id]);
    const pujas = await pool.query('SELECT id, name, name_en, name_hi, price_for_1, schedule_day, schedule_time, slider_images FROM pujas WHERE temple_id = $1 AND is_active = true', [id]);
    const chadhavas = await pool.query('SELECT id, name, name_en, name_hi, schedule_day, schedule_time, slider_images FROM chadhavas WHERE temple_id = $1 AND is_active = true', [id]);
    const deities = await pool.query('SELECT d.id, d.name, d.name_en, d.name_hi, d.image_url FROM deities d JOIN temple_deities td ON d.id = td.deity_id WHERE td.temple_id = $1', [id]);

    const locale = parseLocale(req.query.locale);
    scheduleBackfill('temples', temple.rows, TEMPLE_TX_CONFIG);
    res.json({
      success: true,
      data: {
        ...applyLocale(temple.rows[0], locale, [...TEMPLE_TX]),
        pujaris: applyLocaleArray(pujaris.rows, locale, ['name', 'designation']),
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
    await client.query('COMMIT');
    const fresh = await pool.query('SELECT * FROM temples WHERE id = $1', [created.id]);
    res.status(201).json({ success: true, data: fresh.rows[0], message: 'Temple created' });
    // Translate off the request path (2026-05-29 admin-save-hang incident).
    setImmediate(() => {
      translateAndUpdateTemple(pool, created.id, req.body).catch((e) =>
        console.error('[temples.post] background translate failed:', (e as Error).message),
      );
    });
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
      'is_active',
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
    setImmediate(() => {
      translateAndUpdateTemple(pool, id, req.body).catch((e) =>
        console.error('[temples.patch] background translate failed:', (e as Error).message),
      );
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

templesRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  const force = req.query.force === 'true';
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Active dependents always block, regardless of `force` — these are real,
    // currently-visible records the operator hasn't disabled yet.
    const [pujariCount, pujaCount, chadhavaCount] = await Promise.all([
      client.query('SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active FROM pujaris   WHERE temple_id = $1', [id]),
      client.query('SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active FROM pujas     WHERE temple_id = $1', [id]),
      client.query('SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE is_active) ::int AS active FROM chadhavas WHERE temple_id = $1', [id]),
    ]);
    const activeBlockers: string[] = [];
    if (pujariCount.rows[0].active   > 0) activeBlockers.push(`${pujariCount.rows[0].active} active pujari(s)`);
    if (pujaCount.rows[0].active     > 0) activeBlockers.push(`${pujaCount.rows[0].active} active puja(s)`);
    if (chadhavaCount.rows[0].active > 0) activeBlockers.push(`${chadhavaCount.rows[0].active} active chadhava(s)`);
    if (activeBlockers.length > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete temple — still referenced by ${activeBlockers.join(', ')}. Disable or reassign these first.`,
        canForce: false,
      });
      return;
    }

    // No-force path: count any leftover archived dependents and block with `canForce: true`
    // so the admin UI can offer a second-confirm "force delete" button.
    if (!force) {
      const archivedBlockers: string[] = [];
      if (pujariCount.rows[0].n   > 0) archivedBlockers.push(`${pujariCount.rows[0].n} archived pujari(s)`);
      if (pujaCount.rows[0].n     > 0) archivedBlockers.push(`${pujaCount.rows[0].n} archived puja(s)`);
      if (chadhavaCount.rows[0].n > 0) archivedBlockers.push(`${chadhavaCount.rows[0].n} archived chadhava(s)`);
      if (archivedBlockers.length > 0) {
        res.status(409).json({
          success: false,
          message: `Cannot delete temple — still referenced by ${archivedBlockers.join(', ')}. Pass force=true to hard-clean archived dependents.`,
          canForce: true,
        });
        return;
      }
    }

    // Force path (or nothing-archived path): cascade-clean inside a single tx.
    await client.query('BEGIN');

    // Pujaris are referenced from puja_events, chadhava_events, and pujas via
    // nullable FKs — null them out, then the pujari hard-delete is unblocked.
    if (pujariCount.rows[0].n > 0) {
      await client.query(
        `UPDATE puja_events SET pujari_id = NULL
           WHERE pujari_id IN (SELECT id FROM pujaris WHERE temple_id = $1)`, [id]);
      await client.query(
        `UPDATE chadhava_events SET pujari_id = NULL
           WHERE pujari_id IN (SELECT id FROM pujaris WHERE temple_id = $1)`, [id]);
      await client.query(
        `UPDATE pujas SET default_pujari_id = NULL
           WHERE default_pujari_id IN (SELECT id FROM pujaris WHERE temple_id = $1)`, [id]);
      await client.query(`DELETE FROM pujaris WHERE temple_id = $1`, [id]);
    }

    // Pujas/chadhavas: hard-delete if it doesn't FK-violate. If any still have
    // events (i.e. real booking history), the next DELETE raises 23503 and the
    // tx rolls back — the admin gets a clear message that booking history exists.
    if (pujaCount.rows[0].n > 0) {
      await client.query(`DELETE FROM pujas WHERE temple_id = $1`, [id]);
    }
    if (chadhavaCount.rows[0].n > 0) {
      await client.query(`DELETE FROM chadhavas WHERE temple_id = $1`, [id]);
    }

    await client.query(`DELETE FROM temple_deities WHERE temple_id = $1`, [id]);
    const result = await client.query('DELETE FROM temples WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Temple not found' });
      return;
    }

    await client.query('COMMIT');
    const cleanedBits: string[] = [];
    if (pujariCount.rows[0].n > 0)  cleanedBits.push(`${pujariCount.rows[0].n} pujari(s)`);
    if (pujaCount.rows[0].n > 0)    cleanedBits.push(`${pujaCount.rows[0].n} puja(s)`);
    if (chadhavaCount.rows[0].n > 0) cleanedBits.push(`${chadhavaCount.rows[0].n} chadhava(s)`);
    res.json({
      success: true,
      message: cleanedBits.length > 0
        ? `Temple deleted (force-cleaned ${cleanedBits.join(', ')})`
        : 'Temple deleted',
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => undefined);
    // Translate FK violations during the cascade into a specific message —
    // typically means an archived puja/chadhava still has events with bookings.
    const code = (err as { code?: string }).code;
    if (code === '23503') {
      res.status(409).json({
        success: false,
        message: 'Cannot force-delete temple — archived puja(s) or chadhava(s) still have booking history (events/bookings). Booking history must be preserved; this requires DB-level cleanup.',
        canForce: false,
      });
      return;
    }
    next(err as Error);
  } finally {
    client.release();
  }
});
