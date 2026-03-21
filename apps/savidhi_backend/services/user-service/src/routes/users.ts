import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireDevotee } from '../middleware/auth';

export const usersRouter = Router();

// ─── Devotee self-service endpoints ──────────────────────────────────────────

/**
 * GET /api/v1/users/me
 * Get current devotee profile with achievements, gems, and booking counts.
 */
usersRouter.get(
  '/me',
  requireAuth,
  requireDevotee,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devoteeId = req.user!.id;

      // Fetch devotee profile
      const devoteeResult = await pool.query(
        `SELECT id, name, phone, gotra, image_url, level, gems, is_active, created_at, updated_at
         FROM devotees WHERE id = $1 AND is_active = true`,
        [devoteeId],
      );

      if (devoteeResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Devotee not found' });
        return;
      }

      const devotee = devoteeResult.rows[0];

      // Fetch achievements count
      const achievementsResult = await pool.query(
        `SELECT COUNT(*) AS unlocked_count FROM devotee_achievements WHERE devotee_id = $1`,
        [devoteeId],
      );

      // Fetch booking counts in parallel
      const [pujaBookings, chadhavaBookings, appointments] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS count FROM puja_bookings WHERE devotee_id = $1`,
          [devoteeId],
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM chadhava_bookings WHERE devotee_id = $1`,
          [devoteeId],
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM appointments WHERE devotee_id = $1`,
          [devoteeId],
        ),
      ]);

      res.json({
        success: true,
        data: {
          ...devotee,
          achievements_unlocked: Number(achievementsResult.rows[0].unlocked_count),
          bookings: {
            puja: Number(pujaBookings.rows[0].count),
            chadhava: Number(chadhavaBookings.rows[0].count),
            appointment: Number(appointments.rows[0].count),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/v1/users/me
 * Update devotee profile (name, gotra, image_url).
 */
usersRouter.patch(
  '/me',
  requireAuth,
  requireDevotee,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devoteeId = req.user!.id;
      const { name, gotra, image_url } = req.body;

      // Build dynamic SET clause
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (gotra !== undefined) {
        fields.push(`gotra = $${paramIndex++}`);
        values.push(gotra);
      }
      if (image_url !== undefined) {
        fields.push(`image_url = $${paramIndex++}`);
        values.push(image_url);
      }

      if (fields.length === 0) {
        res.status(400).json({ success: false, message: 'No fields to update' });
        return;
      }

      fields.push(`updated_at = NOW()`);
      values.push(devoteeId);

      const result = await pool.query(
        `UPDATE devotees SET ${fields.join(', ')} WHERE id = $${paramIndex} AND is_active = true
         RETURNING id, name, phone, gotra, image_url, level, gems, is_active, created_at, updated_at`,
        values,
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Devotee not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/users/me/gems
 * Get gems balance and transaction history.
 */
usersRouter.get(
  '/me/gems',
  requireAuth,
  requireDevotee,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devoteeId = req.user!.id;

      // Current balance
      const balanceResult = await pool.query(
        `SELECT gems FROM devotees WHERE id = $1 AND is_active = true`,
        [devoteeId],
      );

      if (balanceResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Devotee not found' });
        return;
      }

      // Transaction history (most recent first)
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const [transactions, countResult] = await Promise.all([
        pool.query(
          `SELECT id, amount, reason, reference_id, created_at
           FROM gems_transactions
           WHERE devotee_id = $1
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`,
          [devoteeId, limit, offset],
        ),
        pool.query(
          `SELECT COUNT(*) AS total FROM gems_transactions WHERE devotee_id = $1`,
          [devoteeId],
        ),
      ]);

      res.json({
        success: true,
        data: {
          balance: balanceResult.rows[0].gems,
          transactions: transactions.rows,
          pagination: {
            page,
            limit,
            total: Number(countResult.rows[0].total),
            totalPages: Math.ceil(Number(countResult.rows[0].total) / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/users/me/achievements
 * Get all achievements with unlocked status for the current devotee.
 */
usersRouter.get(
  '/me/achievements',
  requireAuth,
  requireDevotee,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devoteeId = req.user!.id;

      const result = await pool.query(
        `SELECT
           a.id, a.name, a.description, a.image_url,
           a.criteria_type, a.criteria_value, a.gems_reward,
           da.unlocked_at,
           CASE WHEN da.devotee_id IS NOT NULL THEN true ELSE false END AS unlocked
         FROM achievements a
         LEFT JOIN devotee_achievements da
           ON da.achievement_id = a.id AND da.devotee_id = $1
         ORDER BY a.created_at ASC`,
        [devoteeId],
      );

      res.json({ success: true, data: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/users/me/bookings
 * Summary counts of all booking types for the current devotee.
 */
usersRouter.get(
  '/me/bookings',
  requireAuth,
  requireDevotee,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const devoteeId = req.user!.id;

      const [puja, chadhava, appointment] = await Promise.all([
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'NOT_STARTED') AS upcoming,
             COUNT(*) FILTER (WHERE status = 'INPROGRESS') AS in_progress,
             COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
             COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
             COUNT(*) AS total
           FROM puja_bookings WHERE devotee_id = $1`,
          [devoteeId],
        ),
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'NOT_STARTED') AS upcoming,
             COUNT(*) FILTER (WHERE status = 'INPROGRESS') AS in_progress,
             COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
             COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
             COUNT(*) AS total
           FROM chadhava_bookings WHERE devotee_id = $1`,
          [devoteeId],
        ),
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'LINK_YET_TO_BE_GENERATED') AS upcoming,
             COUNT(*) FILTER (WHERE status = 'INPROGRESS') AS in_progress,
             COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
             COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
             COUNT(*) AS total
           FROM appointments WHERE devotee_id = $1`,
          [devoteeId],
        ),
      ]);

      const toNumbers = (row: Record<string, string>) => ({
        upcoming: Number(row.upcoming),
        in_progress: Number(row.in_progress),
        completed: Number(row.completed),
        cancelled: Number(row.cancelled),
        total: Number(row.total),
      });

      res.json({
        success: true,
        data: {
          puja: toNumbers(puja.rows[0]),
          chadhava: toNumbers(chadhava.rows[0]),
          appointment: toNumbers(appointment.rows[0]),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
