import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  nextEventDates,
  parseTimeOfDayIST,
  combineDateAndISTTime,
  type RepeatDuration,
} from '../lib/tithiCalendar';
import { translateToHindi, translateArrayToHindi } from '../lib/translate';
import { applyLocale, applyLocaleArray, parseLocale } from '../lib/locale';
import { scheduleBackfill } from '../lib/lazyTranslate';

// Translatable English fields whose values get auto-mirrored into the
// `<field>_hi` columns when the admin POSTs/PATCHes a puja, and which the
// GET handlers swap based on `?locale=hi`.
const PUJA_TX_SCALARS = ['name', 'description', 'benefits', 'rituals_included', 'shlok'] as const;
const PUJA_TX_ARRAYS  = ['items_used', 'how_will_it_happen'] as const;
const PUJA_LOCALE_FIELDS = [...PUJA_TX_SCALARS, ...PUJA_TX_ARRAYS];

// Best-effort translation pass. Failures fall back to NULL so the COALESCE
// in the GET handler still returns the English value — never blocking a save.
async function translateAndUpdatePuja(client: { query: typeof pool.query }, id: string, body: Record<string, unknown>) {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const f of PUJA_TX_SCALARS) {
    if (body[f] === undefined) continue;
    const hi = await translateToHindi(body[f] as string | null);
    updates.push(`${f}_hi = $${idx}`);
    values.push(hi);
    idx++;
  }
  for (const f of PUJA_TX_ARRAYS) {
    if (body[f] === undefined) continue;
    const hi = await translateArrayToHindi(body[f] as string[] | null);
    updates.push(`${f}_hi = $${idx}`);
    values.push(hi);
    idx++;
  }
  if (updates.length === 0) return;
  values.push(id);
  await client.query(`UPDATE pujas SET ${updates.join(', ')} WHERE id = $${idx}`, values);
}

export const pujasRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

// Coerce empty-string FK ids to null so Postgres doesn't complain
// about invalid UUID input from the admin form.
const nullIfEmpty = (v: unknown) => (v === '' || v === undefined ? null : v);

const REPEAT_DURATIONS = new Set(['LUNAR_PHASE', 'MONTH_DATE', 'WEEK_DAYS']);
const BOOKING_MODES = new Set(['ONE_TIME', 'SUBSCRIPTION', 'BOTH']);

// All scalar columns the admin form is allowed to write. Order matters for INSERT;
// the same list is reused for PATCH to drive the dynamic update builder.
const PUJA_FIELDS = [
  'name',
  'slug',
  'temple_id',
  'deity_id',
  'default_pujari_id',
  'description',
  'schedule_day',
  'schedule_time',
  'schedule_datetime',
  'lunar_phase',
  'event_repeats',
  'repeat_duration',
  'repeats_on',
  'start_date',
  'start_end_times',
  'max_devotee',
  'booking_mode',
  'duration_minutes',
  'price_for_1',
  'price_for_2',
  'price_for_4',
  'price_for_6',
  'sample_video_url',
  'slider_images',
  'benefits',
  'rituals_included',
  'items_used',
  'how_will_it_happen',
  'shlok',
  'hamper_id',
  'send_hamper',
] as const;

type PujaField = (typeof PUJA_FIELDS)[number];

// Fields that should fall back to null when the admin clears them (FK / optional).
const NULLABLE_FK_FIELDS: PujaField[] = ['deity_id', 'default_pujari_id', 'hamper_id'];

function validatePujaPayload(body: Record<string, unknown>, isCreate: boolean): string | null {
  if (isCreate) {
    if (!body.name || String(body.name).trim() === '') return 'name is required';
    if (!body.temple_id) return 'temple_id is required';
    for (const p of ['price_for_1', 'price_for_2', 'price_for_4', 'price_for_6']) {
      if (body[p] === undefined || body[p] === null || body[p] === '') {
        return `${p} is required (NOT NULL in schema)`;
      }
    }
  }
  if (body.repeat_duration && !REPEAT_DURATIONS.has(String(body.repeat_duration))) {
    return `repeat_duration must be one of LUNAR_PHASE, MONTH_DATE, WEEK_DAYS`;
  }
  if (body.booking_mode && !BOOKING_MODES.has(String(body.booking_mode))) {
    return `booking_mode must be one of ONE_TIME, SUBSCRIPTION, BOTH`;
  }
  if (body.event_repeats === true) {
    if (!body.repeat_duration) return 'repeat_duration is required when event_repeats=true';
    if (!Array.isArray(body.repeats_on) || body.repeats_on.length === 0) {
      return 'repeats_on must be a non-empty array when event_repeats=true';
    }
  }
  return null;
}

// ── List ──────────────────────────────────────────────────────────────────────
pujasRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const templeId = req.query.temple_id as string;

    let query = `
      SELECT p.*, t.name AS temple_name,
             COALESCE(ec.upcoming_events_count, 0)::int AS upcoming_events_count
      FROM pujas p
      LEFT JOIN temples t ON p.temple_id = t.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS upcoming_events_count
        FROM puja_events pe
        WHERE pe.puja_id = p.id AND pe.start_time >= NOW() AND pe.status != 'COMPLETED'
      ) ec ON true
      WHERE p.is_active = true`;
    const params: unknown[] = [];

    if (templeId) {
      params.push(templeId);
      query += ` AND p.temple_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND p.name ILIKE $${params.length}`;
    }

    // Build a COUNT query that mirrors the WHERE clauses but skips the lateral join.
    const countQuery = query
      .replace(/SELECT[\s\S]*?FROM pujas p/, 'SELECT COUNT(*) FROM pujas p')
      .replace(/LEFT JOIN LATERAL[\s\S]*?\) ec ON true/, '')
      .replace(/LEFT JOIN temples t ON p\.temple_id = t\.id/, 'LEFT JOIN temples t ON p.temple_id = t.id');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const locale = parseLocale(req.query.locale);
    // Fire-and-forget back-fill of any missing `_hi` so subsequent reads see Hindi.
    scheduleBackfill('pujas', result.rows, { scalars: PUJA_TX_SCALARS, arrays: PUJA_TX_ARRAYS });
    res.json({
      success: true,
      data: applyLocaleArray(result.rows, locale, PUJA_LOCALE_FIELDS),
      total, page, limit,
      message: 'Pujas fetched',
    });
  } catch (err) { next(err); }
});

// ── Get one ──────────────────────────────────────────────────────────────────
pujasRouter.get('/:identifier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.params;
    const where = isUuid(identifier) ? 'p.id = $1' : 'p.slug = $1';
    const result = await pool.query(
      `SELECT p.*, t.name AS temple_name, t.name_hi AS temple_name_hi,
              d.name AS deity_name, d.name_hi AS deity_name_hi
       FROM pujas p
       LEFT JOIN temples t ON p.temple_id = t.id
       LEFT JOIN deities d ON p.deity_id = d.id
       WHERE ${where} AND p.is_active = true`,
      [identifier],
    );
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Puja not found' }); return; }
    const locale = parseLocale(req.query.locale);
    scheduleBackfill('pujas', result.rows, { scalars: PUJA_TX_SCALARS, arrays: PUJA_TX_ARRAYS });
    res.json({
      success: true,
      data: applyLocale(result.rows[0], locale, [...PUJA_LOCALE_FIELDS, 'temple_name', 'deity_name']),
      message: 'Puja details',
    });
  } catch (err) { next(err); }
});

// ── Create ───────────────────────────────────────────────────────────────────
pujasRouter.post('/', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const validationErr = validatePujaPayload(req.body, /*isCreate*/ true);
    if (validationErr) { res.status(400).json({ success: false, message: validationErr }); return; }

    const cols: string[] = [];
    const placeholders: string[] = [];
    const values: unknown[] = [];

    for (const f of PUJA_FIELDS) {
      let v = req.body[f];
      if (v === undefined) continue;
      if (NULLABLE_FK_FIELDS.includes(f)) v = nullIfEmpty(v);
      // slug: empty → null (BEFORE INSERT trigger generates from name)
      if (f === 'slug' && (v === '' || v === undefined)) v = null;
      cols.push(f);
      placeholders.push(`$${cols.length}`);
      values.push(v);
    }

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO pujas (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values,
    );
    const created = result.rows[0];

    // Translate-on-write — best-effort, doesn't block the create.
    await translateAndUpdatePuja(client, created.id, req.body).catch((e) =>
      console.error('[pujas] translate-on-create failed:', e),
    );

    await client.query('COMMIT');

    // Re-read so the response includes any auto-translated _hi columns.
    const fresh = await pool.query('SELECT * FROM pujas WHERE id = $1', [created.id]);
    res.status(201).json({ success: true, data: fresh.rows[0], message: 'Puja created' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

// ── Update ───────────────────────────────────────────────────────────────────
pujasRouter.patch('/:id', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const validationErr = validatePujaPayload(req.body, /*isCreate*/ false);
    if (validationErr) { res.status(400).json({ success: false, message: validationErr }); return; }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const f of PUJA_FIELDS) {
      if (req.body[f] === undefined) continue;
      let v = req.body[f];
      if (NULLABLE_FK_FIELDS.includes(f)) v = nullIfEmpty(v);
      if (f === 'slug' && v === '') v = null;
      updates.push(`${f} = $${idx}`);
      values.push(v);
      idx++;
    }

    if (updates.length === 0) { res.status(400).json({ success: false, message: 'No fields to update' }); return; }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE pujas SET ${updates.join(', ')} WHERE id = $${idx} AND is_active = true RETURNING *`,
      values,
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Puja not found' });
      return;
    }

    // Re-translate any English fields that were touched in this PATCH.
    await translateAndUpdatePuja(client, id, req.body).catch((e) =>
      console.error('[pujas] translate-on-update failed:', e),
    );

    await client.query('COMMIT');

    const fresh = await pool.query('SELECT * FROM pujas WHERE id = $1', [id]);
    res.json({ success: true, data: fresh.rows[0], message: 'Puja updated' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

// ── Delete ───────────────────────────────────────────────────────────────────
// Soft-delete the puja AND clean up any of its future events that have no
// bookings yet. Future events that DO have bookings block the delete (you
// can't silently orphan a paid booking — admin needs to refund / cancel
// those first via the bookings page).
pujasRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    // Find future events that DO have bookings — blocking.
    const blocked = await client.query(
      `SELECT pe.id, pe.start_time, COUNT(pb.id)::int AS bookings
         FROM puja_events pe
         JOIN puja_bookings pb ON pb.puja_event_id = pe.id
        WHERE pe.puja_id = $1
          AND pe.status IN ('NOT_STARTED', 'INPROGRESS')
          AND pe.start_time >= NOW()
        GROUP BY pe.id`,
      [id],
    );
    if (blocked.rows.length > 0) {
      await client.query('ROLLBACK');
      const totalBookings = blocked.rows.reduce((s, r) => s + r.bookings, 0);
      res.status(409).json({
        success: false,
        message: `Cannot delete: ${blocked.rows.length} upcoming event(s) have ${totalBookings} active booking(s). Cancel/refund the bookings first.`,
      });
      return;
    }

    // Safe to wipe: future events with zero bookings.
    const cleared = await client.query(
      `DELETE FROM puja_events
        WHERE puja_id = $1
          AND status IN ('NOT_STARTED', 'INPROGRESS')
          AND start_time >= NOW()
        RETURNING id`,
      [id],
    );

    const result = await client.query(
      'UPDATE pujas SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id],
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Puja not found' });
      return;
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Puja deleted${cleared.rows.length > 0 ? ` (${cleared.rows.length} upcoming event(s) cleaned up)` : ''}`,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

// ── Generate upcoming events from repeat config ─────────────────────────────
// POST /:id/generate-events?days=60
// Reads the puja's repeat config and inserts puja_events for the matching dates.
// Idempotent — relies on the unique index (puja_id, start_time) added in 011.
pujasRouter.post('/:id/generate-events', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const days = Math.max(1, Math.min(365, Number(req.query.days) || 60));

    const pujaRes = await pool.query('SELECT * FROM pujas WHERE id = $1 AND is_active = true', [id]);
    if (pujaRes.rows.length === 0) { res.status(404).json({ success: false, message: 'Puja not found' }); return; }
    const puja = pujaRes.rows[0];

    if (!puja.event_repeats) {
      res.status(400).json({ success: false, message: 'Puja is not set to repeat (event_repeats=false)' });
      return;
    }
    if (!REPEAT_DURATIONS.has(puja.repeat_duration)) {
      res.status(400).json({ success: false, message: 'Puja has no valid repeat_duration' });
      return;
    }
    if (!Array.isArray(puja.repeats_on) || puja.repeats_on.length === 0) {
      res.status(400).json({ success: false, message: 'Puja has empty repeats_on' });
      return;
    }

    const startDate = puja.start_date ? new Date(puja.start_date) : new Date();
    const fromDate = startDate.getTime() < Date.now() ? new Date() : startDate;

    const dates = await nextEventDates(
      puja.repeat_duration as RepeatDuration,
      puja.repeats_on as string[],
      fromDate,
      days,
    );

    const { h, m } = parseTimeOfDayIST(puja.schedule_time);
    const maxBookings = Number(puja.max_devotee) || 100;
    const pujariId = puja.default_pujari_id || null;

    let generated = 0;
    let skipped = 0;
    for (const d of dates) {
      const startTime = combineDateAndISTTime(d, h, m);
      const result = await pool.query(
        `INSERT INTO puja_events (puja_id, pujari_id, start_time, max_bookings, status, stage)
         VALUES ($1, $2, $3, $4, 'NOT_STARTED', 'YET_TO_START')
         ON CONFLICT (puja_id, start_time) DO NOTHING
         RETURNING id`,
        [id, pujariId, startTime, maxBookings],
      );
      if (result.rows.length > 0) generated++;
      else skipped++;
    }

    res.json({
      success: true,
      data: { generated, skipped, total_dates: dates.length, days },
      message: `Generated ${generated} events (${skipped} already existed)`,
    });
  } catch (err) { next(err); }
});

// DELETE /:id/events?from=<ISO-date>&dry_run=true|false
// Bulk-cleanup helper for orphaned future events (used after the admin edits a
// puja's repeats_on config and wants to prune the now-mismatched generated
// events). The check is conservative: any event with even one booking — past
// or present, any status — is excluded from deletion.
pujasRouter.delete('/:id/events', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const from = (req.query.from as string) || new Date().toISOString();
    const dryRun = (req.query.dry_run as string) !== 'false'; // default to dry-run for safety

    const candidates = await pool.query(
      `SELECT pe.id, pe.start_time,
              EXISTS (SELECT 1 FROM puja_bookings pb WHERE pb.puja_event_id = pe.id) AS has_bookings
       FROM puja_events pe
       WHERE pe.puja_id = $1 AND pe.start_time >= $2
       ORDER BY pe.start_time`,
      [id, from],
    );

    const toDelete = candidates.rows.filter((r) => !r.has_bookings).map((r) => r.id);
    const keptIds = candidates.rows.filter((r) => r.has_bookings).map((r) => r.id);

    if (dryRun) {
      return res.json({
        success: true,
        data: {
          would_delete: toDelete.length,
          would_keep: keptIds.length,
          kept_ids: keptIds,
          from,
        },
      });
    }

    if (toDelete.length > 0) {
      await pool.query(`DELETE FROM puja_events WHERE id = ANY($1::uuid[])`, [toDelete]);
    }

    res.json({
      success: true,
      data: {
        deleted: toDelete.length,
        kept: keptIds.length,
        kept_ids: keptIds,
        from,
      },
      message: `Deleted ${toDelete.length} events (${keptIds.length} kept due to bookings)`,
    });
  } catch (err) { next(err); }
});
