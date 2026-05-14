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

const CHADHAVA_TX_SCALARS = ['name', 'description', 'benefits', 'rituals_included', 'shlok'] as const;
const CHADHAVA_TX_ARRAYS  = ['items_used', 'how_will_it_happen'] as const;
const CHADHAVA_LOCALE_FIELDS = [...CHADHAVA_TX_SCALARS, ...CHADHAVA_TX_ARRAYS];
const OFFERING_LOCALE_FIELDS = ['item_name', 'benefit'];

async function translateAndUpdateChadhava(client: { query: typeof pool.query }, id: string, body: Record<string, unknown>) {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const f of CHADHAVA_TX_SCALARS) {
    if (body[f] === undefined) continue;
    const hi = await translateToHindi(body[f] as string | null);
    updates.push(`${f}_hi = $${idx}`); values.push(hi); idx++;
  }
  for (const f of CHADHAVA_TX_ARRAYS) {
    if (body[f] === undefined) continue;
    const hi = await translateArrayToHindi(body[f] as string[] | null);
    updates.push(`${f}_hi = $${idx}`); values.push(hi); idx++;
  }
  if (updates.length === 0) return;
  values.push(id);
  await client.query(`UPDATE chadhavas SET ${updates.join(', ')} WHERE id = $${idx}`, values);
}

async function translateAllOfferingsForChadhava(client: { query: typeof pool.query }, chadhavaId: string) {
  const rows = await client.query(
    `SELECT id, item_name, benefit FROM chadhava_offerings WHERE chadhava_id = $1`,
    [chadhavaId],
  );
  for (const r of rows.rows) {
    const [nameHi, benefitHi] = await Promise.all([
      translateToHindi(r.item_name),
      translateToHindi(r.benefit),
    ]);
    await client.query(
      `UPDATE chadhava_offerings SET item_name_hi = $1, benefit_hi = $2 WHERE id = $3`,
      [nameHi, benefitHi, r.id],
    );
  }
}

export const chadhavasRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

const nullIfEmpty = (v: unknown) => (v === '' || v === undefined ? null : v);

const REPEAT_DURATIONS = new Set(['LUNAR_PHASE', 'MONTH_DATE', 'WEEK_DAYS']);
const BOOKING_MODES = new Set(['ONE_TIME', 'SUBSCRIPTION', 'BOTH']);

// All scalar columns the admin form is allowed to write.
// Note: chadhavas keep `max_bookings_per_event` (not renamed in 009 like pujas).
const CHADHAVA_FIELDS = [
  'name',
  'slug',
  'temple_id',
  'deity_id',
  'default_pujari_id',
  'description',
  'schedule_day',
  'schedule_time',
  'lunar_phase',
  'event_repeats',
  'repeat_duration',
  'repeats_on',
  'start_date',
  'start_end_times',
  'max_bookings_per_event',
  'booking_mode',
  'duration_minutes',
  'sample_video_url',
  'slider_images',
  'benefits',
  'rituals_included',
  'items_used',
  'how_will_it_happen',
  'shlok',
  'hamper_id',
  'send_hamper',
  'is_active',
] as const;

type ChadhavaField = (typeof CHADHAVA_FIELDS)[number];

const NULLABLE_FK_FIELDS: ChadhavaField[] = ['deity_id', 'default_pujari_id', 'hamper_id'];

interface OfferingInput {
  id?: string;
  item_name?: string;
  benefit?: string;
  price?: number | string;
  image_url?: string;
}

function validateChadhavaPayload(body: Record<string, unknown>, isCreate: boolean): string | null {
  if (isCreate) {
    if (!body.name || String(body.name).trim() === '') return 'name is required';
    if (!body.temple_id) return 'temple_id is required';
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
  if (body.offerings !== undefined && !Array.isArray(body.offerings)) {
    return 'offerings must be an array';
  }
  return null;
}

async function insertOfferings(client: { query: typeof pool.query }, chadhavaId: string, offerings: OfferingInput[]) {
  let order = 0;
  for (const o of offerings) {
    if (!o.item_name) continue;
    await client.query(
      `INSERT INTO chadhava_offerings (chadhava_id, item_name, benefit, price, images, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        chadhavaId,
        o.item_name,
        o.benefit ?? '',
        Number(o.price) || 0,
        o.image_url ? [o.image_url] : [],
        order++,
      ],
    );
  }
}

// ── List ──────────────────────────────────────────────────────────────────────
chadhavasRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const templeId = req.query.temple_id as string;
    const search = req.query.search as string;

    const conds: string[] = [];
    if (req.query.include_inactive !== 'true') {
      conds.push('c.is_active = true');
    }
    const params: unknown[] = [];
    if (templeId) {
      params.push(templeId);
      conds.push(`c.temple_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`c.name ILIKE $${params.length}`);
    }
    const whereClause = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM chadhavas c ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT c.*, t.name AS temple_name, t.name_hi AS temple_name_hi,
              t.address AS temple_address, t.address_hi AS temple_address_hi,
              d.name AS deity_name, d.name_hi AS deity_name_hi,
              (SELECT MIN(co.price) FROM chadhava_offerings co WHERE co.chadhava_id = c.id) AS min_price,
              COALESCE(ec.upcoming_events_count, 0)::int AS upcoming_events_count,
              ec.next_event_at
       FROM chadhavas c
       LEFT JOIN temples t ON c.temple_id = t.id
       LEFT JOIN deities d ON c.deity_id = d.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS upcoming_events_count,
                MIN(ce.start_time) FILTER (WHERE ce.start_time >= NOW() AND ce.status != 'COMPLETED') AS next_event_at
         FROM chadhava_events ce
         WHERE ce.chadhava_id = c.id AND ce.start_time >= NOW() AND ce.status != 'COMPLETED'
       ) ec ON true
       ${whereClause}
       ORDER BY ec.next_event_at ASC NULLS LAST, c.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );
    const locale = parseLocale(req.query.locale);
    scheduleBackfill('chadhavas', result.rows, { scalars: CHADHAVA_TX_SCALARS, arrays: CHADHAVA_TX_ARRAYS });
    res.json({
      success: true,
      data: applyLocaleArray(result.rows, locale, [...CHADHAVA_LOCALE_FIELDS, 'temple_name', 'temple_address', 'deity_name']),
      total, page, limit,
      message: 'Chadhavas fetched',
    });
  } catch (err) { next(err); }
});

// ── Get one ──────────────────────────────────────────────────────────────────
chadhavasRouter.get('/:identifier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.params;
    const where = isUuid(identifier) ? 'c.id = $1' : 'c.slug = $1';
    const chadhava = await pool.query(
      `SELECT c.*, t.name AS temple_name, t.name_hi AS temple_name_hi,
              t.address AS temple_address, t.address_hi AS temple_address_hi,
              d.name AS deity_name, d.name_hi AS deity_name_hi
       FROM chadhavas c
       LEFT JOIN temples t ON c.temple_id = t.id
       LEFT JOIN deities d ON c.deity_id = d.id
       WHERE ${where}${req.query.include_inactive === 'true' ? '' : ' AND c.is_active = true'}`,
      [identifier],
    );
    if (chadhava.rows.length === 0) { res.status(404).json({ success: false, message: 'Chadhava not found' }); return; }

    const offerings = await pool.query(
      'SELECT * FROM chadhava_offerings WHERE chadhava_id = $1 ORDER BY sort_order, created_at',
      [chadhava.rows[0].id],
    );

    const locale = parseLocale(req.query.locale);
    scheduleBackfill('chadhavas', chadhava.rows, { scalars: CHADHAVA_TX_SCALARS, arrays: CHADHAVA_TX_ARRAYS });
    const localizedChadhava = applyLocale(chadhava.rows[0], locale, [...CHADHAVA_LOCALE_FIELDS, 'temple_name', 'temple_address', 'deity_name']);
    const localizedOfferings = applyLocaleArray(offerings.rows, locale, OFFERING_LOCALE_FIELDS);

    res.json({
      success: true,
      data: { ...localizedChadhava, offerings: localizedOfferings },
      message: 'Chadhava details',
    });
  } catch (err) { next(err); }
});

// ── Create (with inline offerings transaction) ──────────────────────────────
chadhavasRouter.post('/', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const validationErr = validateChadhavaPayload(req.body, /*isCreate*/ true);
    if (validationErr) { res.status(400).json({ success: false, message: validationErr }); return; }

    await client.query('BEGIN');

    const cols: string[] = [];
    const placeholders: string[] = [];
    const values: unknown[] = [];

    for (const f of CHADHAVA_FIELDS) {
      let v = req.body[f];
      if (v === undefined) continue;
      if (NULLABLE_FK_FIELDS.includes(f)) v = nullIfEmpty(v);
      if (f === 'slug' && (v === '' || v === undefined)) v = null;
      cols.push(f);
      placeholders.push(`$${cols.length}`);
      values.push(v);
    }

    const insert = await client.query(
      `INSERT INTO chadhavas (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values,
    );
    const created = insert.rows[0];

    const offerings = (req.body.offerings as OfferingInput[]) || [];
    if (offerings.length > 0) {
      await insertOfferings(client, created.id, offerings);
    }

    // Translate-on-write — best-effort.
    await translateAndUpdateChadhava(client, created.id, req.body).catch((e) =>
      console.error('[chadhavas] translate-on-create failed:', e),
    );
    if (offerings.length > 0) {
      await translateAllOfferingsForChadhava(client, created.id).catch((e) =>
        console.error('[chadhavas] offerings translate failed:', e),
      );
    }

    await client.query('COMMIT');

    // Re-fetch with offerings for the response
    const fresh = await pool.query('SELECT * FROM chadhavas WHERE id = $1', [created.id]);
    const offeringsRows = await pool.query(
      'SELECT * FROM chadhava_offerings WHERE chadhava_id = $1 ORDER BY sort_order',
      [created.id],
    );
    res.status(201).json({
      success: true,
      data: { ...fresh.rows[0], offerings: offeringsRows.rows },
      message: 'Chadhava created',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

// ── Update (offerings: delete-and-reinsert if present) ───────────────────────
chadhavasRouter.patch('/:id', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const validationErr = validateChadhavaPayload(req.body, /*isCreate*/ false);
    if (validationErr) { res.status(400).json({ success: false, message: validationErr }); return; }

    await client.query('BEGIN');

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const f of CHADHAVA_FIELDS) {
      if (req.body[f] === undefined) continue;
      let v = req.body[f];
      if (NULLABLE_FK_FIELDS.includes(f)) v = nullIfEmpty(v);
      if (f === 'slug' && v === '') v = null;
      updates.push(`${f} = $${idx}`);
      values.push(v);
      idx++;
    }

    let updatedRow: Record<string, unknown> | null = null;
    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(id);
      const result = await client.query(
        `UPDATE chadhavas SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values,
      );
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Chadhava not found' });
        return;
      }
      updatedRow = result.rows[0];
    } else {
      // No scalar updates — verify the chadhava exists for the offerings update
      const exists = await client.query('SELECT * FROM chadhavas WHERE id = $1', [id]);
      if (exists.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ success: false, message: 'Chadhava not found' });
        return;
      }
      updatedRow = exists.rows[0];
    }

    // Smart-merge offerings: UPDATE existing ones by id, INSERT new ones (no id),
    // and remove offerings the admin dropped IF they're not referenced by any
    // chadhava_booking_offerings row (otherwise we'd FK-violate and fail the save).
    // Offerings that ARE booked stay in the table even if the admin "removed"
    // them in the UI — they need to remain for historical bookings to resolve.
    if (Array.isArray(req.body.offerings)) {
      const incoming = req.body.offerings as OfferingInput[];
      const incomingIds = incoming.map((o) => o.id).filter((x): x is string => !!x);

      // 1. UPDATE existing offerings the admin kept.
      let order = 0;
      for (const o of incoming) {
        if (!o.item_name) { order++; continue; }
        if (o.id) {
          await client.query(
            `UPDATE chadhava_offerings
                SET item_name = $1, benefit = $2, price = $3, images = $4, sort_order = $5
              WHERE id = $6 AND chadhava_id = $7`,
            [
              o.item_name,
              o.benefit ?? '',
              Number(o.price) || 0,
              o.image_url ? [o.image_url] : [],
              order,
              o.id,
              id,
            ],
          );
        }
        order++;
      }

      // 2. INSERT new offerings (no id supplied).
      const newOnes = incoming.filter((o) => !o.id && o.item_name);
      if (newOnes.length > 0) {
        await insertOfferings(client, id, newOnes);
      }

      // 3. Remove offerings the admin dropped — only those NOT referenced from
      //    any chadhava_booking_offerings row. Booked ones survive.
      const removable = await client.query(
        `SELECT co.id
           FROM chadhava_offerings co
          WHERE co.chadhava_id = $1
            ${incomingIds.length > 0 ? `AND co.id <> ALL($2::uuid[])` : ''}
            AND NOT EXISTS (
              SELECT 1 FROM chadhava_booking_offerings cbo WHERE cbo.offering_id = co.id
            )`,
        incomingIds.length > 0 ? [id, incomingIds] : [id],
      );
      if (removable.rows.length > 0) {
        await client.query(
          `DELETE FROM chadhava_offerings WHERE id = ANY($1::uuid[])`,
          [removable.rows.map((r) => r.id)],
        );
      }
    }

    // Translate any updated English fields + (re)translate offerings if they changed.
    await translateAndUpdateChadhava(client, id, req.body).catch((e) =>
      console.error('[chadhavas] translate-on-update failed:', e),
    );
    if (Array.isArray(req.body.offerings)) {
      await translateAllOfferingsForChadhava(client, id).catch((e) =>
        console.error('[chadhavas] offerings translate failed:', e),
      );
    }

    await client.query('COMMIT');

    const fresh = await pool.query('SELECT * FROM chadhavas WHERE id = $1', [id]);
    const offeringsRows = await pool.query(
      'SELECT * FROM chadhava_offerings WHERE chadhava_id = $1 ORDER BY sort_order',
      [id],
    );
    res.json({
      success: true,
      data: { ...fresh.rows[0], offerings: offeringsRows.rows },
      message: 'Chadhava updated',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

// ── Delete ───────────────────────────────────────────────────────────────────
// Same shape as the puja delete: clear future events with no bookings, block
// when a future event has bookings.
chadhavasRouter.delete('/:id', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const blocked = await client.query(
      `SELECT ce.id, ce.start_time, COUNT(cb.id)::int AS bookings
         FROM chadhava_events ce
         JOIN chadhava_bookings cb ON cb.chadhava_event_id = ce.id
        WHERE ce.chadhava_id = $1
          AND ce.status IN ('NOT_STARTED', 'INPROGRESS')
          AND ce.start_time >= NOW()
        GROUP BY ce.id`,
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

    const cleared = await client.query(
      `DELETE FROM chadhava_events
        WHERE chadhava_id = $1
          AND status IN ('NOT_STARTED', 'INPROGRESS')
          AND start_time >= NOW()
        RETURNING id`,
      [id],
    );

    const result = await client.query(
      'UPDATE chadhavas SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id],
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Chadhava not found' });
      return;
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Chadhava deleted${cleared.rows.length > 0 ? ` (${cleared.rows.length} upcoming event(s) cleaned up)` : ''}`,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

// ── Generate upcoming events from repeat config ─────────────────────────────
chadhavasRouter.post('/:id/generate-events', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const days = Math.max(1, Math.min(365, Number(req.query.days) || 60));

    const chRes = await pool.query('SELECT * FROM chadhavas WHERE id = $1 AND is_active = true', [id]);
    if (chRes.rows.length === 0) { res.status(404).json({ success: false, message: 'Chadhava not found' }); return; }
    const ch = chRes.rows[0];

    if (!ch.event_repeats) {
      res.status(400).json({ success: false, message: 'Chadhava is not set to repeat (event_repeats=false)' });
      return;
    }
    if (!REPEAT_DURATIONS.has(ch.repeat_duration)) {
      res.status(400).json({ success: false, message: 'Chadhava has no valid repeat_duration' });
      return;
    }
    if (!Array.isArray(ch.repeats_on) || ch.repeats_on.length === 0) {
      res.status(400).json({ success: false, message: 'Chadhava has empty repeats_on' });
      return;
    }

    const startDate = ch.start_date ? new Date(ch.start_date) : new Date();
    const fromDate = startDate.getTime() < Date.now() ? new Date() : startDate;

    const dates = await nextEventDates(
      ch.repeat_duration as RepeatDuration,
      ch.repeats_on as string[],
      fromDate,
      days,
    );

    const { h, m } = parseTimeOfDayIST(ch.schedule_time);
    const maxBookings = Number(ch.max_bookings_per_event) || 100;
    const pujariId = ch.default_pujari_id || null;

    let generated = 0;
    let skipped = 0;
    for (const d of dates) {
      const startTime = combineDateAndISTTime(d, h, m);
      const result = await pool.query(
        `INSERT INTO chadhava_events (chadhava_id, pujari_id, start_time, max_bookings, status, stage)
         VALUES ($1, $2, $3, $4, 'NOT_STARTED', 'YET_TO_START')
         ON CONFLICT (chadhava_id, start_time) DO NOTHING
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

// ── Offerings sub-resource (kept for granular updates) ───────────────────────
chadhavasRouter.post('/:id/offerings', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chadhavaId = req.params.id;
    const chadhava = await pool.query('SELECT id FROM chadhavas WHERE id = $1 AND is_active = true', [chadhavaId]);
    if (chadhava.rows.length === 0) { res.status(404).json({ success: false, message: 'Chadhava not found' }); return; }

    const { name, price, description, image_url } = req.body;
    const result = await pool.query(
      `INSERT INTO chadhava_offerings (chadhava_id, item_name, price, benefit, images)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [chadhavaId, name, price, description, image_url ? [image_url] : []],
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Offering added' });
  } catch (err) { next(err); }
});

chadhavasRouter.patch('/:chadhavaId/offerings/:offeringId', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chadhavaId, offeringId } = req.params;
    const { name, price, description, image_url } = req.body;

    const result = await pool.query(
      `UPDATE chadhava_offerings
       SET item_name = COALESCE($1, item_name), price = COALESCE($2, price),
           benefit = COALESCE($3, benefit), images = COALESCE($4, images)
       WHERE id = $5 AND chadhava_id = $6 RETURNING *`,
      [name, price, description, image_url ? [image_url] : null, offeringId, chadhavaId],
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Offering not found' }); return; }
    res.json({ success: true, data: result.rows[0], message: 'Offering updated' });
  } catch (err) { next(err); }
});

chadhavasRouter.delete('/:chadhavaId/offerings/:offeringId', requireAuth, requireAdmin('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chadhavaId, offeringId } = req.params;
    const result = await pool.query(
      'DELETE FROM chadhava_offerings WHERE id = $1 AND chadhava_id = $2 RETURNING id',
      [offeringId, chadhavaId],
    );
    if (result.rows.length === 0) { res.status(404).json({ success: false, message: 'Offering not found' }); return; }
    res.json({ success: true, message: 'Offering deleted' });
  } catch (err) { next(err); }
});

// DELETE /:id/events?from=<ISO-date>&dry_run=true|false
// Mirror of the puja bulk-cleanup endpoint for chadhavas.
chadhavasRouter.delete('/:id/events', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const from = (req.query.from as string) || new Date().toISOString();
    const dryRun = (req.query.dry_run as string) !== 'false';

    const candidates = await pool.query(
      `SELECT ce.id, ce.start_time,
              EXISTS (SELECT 1 FROM chadhava_bookings cb WHERE cb.chadhava_event_id = ce.id) AS has_bookings
       FROM chadhava_events ce
       WHERE ce.chadhava_id = $1 AND ce.start_time >= $2
       ORDER BY ce.start_time`,
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
      await pool.query(`DELETE FROM chadhava_events WHERE id = ANY($1::uuid[])`, [toDelete]);
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
