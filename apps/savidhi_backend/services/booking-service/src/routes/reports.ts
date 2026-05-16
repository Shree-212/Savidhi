import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAdmin } from '../middleware/auth';
import { buildExcel, buildZip, sendFile, MIME_XLSX, MIME_ZIP } from '../lib/reportExport';

export const reportsRouter = Router();

/* ──────────────────────────────────────────────────────────────────────────
 *  Helpers
 * ────────────────────────────────────────────────────────────────────────── */

function dateRangeParams(query: Record<string, unknown>, dateCol: string) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (query.from_date) { conditions.push(`${dateCol} >= $${idx++}`); params.push(query.from_date); }
  if (query.to_date)   { conditions.push(`${dateCol} <= $${idx++}`); params.push(query.to_date); }

  return { conditions, params, idx };
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });
}

function fmtShortId(id: string | null | undefined): string {
  if (!id) return '';
  return String(id).slice(0, 6).toUpperCase();
}

/* ══════════════════════════════════════════════════════════════════════════
 *  1.  PUJA SANKALP — one row per puja_event, with devotee count.
 *      Per-row download = .xlsx of devotee+gotra list for that event.
 *      Page download    = .zip of one .xlsx per event in the date range.
 * ══════════════════════════════════════════════════════════════════════════ */

async function fetchPujaSankalpEvents(query: Record<string, unknown>) {
  const { conditions, params, idx: startIdx } = dateRangeParams(query, 'pe.start_time');
  let idx = startIdx;
  if (query.temple_id) { conditions.push(`p.temple_id = $${idx++}`); params.push(query.temple_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // include_empty=true brings back events with zero non-cancelled bookings.
  // Default behaviour suppresses them — fixes the "empty entries" bug.
  const includeEmpty = String(query.include_empty ?? '').toLowerCase() === 'true';
  const havingClause = includeEmpty ? '' : 'HAVING COUNT(pb.id) > 0';

  const { rows } = await pool.query(
    `SELECT pe.id            AS event_id,
            p.name           AS puja_name,
            t.name           AS temple_name,
            COUNT(pb.id)::int AS devotee_count,
            pe.start_time    AS event_date,
            COALESCE(SUM(pb.cost), 0)::numeric AS received,
            pe.status        AS status,
            pj.name          AS pujari_name
       FROM puja_events pe
       JOIN pujas    p  ON p.id  = pe.puja_id
       JOIN temples  t  ON t.id  = p.temple_id
       LEFT JOIN pujaris pj ON pj.id = pe.pujari_id
       LEFT JOIN puja_bookings pb
              ON pb.puja_event_id = pe.id
             AND pb.status <> 'CANCELLED'
       ${where}
       GROUP BY pe.id, p.name, t.name, pe.start_time, pe.status, pj.name
       ${havingClause}
       ORDER BY pe.start_time DESC`,
    params,
  );
  return rows;
}

async function fetchPujaEventDevotees(eventId: string) {
  // Earliest booking first so report devotee rows match the admin modal.
  const { rows } = await pool.query(
    `SELECT d.name AS name, COALESCE(d.gotra, '') AS gotra
       FROM puja_bookings pb
       JOIN devotees d ON d.id = pb.devotee_id
      WHERE pb.puja_event_id = $1 AND pb.status <> 'CANCELLED'
      ORDER BY pb.created_at ASC`,
    [eventId],
  );
  // puja_booking_devotees (multiple devotees per booking)
  let extras: any[] = [];
  try {
    const r = await pool.query(
      `SELECT pbd.name AS name, COALESCE(pbd.gotra, '') AS gotra
         FROM puja_booking_devotees pbd
         JOIN puja_bookings pb ON pb.id = pbd.puja_booking_id
        WHERE pb.puja_event_id = $1 AND pb.status <> 'CANCELLED'
        ORDER BY pb.created_at ASC`,
      [eventId],
    );
    extras = r.rows;
  } catch { /* table may not exist on older deploys */ }
  return [...rows, ...extras].filter((r) => r.name);
}

reportsRouter.get('/puja-sankalp', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await fetchPujaSankalpEvents(req.query as Record<string, unknown>);
    const data = rows.map((r) => ({
      id:          r.event_id,
      event_id:    r.event_id,
      pujaName:    r.puja_name,
      temple:      r.temple_name,
      devotee:     r.devotee_count,
      startTime:   fmtDate(r.event_date),
      received:    Number(r.received),
      status:      r.status,
      pujari:      r.pujari_name ?? '—',
    }));
    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'ID', key: 'id' },
        { header: 'Puja Name', key: 'pujaName', width: 28 },
        { header: 'Temple', key: 'temple', width: 28 },
        { header: 'Devotees', key: 'devotee' },
        { header: 'Start Time', key: 'startTime' },
        { header: 'Received', key: 'received' },
        { header: 'Status', key: 'status' },
        { header: 'Pujari', key: 'pujari' },
      ], 'Puja Sankalp');
      return sendFile(res, buf, 'Puja Sankalp Report.xlsx', MIME_XLSX);
    }
    if (req.query.format === 'zip') {
      const files = [] as { name: string; buffer: Buffer }[];
      for (const r of rows) {
        const devotees = await fetchPujaEventDevotees(r.event_id);
        const buf = await buildExcel(
          devotees.map((d, i) => ({ sl: i + 1, name: d.name, gotra: d.gotra || '—' })),
          [
            { header: 'SL', key: 'sl', width: 6 },
            { header: 'Devotee Name', key: 'name', width: 30 },
            { header: 'Gotra', key: 'gotra', width: 18 },
          ],
          'Sankalp Devotees',
        );
        const label = `${r.puja_name} - ${fmtDate(r.event_date)}.xlsx`;
        files.push({ name: label, buffer: buf });
      }
      const zip = await buildZip(files);
      return sendFile(res, zip, 'Puja Sankalp Report.zip', MIME_ZIP);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/**
 * Per-row download for one puja_event. `?format=xlsx` (default) returns the
 * raw xlsx file; `?format=json` returns the devotee list + event meta as JSON
 * so the admin can build a PDF client-side.
 */
reportsRouter.get('/puja-sankalp/:eventId/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
      res.status(400).json({ success: false, message: `Invalid event id: ${eventId}` });
      return;
    }
    const eventInfo = await pool.query(
      `SELECT p.name AS puja_name, pe.start_time
         FROM puja_events pe JOIN pujas p ON p.id = pe.puja_id
        WHERE pe.id = $1`,
      [eventId],
    );
    if (eventInfo.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Puja event not found' });
      return;
    }
    const meta = eventInfo.rows[0];
    const devotees = await fetchPujaEventDevotees(eventId);
    const format = String(req.query.format ?? 'xlsx');
    const label = `${meta.puja_name}${meta.start_time ? ' - ' + fmtDate(meta.start_time) : ''}`;

    if (format === 'json') {
      res.json({
        success: true,
        data: {
          puja_name: meta.puja_name,
          start_time: meta.start_time,
          label,
          devotees: devotees.map((d, i) => ({ sl: i + 1, name: d.name, gotra: d.gotra || '' })),
        },
      });
      return;
    }

    const xlsx = await buildExcel(
      devotees.map((d, i) => ({ sl: i + 1, name: d.name, gotra: d.gotra || '—' })),
      [
        { header: 'SL', key: 'sl', width: 6 },
        { header: 'Devotee Name', key: 'name', width: 30 },
        { header: 'Gotra', key: 'gotra', width: 18 },
      ],
      'Sankalp Devotees',
    );
    sendFile(res, xlsx, `Puja Sankalp - ${label}.xlsx`, MIME_XLSX);
  } catch (err: any) {
    console.error('[puja-sankalp/export]', err);
    res.status(500).json({ success: false, message: `Export failed: ${err?.message ?? String(err)}` });
  }
});

/* ══════════════════════════════════════════════════════════════════════════
 *  2.  CHADHAVA SANKALP — one row per chadhava_event.
 * ══════════════════════════════════════════════════════════════════════════ */

async function fetchChadhavaSankalpEvents(query: Record<string, unknown>) {
  const { conditions, params, idx: startIdx } = dateRangeParams(query, 'ce.start_time');
  let idx = startIdx;
  if (query.temple_id) { conditions.push(`c.temple_id = $${idx++}`); params.push(query.temple_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const includeEmpty = String(query.include_empty ?? '').toLowerCase() === 'true';
  const havingClause = includeEmpty ? '' : 'HAVING COUNT(cb.id) > 0';

  const { rows } = await pool.query(
    `SELECT ce.id          AS event_id,
            c.name         AS chadhava_name,
            t.name         AS temple_name,
            COUNT(cb.id)::int AS devotee_count,
            ce.start_time  AS event_date,
            COALESCE(SUM(cb.cost), 0)::numeric AS received,
            ce.status      AS status,
            pj.name        AS pujari_name
       FROM chadhava_events ce
       JOIN chadhavas c ON c.id = ce.chadhava_id
       JOIN temples   t ON t.id = c.temple_id
       LEFT JOIN pujaris pj ON pj.id = ce.pujari_id
       LEFT JOIN chadhava_bookings cb
              ON cb.chadhava_event_id = ce.id
             AND cb.status <> 'CANCELLED'
       ${where}
       GROUP BY ce.id, c.name, t.name, ce.start_time, ce.status, pj.name
       ${havingClause}
       ORDER BY ce.start_time DESC`,
    params,
  );
  return rows;
}

async function fetchChadhavaEventDevotees(eventId: string) {
  // Earliest booking first so report devotee rows match the admin modal.
  const { rows } = await pool.query(
    `SELECT d.name AS name, COALESCE(d.gotra, '') AS gotra
       FROM chadhava_bookings cb
       JOIN devotees d ON d.id = cb.devotee_id
      WHERE cb.chadhava_event_id = $1 AND cb.status <> 'CANCELLED'
      ORDER BY cb.created_at ASC`,
    [eventId],
  );
  let extras: any[] = [];
  try {
    const r = await pool.query(
      `SELECT cbd.name AS name, COALESCE(cbd.gotra, '') AS gotra
         FROM chadhava_booking_devotees cbd
         JOIN chadhava_bookings cb ON cb.id = cbd.chadhava_booking_id
        WHERE cb.chadhava_event_id = $1 AND cb.status <> 'CANCELLED'
        ORDER BY cb.created_at ASC`,
      [eventId],
    );
    extras = r.rows;
  } catch { /* table may not exist */ }
  return [...rows, ...extras].filter((r) => r.name);
}

reportsRouter.get('/chadhava-sankalp', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await fetchChadhavaSankalpEvents(req.query as Record<string, unknown>);
    const data = rows.map((r) => ({
      id:           r.event_id,
      event_id:     r.event_id,
      chadhavaName: r.chadhava_name,
      temple:       r.temple_name,
      devotee:      r.devotee_count,
      startTime:    fmtDate(r.event_date),
      received:     Number(r.received),
      status:       r.status,
      pujari:       r.pujari_name ?? '—',
    }));
    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'ID', key: 'id' },
        { header: 'Chadhava Name', key: 'chadhavaName', width: 28 },
        { header: 'Temple', key: 'temple', width: 28 },
        { header: 'Devotees', key: 'devotee' },
        { header: 'Start Time', key: 'startTime' },
        { header: 'Received', key: 'received' },
        { header: 'Status', key: 'status' },
        { header: 'Pujari', key: 'pujari' },
      ], 'Chadhava Sankalp');
      return sendFile(res, buf, 'Chadhava Sankalp Report.xlsx', MIME_XLSX);
    }
    if (req.query.format === 'zip') {
      const files = [] as { name: string; buffer: Buffer }[];
      for (const r of rows) {
        const devotees = await fetchChadhavaEventDevotees(r.event_id);
        const buf = await buildExcel(
          devotees.map((d, i) => ({ sl: i + 1, name: d.name, gotra: d.gotra || '—' })),
          [
            { header: 'SL', key: 'sl', width: 6 },
            { header: 'Devotee Name', key: 'name', width: 30 },
            { header: 'Gotra', key: 'gotra', width: 18 },
          ],
          'Sankalp Devotees',
        );
        files.push({ name: `${r.chadhava_name} - ${fmtDate(r.event_date)}.xlsx`, buffer: buf });
      }
      const zip = await buildZip(files);
      return sendFile(res, zip, 'Chadhava Sankalp Report.zip', MIME_ZIP);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

reportsRouter.get('/chadhava-sankalp/:eventId/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
      res.status(400).json({ success: false, message: `Invalid event id: ${eventId}` });
      return;
    }
    const info = await pool.query(
      `SELECT c.name AS chadhava_name, ce.start_time
         FROM chadhava_events ce JOIN chadhavas c ON c.id = ce.chadhava_id
        WHERE ce.id = $1`,
      [eventId],
    );
    if (info.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Chadhava event not found' });
      return;
    }
    const meta = info.rows[0];
    const devotees = await fetchChadhavaEventDevotees(eventId);
    const format = String(req.query.format ?? 'xlsx');
    const label = `${meta.chadhava_name}${meta.start_time ? ' - ' + fmtDate(meta.start_time) : ''}`;

    if (format === 'json') {
      res.json({
        success: true,
        data: {
          chadhava_name: meta.chadhava_name,
          start_time: meta.start_time,
          label,
          devotees: devotees.map((d, i) => ({ sl: i + 1, name: d.name, gotra: d.gotra || '' })),
        },
      });
      return;
    }

    const xlsx = await buildExcel(
      devotees.map((d, i) => ({ sl: i + 1, name: d.name, gotra: d.gotra || '—' })),
      [
        { header: 'SL', key: 'sl', width: 6 },
        { header: 'Devotee Name', key: 'name', width: 30 },
        { header: 'Gotra', key: 'gotra', width: 18 },
      ],
      'Sankalp Devotees',
    );
    sendFile(res, xlsx, `Chadhava Sankalp - ${label}.xlsx`, MIME_XLSX);
  } catch (err: any) {
    console.error('[chadhava-sankalp/export]', err);
    res.status(500).json({ success: false, message: `Export failed: ${err?.message ?? String(err)}` });
  }
});

/* ══════════════════════════════════════════════════════════════════════════
 *  3.  CHADHAVA OFFERINGS — one row per chadhava_event, with offerings text.
 * ══════════════════════════════════════════════════════════════════════════ */

reportsRouter.get('/chadhava-offerings', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conditions, params, idx: startIdx } = dateRangeParams(req.query as Record<string, unknown>, 'ce.start_time');
    let idx = startIdx;
    if (req.query.temple_id) { conditions.push(`c.temple_id = $${idx++}`); params.push(req.query.temple_id); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const includeEmpty = String(req.query.include_empty ?? '').toLowerCase() === 'true';
    const havingClause = includeEmpty ? '' : 'HAVING COUNT(co.item_name) > 0';

    const { rows } = await pool.query(
      `SELECT ce.id          AS event_id,
              c.name         AS chadhava_name,
              t.name         AS temple_name,
              ce.start_time  AS event_date,
              COALESCE(
                json_agg(
                  json_build_object('item', co.item_name, 'qty', cbo_q.total_qty)
                  ORDER BY co.item_name
                ) FILTER (WHERE co.item_name IS NOT NULL),
                '[]'::json
              ) AS offerings_json
         FROM chadhava_events ce
         JOIN chadhavas c ON c.id = ce.chadhava_id
         JOIN temples   t ON t.id = c.temple_id
         LEFT JOIN LATERAL (
           SELECT cbo.offering_id, SUM(cbo.quantity)::int AS total_qty
             FROM chadhava_booking_offerings cbo
             JOIN chadhava_bookings cb ON cb.id = cbo.chadhava_booking_id
            WHERE cb.chadhava_event_id = ce.id AND cb.status <> 'CANCELLED'
            GROUP BY cbo.offering_id
         ) cbo_q ON true
         LEFT JOIN chadhava_offerings co ON co.id = cbo_q.offering_id
         ${where}
         GROUP BY ce.id, c.name, t.name, ce.start_time
         ${havingClause}
         ORDER BY ce.start_time DESC`,
      params,
    );

    const data = rows.map((r) => {
      const items: { item: string; qty: number }[] = r.offerings_json || [];
      const txt = items.length
        ? items.map((o) => `${o.item} — ${o.qty}X`).join('\n')
        : '—';
      return {
        id:                  r.event_id,
        chadhavaName:        r.chadhava_name,
        temple:              r.temple_name,
        startTime:           fmtDate(r.event_date),
        offeringsAndQuantity: txt,
      };
    });

    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'ID', key: 'id' },
        { header: 'Chadhava Name', key: 'chadhavaName', width: 28 },
        { header: 'Temple', key: 'temple', width: 28 },
        { header: 'Start Time', key: 'startTime' },
        { header: 'Offerings & Quantity', key: 'offeringsAndQuantity', width: 60 },
      ], 'Chadhava Offerings');
      return sendFile(res, buf, 'Chadhava Offerings Report.xlsx', MIME_XLSX);
    }

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════════════════════════════════════
 *  4.  APPOINTMENTS — one row per astrologer (aggregated for date range).
 * ══════════════════════════════════════════════════════════════════════════ */

async function fetchAppointmentsByAstrologer(query: Record<string, unknown>) {
  const { conditions, params, idx: startIdx } = dateRangeParams(query, 'a.scheduled_at');
  let idx = startIdx;
  if (query.astrologer_id) { conditions.push(`a.astrologer_id = $${idx++}`); params.push(query.astrologer_id); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT ast.id AS astrologer_id,
            ast.name AS astrologer_name,
            COUNT(a.id)::int AS bookings,
            COUNT(*) FILTER (WHERE a.meet_link IS NOT NULL AND a.meet_link <> '')::int AS meet_link_count,
            COALESCE(SUM(a.cost), 0)::numeric AS received
       FROM astrologers ast
       LEFT JOIN appointments a
              ON a.astrologer_id = ast.id
             AND a.status <> 'CANCELLED'
             ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}
       GROUP BY ast.id, ast.name
       HAVING COUNT(a.id) > 0
       ORDER BY ast.name`,
    params,
  );
  return rows;
}

async function fetchAstrologerAppointments(astrologerId: string, from?: string, to?: string) {
  const conds: string[] = [`a.astrologer_id = $1`];
  const params: unknown[] = [astrologerId];
  let idx = 2;
  if (from) { conds.push(`a.scheduled_at >= $${idx++}`); params.push(from); }
  if (to)   { conds.push(`a.scheduled_at <= $${idx++}`); params.push(to); }
  const where = `WHERE ${conds.join(' AND ')}`;
  const { rows } = await pool.query(
    `SELECT d.name        AS devotee_name,
            COALESCE(d.gotra, '') AS gotra,
            a.scheduled_at,
            a.duration,
            COALESCE(a.meet_link, '') AS meet_link
       FROM appointments a
       JOIN devotees d ON d.id = a.devotee_id
       ${where}
       ORDER BY a.scheduled_at`,
    params,
  );
  return rows;
}

reportsRouter.get('/appointments', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await fetchAppointmentsByAstrologer(req.query as Record<string, unknown>);
    const data = rows.map((r) => ({
      id:                r.astrologer_id,
      astrologer_id:     r.astrologer_id,
      astrologerName:    r.astrologer_name,
      bookings:          r.bookings,
      meetLinkAvailable: `${r.meet_link_count}/${r.bookings}`,
      received:          Number(r.received),
    }));

    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'ID', key: 'id' },
        { header: 'Astrologer', key: 'astrologerName', width: 28 },
        { header: 'Bookings', key: 'bookings' },
        { header: 'Meet Link Available', key: 'meetLinkAvailable' },
        { header: 'Received', key: 'received' },
      ], 'Appointments');
      return sendFile(res, buf, 'Appointments Report.xlsx', MIME_XLSX);
    }
    if (req.query.format === 'zip') {
      const from = req.query.from_date as string | undefined;
      const to   = req.query.to_date as string | undefined;
      const files = [] as { name: string; buffer: Buffer }[];
      for (const r of rows) {
        const appts = await fetchAstrologerAppointments(r.astrologer_id, from, to);
        const buf = await buildExcel(
          appts.map((a, i) => ({
            sl: i + 1,
            name: a.devotee_name,
            gotra: a.gotra || '—',
            start: fmtDate(a.scheduled_at),
            duration: a.duration,
            link: a.meet_link || 'Not generated',
          })),
          [
            { header: 'SL', key: 'sl', width: 6 },
            { header: 'Devotee Name', key: 'name', width: 28 },
            { header: 'Gotra', key: 'gotra', width: 18 },
            { header: 'Start Time', key: 'start', width: 24 },
            { header: 'Duration', key: 'duration', width: 12 },
            { header: 'Meeting Link', key: 'link', width: 40 },
          ],
          'Appointments',
        );
        files.push({ name: `${r.astrologer_name}.xlsx`, buffer: buf });
      }
      const zip = await buildZip(files);
      return sendFile(res, zip, 'Appointments Report.zip', MIME_ZIP);
    }

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

reportsRouter.get('/appointments/:astrologerId/export', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { astrologerId } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(astrologerId)) {
      res.status(400).json({ success: false, message: `Invalid astrologer id: ${astrologerId}` });
      return;
    }
    const ast = await pool.query('SELECT name FROM astrologers WHERE id = $1', [astrologerId]);
    if (ast.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Astrologer not found' });
      return;
    }
    const from = req.query.from_date as string | undefined;
    const to   = req.query.to_date as string | undefined;
    const appts = await fetchAstrologerAppointments(astrologerId, from, to);
    const format = String(req.query.format ?? 'xlsx');
    const astrologerName = ast.rows[0].name;

    const rows = appts.map((a, i) => ({
      sl: i + 1,
      name: a.devotee_name,
      gotra: a.gotra || '',
      start: fmtDate(a.scheduled_at),
      duration: a.duration,
      link: a.meet_link || 'Not generated',
    }));

    if (format === 'json') {
      res.json({
        success: true,
        data: { astrologer_name: astrologerName, label: astrologerName, appointments: rows },
      });
      return;
    }

    const xlsx = await buildExcel(
      rows.map((r) => ({ ...r, gotra: r.gotra || '—' })),
      [
        { header: 'SL', key: 'sl', width: 6 },
        { header: 'Devotee Name', key: 'name', width: 28 },
        { header: 'Gotra', key: 'gotra', width: 18 },
        { header: 'Start Time', key: 'start', width: 24 },
        { header: 'Duration', key: 'duration', width: 12 },
        { header: 'Meeting Link', key: 'link', width: 40 },
      ],
      'Appointments',
    );
    sendFile(res, xlsx, `Appointments - ${astrologerName}.xlsx`, MIME_XLSX);
  } catch (err: any) {
    console.error('[appointments/export]', err);
    res.status(500).json({ success: false, message: `Export failed: ${err?.message ?? String(err)}` });
  }
});

/* ══════════════════════════════════════════════════════════════════════════
 *  5.  LEDGER (unchanged shape, kept for compat — used by /reports/ledger).
 * ══════════════════════════════════════════════════════════════════════════ */

reportsRouter.get('/ledger', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conditions, params, idx: startIdx } = dateRangeParams(req.query as Record<string, unknown>, 'le.created_at');
    let idx = startIdx;
    if (req.query.party_type) { conditions.push(`le.party_type = $${idx++}`); params.push(req.query.party_type); }
    if (req.query.settled !== undefined) { conditions.push(`le.settled = $${idx++}`); params.push(req.query.settled === 'true'); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT le.*,
              CASE
                WHEN le.party_type = 'PUJARI'      THEN pj.name
                WHEN le.party_type = 'ASTROLOGER'  THEN ast.name
              END AS party_name
         FROM ledger_entries le
         LEFT JOIN pujaris     pj  ON le.party_type = 'PUJARI'     AND pj.id  = le.party_id
         LEFT JOIN astrologers ast ON le.party_type = 'ASTROLOGER' AND ast.id = le.party_id
         ${where}
         ORDER BY le.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════════════════════════════════════
 *  6.  ALL BOOKINGS — single combined view.
 * ══════════════════════════════════════════════════════════════════════════ */

async function fetchAllBookings(query: Record<string, unknown>) {
  const allParams: unknown[] = [];
  let pi = 1;
  let pujaFilter = '', chadhavaFilter = '', apptFilter = '';
  if (query.from_date) {
    pujaFilter += ` AND pe.start_time >= $${pi}`;
    chadhavaFilter += ` AND ce.start_time >= $${pi}`;
    apptFilter += ` AND a.scheduled_at >= $${pi}`;
    allParams.push(query.from_date); pi++;
  }
  if (query.to_date) {
    pujaFilter += ` AND pe.start_time <= $${pi}`;
    chadhavaFilter += ` AND ce.start_time <= $${pi}`;
    apptFilter += ` AND a.scheduled_at <= $${pi}`;
    allParams.push(query.to_date); pi++;
  }
  const { rows } = await pool.query(
    `(
       SELECT 'PUJA' AS type, pb.id, pb.cost, pb.status::text, pb.created_at,
              d.name AS devotee_name, d.phone AS devotee_phone,
              p.name AS service_name, t.name AS temple_name,
              pe.start_time AS event_date,
              COALESCE(pb.sankalp, '') AS sankalp,
              (SELECT string_agg(pbd.name || COALESCE(' (' || NULLIF(pbd.gotra,'') || ')', ''), '; ' ORDER BY pbd.name)
                 FROM puja_booking_devotees pbd WHERE pbd.puja_booking_id = pb.id) AS sankalp_devotees,
              (SELECT pay.status::text FROM payments pay
                 WHERE pay.booking_type='PUJA' AND pay.booking_id = pb.id
                 ORDER BY pay.created_at DESC LIMIT 1) AS payment_status
         FROM puja_bookings pb
         JOIN puja_events pe ON pe.id = pb.puja_event_id
         JOIN pujas    p  ON p.id  = pe.puja_id
         JOIN temples  t  ON t.id  = p.temple_id
         JOIN devotees d  ON d.id  = pb.devotee_id
        WHERE 1=1 ${pujaFilter}
     )
     UNION ALL
     (
       SELECT 'CHADHAVA' AS type, cb.id, cb.cost, cb.status::text, cb.created_at,
              d.name AS devotee_name, d.phone AS devotee_phone,
              c.name AS service_name, t.name AS temple_name,
              ce.start_time AS event_date,
              COALESCE(cb.sankalp, '') AS sankalp,
              (SELECT string_agg(cbd.name || COALESCE(' (' || NULLIF(cbd.gotra,'') || ')', ''), '; ' ORDER BY cbd.name)
                 FROM chadhava_booking_devotees cbd WHERE cbd.chadhava_booking_id = cb.id) AS sankalp_devotees,
              (SELECT pay.status::text FROM payments pay
                 WHERE pay.booking_type='CHADHAVA' AND pay.booking_id = cb.id
                 ORDER BY pay.created_at DESC LIMIT 1) AS payment_status
         FROM chadhava_bookings cb
         JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id
         JOIN chadhavas    c  ON c.id  = ce.chadhava_id
         JOIN temples      t  ON t.id  = c.temple_id
         JOIN devotees     d  ON d.id  = cb.devotee_id
        WHERE 1=1 ${chadhavaFilter}
     )
     UNION ALL
     (
       SELECT 'APPOINTMENT' AS type, a.id, a.cost, a.status::text, a.created_at,
              d.name AS devotee_name, d.phone AS devotee_phone,
              ast.name AS service_name, NULL AS temple_name,
              a.scheduled_at AS event_date,
              '' AS sankalp,
              COALESCE(a.devotee_name, '') || COALESCE(' (' || NULLIF(a.devotee_gotra,'') || ')', '') AS sankalp_devotees,
              (SELECT pay.status::text FROM payments pay
                 WHERE pay.booking_type='APPOINTMENT' AND pay.booking_id = a.id
                 ORDER BY pay.created_at DESC LIMIT 1) AS payment_status
         FROM appointments a
         JOIN astrologers ast ON ast.id = a.astrologer_id
         JOIN devotees    d   ON d.id   = a.devotee_id
        WHERE 1=1 ${apptFilter}
     )
     ORDER BY event_date DESC NULLS LAST
     LIMIT 1000`,
    allParams,
  );
  return rows;
}

reportsRouter.get('/all-bookings', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let rows = await fetchAllBookings(req.query as Record<string, unknown>);

    // Optional client-side status filter (so the existing date-window logic
    // in fetchAllBookings keeps its single Postgres roundtrip).
    const statusFilter = String(req.query.status ?? '').toUpperCase();
    if (statusFilter) rows = rows.filter((r) => String(r.status).toUpperCase() === statusFilter);

    const data = rows.map((r) => ({
      id:               r.id,
      devoteeName:      r.devotee_name,
      phone:            r.devotee_phone ?? '',
      sankalpDevotees:  r.sankalp_devotees ?? '',
      sankalp:          r.sankalp ?? '',
      type:             r.type,
      service:          r.temple_name ? `${r.service_name} — ${r.temple_name}` : r.service_name,
      dateTime:         fmtDate(r.event_date),
      cost:             Number(r.cost),
      status:           r.status,
      paymentStatus:    r.payment_status ?? '',
    }));
    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'ID', key: 'id' },
        { header: 'Devotee Account', key: 'devoteeName', width: 22 },
        { header: 'Phone', key: 'phone', width: 14 },
        { header: 'Sankalp Devotees', key: 'sankalpDevotees', width: 36 },
        { header: 'Type', key: 'type', width: 12 },
        { header: 'Service', key: 'service', width: 40 },
        { header: 'Date & Time', key: 'dateTime', width: 22 },
        { header: 'Cost', key: 'cost' },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Payment', key: 'paymentStatus', width: 12 },
        { header: 'Sankalp', key: 'sankalp', width: 40 },
      ], 'All Bookings');
      return sendFile(res, buf, 'All Bookings Report.xlsx', MIME_XLSX);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════════════════════════════════════
 *  7.  SUMMARY — totals by booking variable.
 * ══════════════════════════════════════════════════════════════════════════ */

reportsRouter.get('/summary', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fromTo = dateRangeParams(req.query as Record<string, unknown>, 'created_at');
    const dateWhere = fromTo.conditions.length ? `WHERE ${fromTo.conditions.join(' AND ')}` : '';
    const dateParams = fromTo.params;

    // Status breakdown counted, but totalCost excludes CANCELLED (real revenue).
    const statusQuery = (table: string) => `
      SELECT
        COUNT(*)::int                                                                    AS cnt,
        COUNT(*) FILTER (WHERE status <> 'CANCELLED')::int                               AS active_cnt,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::int                                AS cancelled_cnt,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int                                AS completed_cnt,
        COALESCE(SUM(cost) FILTER (WHERE status <> 'CANCELLED'), 0)::numeric             AS revenue
      FROM ${table} ${dateWhere}`;

    const [pujas, chadhavas, appts] = await Promise.all([
      pool.query(statusQuery('puja_bookings'), dateParams),
      pool.query(statusQuery('chadhava_bookings'), dateParams),
      pool.query(statusQuery('appointments'), dateParams),
    ]);

    const mk = (variable: string, r: any) => ({
      variable,
      totalNumber: r.cnt,
      completed:   r.completed_cnt,
      cancelled:   r.cancelled_cnt,
      active:      r.active_cnt,
      totalCost:   Number(r.revenue),
    });

    const rows = [
      mk('PUJAS',        pujas.rows[0]),
      mk('CHADHAVAS',    chadhavas.rows[0]),
      mk('APPOINTMENTS', appts.rows[0]),
      {
        variable:    'TOTAL',
        totalNumber: pujas.rows[0].cnt + chadhavas.rows[0].cnt + appts.rows[0].cnt,
        completed:   pujas.rows[0].completed_cnt + chadhavas.rows[0].completed_cnt + appts.rows[0].completed_cnt,
        cancelled:   pujas.rows[0].cancelled_cnt + chadhavas.rows[0].cancelled_cnt + appts.rows[0].cancelled_cnt,
        active:      pujas.rows[0].active_cnt + chadhavas.rows[0].active_cnt + appts.rows[0].active_cnt,
        totalCost:   Number(pujas.rows[0].revenue) + Number(chadhavas.rows[0].revenue) + Number(appts.rows[0].revenue),
      },
    ];

    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(rows, [
        { header: 'Variable',     key: 'variable', width: 18 },
        { header: 'Total Number', key: 'totalNumber' },
        { header: 'Completed',    key: 'completed' },
        { header: 'Cancelled',    key: 'cancelled' },
        { header: 'Active',       key: 'active' },
        { header: 'Revenue (₹)',  key: 'totalCost' },
      ], 'Summary');
      return sendFile(res, buf, 'Summary Report.xlsx', MIME_XLSX);
    }

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════════════════════════════════════
 *  8.  TEMPLE-WISE — grouped by temple.
 * ══════════════════════════════════════════════════════════════════════════ */

reportsRouter.get('/temple-wise', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.name AS temple_name,
              COALESCE(pb_stats.puja_bookings, 0)::int     AS puja_bookings,
              COALESCE(pb_stats.puja_revenue,  0)::numeric AS puja_cost,
              COALESCE(cb_stats.chadhava_bookings, 0)::int     AS chadhavas_bookings,
              COALESCE(cb_stats.chadhava_revenue,  0)::numeric AS chadhava_cost
         FROM temples t
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS puja_bookings, COALESCE(SUM(pb.cost), 0) AS puja_revenue
             FROM puja_bookings pb
             JOIN puja_events pe ON pe.id = pb.puja_event_id
             JOIN pujas       p  ON p.id  = pe.puja_id
            WHERE p.temple_id = t.id AND pb.status <> 'CANCELLED'
         ) pb_stats ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS chadhava_bookings, COALESCE(SUM(cb.cost), 0) AS chadhava_revenue
             FROM chadhava_bookings cb
             JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id
             JOIN chadhavas       c  ON c.id  = ce.chadhava_id
            WHERE c.temple_id = t.id AND cb.status <> 'CANCELLED'
         ) cb_stats ON true
        WHERE t.is_active = true
        ORDER BY t.name`,
    );
    const data = rows.map((r) => ({
      temple:            r.temple_name,
      pujaBookings:      r.puja_bookings,
      pujaCost:          Number(r.puja_cost),
      chadhavasBookings: r.chadhavas_bookings,
      chadhavaCost:      Number(r.chadhava_cost),
    }));
    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'Temple', key: 'temple', width: 36 },
        { header: 'Puja Bookings', key: 'pujaBookings' },
        { header: 'Puja Cost', key: 'pujaCost' },
        { header: 'Chadhavas Bookings', key: 'chadhavasBookings' },
        { header: 'Chadhava Cost', key: 'chadhavaCost' },
      ], 'Temple Wise');
      return sendFile(res, buf, 'Temple Wise Report.xlsx', MIME_XLSX);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════════════════════════════════════
 *  9.  DEITY-WISE — grouped by deity (pujas + chadhavas).
 * ══════════════════════════════════════════════════════════════════════════ */

reportsRouter.get('/deity-wise', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT de.name AS deity_name,
              COALESCE(p_stats.puja_bookings, 0)::int     AS puja_bookings,
              COALESCE(p_stats.puja_revenue,  0)::numeric AS puja_cost,
              COALESCE(c_stats.chadhava_bookings, 0)::int     AS chadhavas_bookings,
              COALESCE(c_stats.chadhava_revenue,  0)::numeric AS chadhava_cost
         FROM deities de
         LEFT JOIN LATERAL (
           SELECT COUNT(pb.id) AS puja_bookings, COALESCE(SUM(pb.cost), 0) AS puja_revenue
             FROM pujas p
             JOIN puja_events  pe ON pe.puja_id = p.id
             JOIN puja_bookings pb ON pb.puja_event_id = pe.id AND pb.status <> 'CANCELLED'
            WHERE p.deity_id = de.id
         ) p_stats ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(cb.id) AS chadhava_bookings, COALESCE(SUM(cb.cost), 0) AS chadhava_revenue
             FROM chadhavas c
             JOIN chadhava_events  ce ON ce.chadhava_id = c.id
             JOIN chadhava_bookings cb ON cb.chadhava_event_id = ce.id AND cb.status <> 'CANCELLED'
            WHERE c.deity_id = de.id
         ) c_stats ON true
        ORDER BY de.name`,
    );
    const data = rows.map((r) => ({
      deity:             r.deity_name,
      pujaBookings:      r.puja_bookings,
      pujaCost:          Number(r.puja_cost),
      chadhavasBookings: r.chadhavas_bookings,
      chadhavaCost:      Number(r.chadhava_cost),
    }));
    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'Deity', key: 'deity', width: 24 },
        { header: 'Puja Bookings', key: 'pujaBookings' },
        { header: 'Puja Cost', key: 'pujaCost' },
        { header: 'Chadhavas Bookings', key: 'chadhavasBookings' },
        { header: 'Chadhava Cost', key: 'chadhavaCost' },
      ], 'Deity Wise');
      return sendFile(res, buf, 'Deity Wise Report.xlsx', MIME_XLSX);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════════════════════════════════════
 * 10.  DEVOTEE-WISE — per-devotee totals.
 * ══════════════════════════════════════════════════════════════════════════ */

reportsRouter.get('/devotee-wise', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT d.id, d.name AS devotee_name, d.phone AS devotee_phone,
              COALESCE(pb_stats.puja_count, 0)::int        AS pujas,
              COALESCE(cb_stats.chadhava_count, 0)::int    AS chadhavas,
              COALESCE(ap_stats.appt_count, 0)::int        AS appointments,
              (COALESCE(pb_stats.puja_count, 0) + COALESCE(cb_stats.chadhava_count, 0) + COALESCE(ap_stats.appt_count, 0))::int AS total_bookings,
              (COALESCE(pb_stats.puja_spent, 0) + COALESCE(cb_stats.chadhava_spent, 0) + COALESCE(ap_stats.appt_spent, 0))::numeric AS total_cost
         FROM devotees d
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS puja_count, COALESCE(SUM(cost), 0) AS puja_spent
             FROM puja_bookings WHERE devotee_id = d.id AND status <> 'CANCELLED'
         ) pb_stats ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS chadhava_count, COALESCE(SUM(cost), 0) AS chadhava_spent
             FROM chadhava_bookings WHERE devotee_id = d.id AND status <> 'CANCELLED'
         ) cb_stats ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS appt_count, COALESCE(SUM(cost), 0) AS appt_spent
             FROM appointments WHERE devotee_id = d.id AND status <> 'CANCELLED'
         ) ap_stats ON true
        WHERE d.is_active = true
        ORDER BY total_cost DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const data = rows.map((r) => ({
      id:            fmtShortId(r.id),
      name:          r.devotee_name,
      phone:         r.devotee_phone,
      pujas:         r.pujas,
      chadhavas:     r.chadhavas,
      appointments:  r.appointments,
      totalBookings: r.total_bookings,
      totalCost:     Number(r.total_cost),
    }));
    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name', width: 24 },
        { header: 'Phone', key: 'phone' },
        { header: 'Pujas', key: 'pujas' },
        { header: 'Chadhavas', key: 'chadhavas' },
        { header: 'Appointments', key: 'appointments' },
        { header: 'Total Bookings', key: 'totalBookings' },
        { header: 'Total Cost', key: 'totalCost' },
      ], 'Devotee Wise');
      return sendFile(res, buf, 'Devotee Wise Report.xlsx', MIME_XLSX);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════════════════════════════════════
 * 11.  PAYMENTS REPORT — every payment row joined to its booking + devotee.
 *      Essential once Razorpay is live: surfaces CREATED (abandoned),
 *      CAPTURED, FAILED, REFUNDED so reconciliation against Razorpay
 *      settlements is possible from the admin.
 * ══════════════════════════════════════════════════════════════════════════ */

reportsRouter.get('/payments', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conditions, params, idx: startIdx } = dateRangeParams(
      req.query as Record<string, unknown>,
      'p.created_at',
    );
    let idx = startIdx;
    if (req.query.status) { conditions.push(`p.status = $${idx++}`); params.push(req.query.status); }
    if (req.query.booking_type) { conditions.push(`p.booking_type = $${idx++}`); params.push(req.query.booking_type); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT p.id,
              p.booking_type,
              p.booking_id,
              p.amount,
              p.status,
              p.gateway,
              p.gateway_order_id,
              p.gateway_payment_id,
              p.created_at,
              p.captured_at,
              d.name  AS devotee_name,
              d.phone AS devotee_phone,
              CASE p.booking_type
                WHEN 'PUJA'        THEN (SELECT pj.name FROM puja_bookings pb JOIN puja_events pe ON pe.id = pb.puja_event_id JOIN pujas pj ON pj.id = pe.puja_id WHERE pb.id = p.booking_id)
                WHEN 'CHADHAVA'    THEN (SELECT ch.name FROM chadhava_bookings cb JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id JOIN chadhavas ch ON ch.id = ce.chadhava_id WHERE cb.id = p.booking_id)
                WHEN 'APPOINTMENT' THEN (SELECT ast.name FROM appointments a JOIN astrologers ast ON ast.id = a.astrologer_id WHERE a.id = p.booking_id)
              END AS service_name
         FROM payments p
         LEFT JOIN devotees d ON d.id = p.devotee_id
         ${where}
         ORDER BY p.created_at DESC
         LIMIT 2000`,
      params,
    );

    const data = rows.map((r) => ({
      id:               r.id,
      bookingType:      r.booking_type,
      bookingId:        r.booking_id,
      serviceName:      r.service_name ?? '—',
      devoteeName:      r.devotee_name ?? '—',
      phone:            r.devotee_phone ?? '',
      amount:           Number(r.amount),
      status:           r.status,
      gateway:          r.gateway ?? '',
      orderId:          r.gateway_order_id ?? '',
      isStub:           String(r.gateway_order_id ?? '').startsWith('order_stub_') ? 'Yes' : 'No',
      paymentId:        r.gateway_payment_id ?? '',
      createdAt:        fmtDate(r.created_at),
      capturedAt:       fmtDate(r.captured_at),
    }));

    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'Payment ID',   key: 'id', width: 38 },
        { header: 'Type',         key: 'bookingType', width: 12 },
        { header: 'Booking ID',   key: 'bookingId', width: 38 },
        { header: 'Service',      key: 'serviceName', width: 32 },
        { header: 'Devotee',      key: 'devoteeName', width: 22 },
        { header: 'Phone',        key: 'phone', width: 14 },
        { header: 'Amount (₹)',   key: 'amount' },
        { header: 'Status',       key: 'status', width: 14 },
        { header: 'Gateway',      key: 'gateway', width: 12 },
        { header: 'Order ID',     key: 'orderId', width: 28 },
        { header: 'Payment ID',   key: 'paymentId', width: 28 },
        { header: 'Stub Order?',  key: 'isStub' },
        { header: 'Created',      key: 'createdAt', width: 22 },
        { header: 'Captured',     key: 'capturedAt', width: 22 },
      ], 'Payments');
      return sendFile(res, buf, 'Payments Report.xlsx', MIME_XLSX);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════════════════════════════════════
 * 12.  CHADHAVA OFFERINGS (per booking) — fixes the "per event" aggregation
 *      blindspot. Shows one row per (booking, offering item): admin can see
 *      exactly who ordered which item and how many.
 * ══════════════════════════════════════════════════════════════════════════ */

reportsRouter.get('/chadhava-offerings-detail', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conditions, params, idx: startIdx } = dateRangeParams(
      req.query as Record<string, unknown>,
      'ce.start_time',
    );
    let idx = startIdx;
    if (req.query.temple_id) { conditions.push(`c.temple_id = $${idx++}`); params.push(req.query.temple_id); }
    if (req.query.chadhava_id) { conditions.push(`c.id = $${idx++}`); params.push(req.query.chadhava_id); }
    if (req.query.event_id) { conditions.push(`ce.id = $${idx++}`); params.push(req.query.event_id); }
    const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT cb.id::text   AS booking_id,
              ce.id::text   AS event_id,
              ce.start_time AS event_date,
              c.name        AS chadhava_name,
              t.name        AS temple_name,
              d.name        AS booked_by,
              d.phone       AS booked_by_phone,
              co.item_name  AS offering_item,
              cbo.quantity::int                       AS quantity,
              cbo.unit_price::numeric                 AS unit_price,
              (cbo.quantity * cbo.unit_price)::numeric AS line_total,
              (SELECT string_agg(cbd.name || COALESCE(' (' || NULLIF(cbd.gotra,'') || ')', ''), '; ' ORDER BY cbd.name)
                 FROM chadhava_booking_devotees cbd WHERE cbd.chadhava_booking_id = cb.id) AS sankalp_devotees
         FROM chadhava_booking_offerings cbo
         JOIN chadhava_bookings   cb ON cb.id = cbo.chadhava_booking_id AND cb.status <> 'CANCELLED'
         JOIN chadhava_events     ce ON ce.id = cb.chadhava_event_id
         JOIN chadhavas           c  ON c.id  = ce.chadhava_id
         JOIN temples             t  ON t.id  = c.temple_id
         JOIN devotees            d  ON d.id  = cb.devotee_id
         JOIN chadhava_offerings  co ON co.id = cbo.offering_id
        WHERE 1=1 ${where}
        ORDER BY ce.start_time DESC, cb.created_at ASC, co.item_name ASC
        LIMIT 5000`,
      params,
    );

    const data = rows.map((r) => ({
      bookingId:       r.booking_id,
      eventId:         r.event_id,
      eventDate:       fmtDate(r.event_date),
      chadhavaName:    r.chadhava_name,
      temple:          r.temple_name,
      bookedBy:        r.booked_by,
      phone:           r.booked_by_phone ?? '',
      sankalpDevotees: r.sankalp_devotees ?? '',
      offering:        r.offering_item,
      quantity:        r.quantity,
      unitPrice:       Number(r.unit_price),
      lineTotal:       Number(r.line_total),
    }));

    if (req.query.format === 'xlsx') {
      const buf = await buildExcel(data, [
        { header: 'Booking ID',       key: 'bookingId', width: 38 },
        { header: 'Event Date',       key: 'eventDate', width: 22 },
        { header: 'Chadhava',         key: 'chadhavaName', width: 30 },
        { header: 'Temple',           key: 'temple', width: 26 },
        { header: 'Booked By',        key: 'bookedBy', width: 20 },
        { header: 'Phone',            key: 'phone', width: 14 },
        { header: 'Sankalp Devotees', key: 'sankalpDevotees', width: 36 },
        { header: 'Offering',         key: 'offering', width: 24 },
        { header: 'Qty',              key: 'quantity' },
        { header: 'Unit Price (₹)',   key: 'unitPrice' },
        { header: 'Line Total (₹)',   key: 'lineTotal' },
      ], 'Chadhava Offerings Detail');
      return sendFile(res, buf, 'Chadhava Offerings Detail.xlsx', MIME_XLSX);
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
