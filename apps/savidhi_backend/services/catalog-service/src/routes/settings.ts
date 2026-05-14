import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const settingsRouter = Router();

settingsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query('SELECT * FROM app_settings WHERE id = 1');
    if (result.rows.length === 0) {
      res.json({ success: true, data: null, message: 'Settings not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0], message: 'Settings fetched' });
  } catch (err) { next(err); }
});

settingsRouter.patch('/', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { home_puja_slider_ids, whatsapp_support_number, call_support_number, home_banners } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (home_puja_slider_ids !== undefined) {
      fields.push(`home_puja_slider_ids = $${idx++}`);
      values.push(home_puja_slider_ids);
    }
    if (whatsapp_support_number !== undefined) {
      fields.push(`whatsapp_support_number = $${idx++}`);
      values.push(whatsapp_support_number);
    }
    if (call_support_number !== undefined) {
      fields.push(`call_support_number = $${idx++}`);
      values.push(call_support_number);
    }
    if (home_banners !== undefined) {
      if (!Array.isArray(home_banners)) {
        res.status(400).json({ success: false, message: 'home_banners must be an array' });
        return;
      }
      // Lightweight validation — refuse anything missing the three required
      // fields so the homepage carousel never gets handed a half-built banner.
      for (const b of home_banners) {
        if (!b || typeof b !== 'object' || typeof b.image_url !== 'string' || !b.image_url ||
            (b.target_type !== 'puja' && b.target_type !== 'chadhava') ||
            typeof b.target_id !== 'string' || !b.target_id) {
          res.status(400).json({
            success: false,
            message: 'Each banner needs image_url, target_type ("puja"|"chadhava"), and target_id',
          });
          return;
        }
      }
      fields.push(`home_banners = $${idx++}`);
      values.push(JSON.stringify(home_banners));
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, message: 'No fields to update' });
      return;
    }

    fields.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE app_settings SET ${fields.join(', ')} WHERE id = 1 RETURNING *`,
      values
    );

    res.json({ success: true, data: result.rows[0], message: 'Settings updated' });
  } catch (err) { next(err); }
});

/**
 * GET /home-banners — public, enriched banner list for the devotee homepage.
 * Filters out banners whose target puja/chadhava has been deactivated, and
 * resolves each to a slug so the frontend can build the correct deep-link.
 */
settingsRouter.get('/home-banners', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await pool.query(`SELECT home_banners FROM app_settings WHERE id = 1`);
    const banners = (settings.rows[0]?.home_banners ?? []) as Array<{
      image_url: string;
      target_type: 'puja' | 'chadhava';
      target_id: string;
    }>;
    if (banners.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const pujaIds = banners.filter((b) => b.target_type === 'puja').map((b) => b.target_id);
    const chadhavaIds = banners.filter((b) => b.target_type === 'chadhava').map((b) => b.target_id);

    const [pujas, chadhavas] = await Promise.all([
      pujaIds.length
        ? pool.query(
            `SELECT id, slug, name FROM pujas WHERE id = ANY($1::uuid[]) AND is_active = true`,
            [pujaIds],
          )
        : Promise.resolve({ rows: [] as any[] }),
      chadhavaIds.length
        ? pool.query(
            `SELECT id, slug, name FROM chadhavas WHERE id = ANY($1::uuid[]) AND is_active = true`,
            [chadhavaIds],
          )
        : Promise.resolve({ rows: [] as any[] }),
    ]);

    const pujaMap = new Map(pujas.rows.map((r) => [r.id, r]));
    const chadhavaMap = new Map(chadhavas.rows.map((r) => [r.id, r]));

    const enriched = banners
      .map((b) => {
        const target = b.target_type === 'puja' ? pujaMap.get(b.target_id) : chadhavaMap.get(b.target_id);
        if (!target) return null; // dropped: target deleted or inactive
        return {
          image_url: b.image_url,
          target_type: b.target_type,
          target_id: b.target_id,
          target_slug: target.slug,
          target_name: target.name,
        };
      })
      .filter((b): b is Exclude<typeof b, null> => b !== null);

    res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
});
