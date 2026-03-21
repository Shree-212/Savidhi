import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAdmin } from '../middleware/auth';

export const reportsRouter = Router();

// ─── Helper: date-range + pagination conditions ──────────────────────────────
function dateRangeParams(query: Record<string, unknown>, dateCol: string) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (query.from_date) { conditions.push(`${dateCol} >= $${idx++}`); params.push(query.from_date); }
  if (query.to_date) { conditions.push(`${dateCol} <= $${idx++}`); params.push(query.to_date); }

  return { conditions, params, idx };
}

/** GET /puja-sankalp – puja bookings with sankalp details */
reportsRouter.get('/puja-sankalp', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conditions, params, idx: startIdx } = dateRangeParams(req.query as Record<string, unknown>, 'pe.start_time');
    let idx = startIdx;

    if (req.query.temple_id) {
      conditions.push(`p.temple_id = $${idx++}`);
      params.push(req.query.temple_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT pb.id, pb.sankalp, pb.cost, pb.status, pb.payment_status, pb.created_at,
              d.name AS devotee_name, d.phone AS devotee_phone,
              p.name AS puja_name, t.name AS temple_name,
              pe.start_time AS event_date
       FROM puja_bookings pb
       JOIN puja_events pe ON pe.id = pb.puja_event_id
       JOIN pujas p        ON p.id  = pe.puja_id
       JOIN temples t      ON t.id  = p.temple_id
       JOIN devotees d     ON d.id  = pb.devotee_id
       ${where}
       ORDER BY pe.start_time DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/** GET /chadhava-sankalp – chadhava bookings with sankalp */
reportsRouter.get('/chadhava-sankalp', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conditions, params, idx: startIdx } = dateRangeParams(req.query as Record<string, unknown>, 'ce.start_time');
    let idx = startIdx;

    if (req.query.temple_id) {
      conditions.push(`c.temple_id = $${idx++}`);
      params.push(req.query.temple_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT cb.id, cb.sankalp, cb.cost, cb.status, cb.payment_status, cb.created_at,
              d.name AS devotee_name, d.phone AS devotee_phone,
              c.name AS chadhava_name, t.name AS temple_name,
              ce.start_time AS event_date
       FROM chadhava_bookings cb
       JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id
       JOIN chadhavas c        ON c.id  = ce.chadhava_id
       JOIN temples t          ON t.id  = c.temple_id
       JOIN devotees d         ON d.id  = cb.devotee_id
       ${where}
       ORDER BY ce.start_time DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/** GET /chadhava-offerings – aggregated offerings with quantities */
reportsRouter.get('/chadhava-offerings', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conditions, params, idx: startIdx } = dateRangeParams(req.query as Record<string, unknown>, 'ce.start_time');
    let idx = startIdx;

    if (req.query.temple_id) {
      conditions.push(`c.temple_id = $${idx++}`);
      params.push(req.query.temple_id);
    }

    // Only count non-cancelled bookings
    conditions.push(`cb.status != 'CANCELLED'`);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT co.id AS offering_id,
              co.item_name,
              co.price AS unit_price,
              SUM(cbo.quantity)::int AS total_quantity,
              SUM(cbo.quantity * cbo.unit_price)::numeric AS total_value
       FROM chadhava_booking_offerings cbo
       JOIN chadhava_offerings co ON co.id = cbo.offering_id
       JOIN chadhava_bookings cb  ON cb.id = cbo.chadhava_booking_id
       JOIN chadhava_events ce    ON ce.id = cb.chadhava_event_id
       JOIN chadhavas c           ON c.id  = ce.chadhava_id
       ${where}
       GROUP BY co.id, co.item_name, co.price
       ORDER BY total_quantity DESC`,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/** GET /appointments – appointment report */
reportsRouter.get('/appointments', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conditions, params, idx: startIdx } = dateRangeParams(req.query as Record<string, unknown>, 'a.scheduled_at');
    let idx = startIdx;

    if (req.query.status) {
      conditions.push(`a.status = $${idx++}`);
      params.push(req.query.status);
    }
    if (req.query.astrologer_id) {
      conditions.push(`a.astrologer_id = $${idx++}`);
      params.push(req.query.astrologer_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT a.*,
              ast.name AS astrologer_name,
              d.name AS devotee_display_name,
              d.phone AS devotee_phone
       FROM appointments a
       JOIN astrologers ast ON ast.id = a.astrologer_id
       JOIN devotees d      ON d.id  = a.devotee_id
       ${where}
       ORDER BY a.scheduled_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/** GET /ledger – ledger entries with party name, type, fee, settled status */
reportsRouter.get('/ledger', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conditions, params, idx: startIdx } = dateRangeParams(req.query as Record<string, unknown>, 'le.created_at');
    let idx = startIdx;

    if (req.query.party_type) {
      conditions.push(`le.party_type = $${idx++}`);
      params.push(req.query.party_type);
    }
    if (req.query.settled !== undefined) {
      conditions.push(`le.settled = $${idx++}`);
      params.push(req.query.settled === 'true');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT le.*,
              CASE
                WHEN le.party_type = 'PUJARI'     THEN pj.name
                WHEN le.party_type = 'ASTROLOGER'  THEN ast.name
              END AS party_name
       FROM ledger_entries le
       LEFT JOIN pujaris pj     ON le.party_type = 'PUJARI'     AND pj.id  = le.party_id
       LEFT JOIN astrologers ast ON le.party_type = 'ASTROLOGER' AND ast.id = le.party_id
       ${where}
       ORDER BY le.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/** GET /all-bookings – combined view of all booking types */
reportsRouter.get('/all-bookings', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from_date, to_date, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const dateConditions: string[] = [];
    const dateParams: unknown[] = [];
    let paramIdx = 1;

    if (from_date) { dateConditions.push(paramIdx); dateParams.push(from_date); paramIdx++; }
    if (to_date) { dateConditions.push(paramIdx); dateParams.push(to_date); paramIdx++; }

    // Build optional date filters for each sub-query
    let pujaDateFilter = '';
    let chadhavaDateFilter = '';
    let apptDateFilter = '';
    const allParams: unknown[] = [];
    let pi = 1;

    if (from_date) {
      pujaDateFilter += ` AND pe.start_time >= $${pi}`;
      chadhavaDateFilter += ` AND ce.start_time >= $${pi}`;
      apptDateFilter += ` AND a.scheduled_at >= $${pi}`;
      allParams.push(from_date);
      pi++;
    }
    if (to_date) {
      pujaDateFilter += ` AND pe.start_time <= $${pi}`;
      chadhavaDateFilter += ` AND ce.start_time <= $${pi}`;
      apptDateFilter += ` AND a.scheduled_at <= $${pi}`;
      allParams.push(to_date);
      pi++;
    }

    const { rows } = await pool.query(
      `(
        SELECT 'PUJA' AS booking_type, pb.id, pb.cost, pb.status, pb.payment_status,
               pb.created_at, d.name AS devotee_name, p.name AS service_name, t.name AS temple_name,
               pe.start_time AS event_date
        FROM puja_bookings pb
        JOIN puja_events pe ON pe.id = pb.puja_event_id
        JOIN pujas p        ON p.id  = pe.puja_id
        JOIN temples t      ON t.id  = p.temple_id
        JOIN devotees d     ON d.id  = pb.devotee_id
        WHERE 1=1 ${pujaDateFilter}
      )
      UNION ALL
      (
        SELECT 'CHADHAVA' AS booking_type, cb.id, cb.cost, cb.status, cb.payment_status,
               cb.created_at, d.name AS devotee_name, c.name AS service_name, t.name AS temple_name,
               ce.start_time AS event_date
        FROM chadhava_bookings cb
        JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id
        JOIN chadhavas c        ON c.id  = ce.chadhava_id
        JOIN temples t          ON t.id  = c.temple_id
        JOIN devotees d         ON d.id  = cb.devotee_id
        WHERE 1=1 ${chadhavaDateFilter}
      )
      UNION ALL
      (
        SELECT 'APPOINTMENT' AS booking_type, a.id, a.cost, a.status, a.payment_status,
               a.created_at, d.name AS devotee_name, ast.name AS service_name, NULL AS temple_name,
               a.scheduled_at AS event_date
        FROM appointments a
        JOIN astrologers ast ON ast.id = a.astrologer_id
        JOIN devotees d      ON d.id  = a.devotee_id
        WHERE 1=1 ${apptDateFilter}
      )
      ORDER BY created_at DESC
      LIMIT $${pi++} OFFSET $${pi++}`,
      [...allParams, limitNum, offset],
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/** GET /summary – financial summary */
reportsRouter.get('/summary', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalRevenue, revenueByType, settledVsUnsettled] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments WHERE status = 'CAPTURED'`),
      pool.query(
        `SELECT booking_type, COALESCE(SUM(amount), 0)::numeric AS total
         FROM payments WHERE status = 'CAPTURED'
         GROUP BY booking_type`,
      ),
      pool.query(
        `SELECT settled,
                COUNT(*)::int AS count,
                COALESCE(SUM(fee), 0)::numeric AS total
         FROM ledger_entries
         GROUP BY settled`,
      ),
    ]);

    const byType: Record<string, number> = {};
    for (const row of revenueByType.rows) {
      byType[row.booking_type] = Number(row.total);
    }

    const settled: Record<string, { count: number; total: number }> = {};
    for (const row of settledVsUnsettled.rows) {
      settled[row.settled ? 'settled' : 'unsettled'] = { count: row.count, total: Number(row.total) };
    }

    res.json({
      success: true,
      data: {
        total_revenue: Number(totalRevenue.rows[0].total),
        revenue_by_type: byType,
        ledger: settled,
      },
    });
  } catch (err) { next(err); }
});

/** GET /temple-wise – bookings grouped by temple */
reportsRouter.get('/temple-wise', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id AS temple_id, t.name AS temple_name,
              COALESCE(pb_stats.puja_bookings, 0)::int AS puja_bookings,
              COALESCE(cb_stats.chadhava_bookings, 0)::int AS chadhava_bookings,
              COALESCE(pb_stats.puja_revenue, 0)::numeric AS puja_revenue,
              COALESCE(cb_stats.chadhava_revenue, 0)::numeric AS chadhava_revenue
       FROM temples t
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS puja_bookings, COALESCE(SUM(pb.cost), 0) AS puja_revenue
         FROM puja_bookings pb
         JOIN puja_events pe ON pe.id = pb.puja_event_id
         JOIN pujas p        ON p.id  = pe.puja_id
         WHERE p.temple_id = t.id AND pb.status != 'CANCELLED'
       ) pb_stats ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS chadhava_bookings, COALESCE(SUM(cb.cost), 0) AS chadhava_revenue
         FROM chadhava_bookings cb
         JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id
         JOIN chadhavas c        ON c.id  = ce.chadhava_id
         WHERE c.temple_id = t.id AND cb.status != 'CANCELLED'
       ) cb_stats ON true
       WHERE t.is_active = true
       ORDER BY t.name`,
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/** GET /deity-wise – bookings grouped by deity */
reportsRouter.get('/deity-wise', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT de.id AS deity_id, de.name AS deity_name,
              COUNT(pb.id)::int AS total_bookings,
              COALESCE(SUM(pb.cost), 0)::numeric AS total_revenue
       FROM deities de
       JOIN pujas p         ON p.deity_id = de.id
       JOIN puja_events pe  ON pe.puja_id = p.id
       JOIN puja_bookings pb ON pb.puja_event_id = pe.id AND pb.status != 'CANCELLED'
       GROUP BY de.id, de.name
       ORDER BY total_bookings DESC`,
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/** GET /devotee-wise – bookings grouped by devotee */
reportsRouter.get('/devotee-wise', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT d.id AS devotee_id, d.name AS devotee_name, d.phone AS devotee_phone,
              COALESCE(pb_stats.puja_count, 0)::int AS puja_bookings,
              COALESCE(cb_stats.chadhava_count, 0)::int AS chadhava_bookings,
              COALESCE(ap_stats.appt_count, 0)::int AS appointments,
              (COALESCE(pb_stats.puja_spent, 0) + COALESCE(cb_stats.chadhava_spent, 0) + COALESCE(ap_stats.appt_spent, 0))::numeric AS total_spent
       FROM devotees d
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS puja_count, COALESCE(SUM(cost), 0) AS puja_spent
         FROM puja_bookings WHERE devotee_id = d.id AND status != 'CANCELLED'
       ) pb_stats ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS chadhava_count, COALESCE(SUM(cost), 0) AS chadhava_spent
         FROM chadhava_bookings WHERE devotee_id = d.id AND status != 'CANCELLED'
       ) cb_stats ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS appt_count, COALESCE(SUM(cost), 0) AS appt_spent
         FROM appointments WHERE devotee_id = d.id AND status != 'CANCELLED'
       ) ap_stats ON true
       WHERE d.is_active = true
       ORDER BY total_spent DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});
