import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAdmin } from '../middleware/auth';

export const dashboardRouter = Router();

/** GET /stats – aggregated dashboard stats */
dashboardRouter.get('/stats', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      pujasCount,
      chadhavasCount,
      appointmentsCount,
      devoteesCount,
      pujaBookingsByStatus,
      chadhavaBookingsCount,
      revenueTotal,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM pujas WHERE is_active = true`),
      pool.query(`SELECT COUNT(*)::int AS count FROM chadhavas WHERE is_active = true`),
      pool.query(`SELECT COUNT(*)::int AS count FROM appointments`),
      pool.query(`SELECT COUNT(*)::int AS count FROM devotees WHERE is_active = true`),
      pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM puja_bookings
         GROUP BY status`,
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM chadhava_bookings WHERE status != 'CANCELLED'`),
      pool.query(`SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments WHERE status = 'CAPTURED'`),
    ]);

    // Build puja bookings by status map
    const pujaBookingsMap: Record<string, number> = {};
    for (const row of pujaBookingsByStatus.rows) {
      pujaBookingsMap[row.status] = row.count;
    }

    res.json({
      success: true,
      data: {
        total_pujas: pujasCount.rows[0].count,
        total_chadhavas: chadhavasCount.rows[0].count,
        total_appointments_booked: appointmentsCount.rows[0].count,
        total_devotees: devoteesCount.rows[0].count,
        puja_bookings_count: pujaBookingsMap,
        chadhava_bookings_count: chadhavaBookingsCount.rows[0].count,
        revenue_total: Number(revenueTotal.rows[0].total),
      },
    });
  } catch (err) { next(err); }
});
