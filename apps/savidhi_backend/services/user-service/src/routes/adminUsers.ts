import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import pool from '../lib/db';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const adminUsersRouter = Router();

// All admin-users routes require authentication + admin access
adminUsersRouter.use(requireAuth, requireAdmin());

// ─── Devotee management (admin) ──────────────────────────────────────────────

/**
 * GET /api/v1/users/devotees
 * List all devotees (paginated, searchable by name/phone).
 */
adminUsersRouter.get(
  '/devotees',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const search = (req.query.search as string) || '';

      let whereClause = '';
      const values: unknown[] = [];
      let paramIndex = 1;

      if (search) {
        whereClause = `WHERE (d.name ILIKE $${paramIndex} OR d.phone ILIKE $${paramIndex})`;
        values.push(`%${search}%`);
        paramIndex++;
      }

      const countQuery = `SELECT COUNT(*) AS total FROM devotees d ${whereClause}`;
      const dataQuery = `
        SELECT d.id, d.name, d.phone, d.gotra, d.image_url, d.level, d.gems,
               d.is_active, d.created_at, d.updated_at
        FROM devotees d
        ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, search ? [values[0]] : []),
        pool.query(dataQuery, values),
      ]);

      const total = Number(countResult.rows[0].total);

      res.json({
        success: true,
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/users/devotees/:id
 * Get devotee detail with booking summary.
 */
adminUsersRouter.get(
  '/devotees/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const devoteeResult = await pool.query(
        `SELECT id, name, phone, gotra, image_url, level, gems, is_active, created_at, updated_at
         FROM devotees WHERE id = $1`,
        [id],
      );

      if (devoteeResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Devotee not found' });
        return;
      }

      const devotee = devoteeResult.rows[0];

      // Booking summaries + flat bookings_list (last 50 of each type)
      const [pujaBookings, chadhavaBookings, appointments, achievements, bookingsList] = await Promise.all([
        pool.query(
          `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
             COALESCE(SUM(cost), 0) AS total_spent
           FROM puja_bookings WHERE devotee_id = $1`,
          [id],
        ),
        pool.query(
          `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
             COALESCE(SUM(cost), 0) AS total_spent
           FROM chadhava_bookings WHERE devotee_id = $1`,
          [id],
        ),
        pool.query(
          `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
             COALESCE(SUM(cost), 0) AS total_spent
           FROM appointments WHERE devotee_id = $1`,
          [id],
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM devotee_achievements WHERE devotee_id = $1`,
          [id],
        ),
        pool.query(
          `(
             SELECT pb.id::text AS id,
                    'PUJA'      AS type,
                    p.name      AS title,
                    t.name      AS subtitle,
                    pe.start_time AS scheduled_at,
                    pb.cost,
                    pb.status,
                    pb.created_at
             FROM puja_bookings pb
             JOIN puja_events pe ON pe.id = pb.puja_event_id
             JOIN pujas       p  ON p.id  = pe.puja_id
             LEFT JOIN temples t ON t.id  = p.temple_id
             WHERE pb.devotee_id = $1
           )
           UNION ALL
           (
             SELECT cb.id::text AS id,
                    'CHADHAVA'  AS type,
                    c.name      AS title,
                    t.name      AS subtitle,
                    ce.start_time AS scheduled_at,
                    cb.cost,
                    cb.status,
                    cb.created_at
             FROM chadhava_bookings cb
             JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id
             JOIN chadhavas       c  ON c.id  = ce.chadhava_id
             LEFT JOIN temples    t  ON t.id  = c.temple_id
             WHERE cb.devotee_id = $1
           )
           UNION ALL
           (
             SELECT a.id::text AS id,
                    'APPOINTMENT' AS type,
                    ast.name      AS title,
                    a.duration    AS subtitle,
                    a.scheduled_at,
                    a.cost,
                    a.status,
                    a.created_at
             FROM appointments a
             JOIN astrologers ast ON ast.id = a.astrologer_id
             WHERE a.devotee_id = $1
           )
           ORDER BY created_at DESC
           LIMIT 50`,
          [id],
        ),
      ]);

      const toSummary = (row: Record<string, string>) => ({
        total: Number(row.total),
        completed: Number(row.completed),
        total_spent: Number(row.total_spent),
      });

      const bookings_list = bookingsList.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        subtitle: row.subtitle ?? '',
        scheduled_at: row.scheduled_at,
        cost: Number(row.cost ?? 0),
        status: row.status,
      }));

      res.json({
        success: true,
        data: {
          ...devotee,
          achievements_unlocked: Number(achievements.rows[0].count),
          bookings: {
            puja: toSummary(pujaBookings.rows[0]),
            chadhava: toSummary(chadhavaBookings.rows[0]),
            appointment: toSummary(appointments.rows[0]),
          },
          bookings_list,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Admin user management ───────────────────────────────────────────────────

/**
 * GET /api/v1/users/admin-users
 * List admin users.
 */
adminUsersRouter.get(
  '/admin-users',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.include_inactive === 'true';
      const result = await pool.query(
        `SELECT id, email, name, role, is_active, created_at, updated_at
         FROM admin_users
         ${includeInactive ? '' : 'WHERE is_active = true'}
         ORDER BY created_at DESC`,
      );

      res.json({ success: true, data: result.rows });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/v1/users/admin-users
 * Create admin user (ADMIN role only).
 */
adminUsersRouter.post(
  '/admin-users',
  requireAdmin('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, password, role } = req.body;

      // Validation
      if (!email || !name || !password || !role) {
        res.status(400).json({
          success: false,
          message: 'email, name, password, and role are required',
        });
        return;
      }

      const validRoles = ['ADMIN', 'BOOKING_MANAGER', 'VIEW_ONLY'];
      if (!validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          message: `role must be one of: ${validRoles.join(', ')}`,
        });
        return;
      }

      // Check duplicate email
      const existing = await pool.query(
        `SELECT id FROM admin_users WHERE email = $1`,
        [email],
      );
      if (existing.rows.length > 0) {
        res.status(409).json({ success: false, message: 'Email already in use' });
        return;
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const result = await pool.query(
        `INSERT INTO admin_users (email, name, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, role, is_active, created_at, updated_at`,
        [email, name, passwordHash, role],
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/v1/users/admin-users/:id
 * Update admin user - ADMIN only.
 */
adminUsersRouter.patch(
  '/admin-users/:id',
  requireAdmin('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { email, name, password, role, is_active } = req.body;

      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (email !== undefined) {
        // Check duplicate
        const existing = await pool.query(
          `SELECT id FROM admin_users WHERE email = $1 AND id != $2`,
          [email, id],
        );
        if (existing.rows.length > 0) {
          res.status(409).json({ success: false, message: 'Email already in use' });
          return;
        }
        fields.push(`email = $${paramIndex++}`);
        values.push(email);
      }

      if (name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(name);
      }

      if (password !== undefined) {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        fields.push(`password_hash = $${paramIndex++}`);
        values.push(passwordHash);
      }

      if (role !== undefined) {
        const validRoles = ['ADMIN', 'BOOKING_MANAGER', 'VIEW_ONLY'];
        if (!validRoles.includes(role)) {
          res.status(400).json({
            success: false,
            message: `role must be one of: ${validRoles.join(', ')}`,
          });
          return;
        }
        fields.push(`role = $${paramIndex++}`);
        values.push(role);
      }

      if (is_active !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(!!is_active);
      }

      if (fields.length === 0) {
        res.status(400).json({ success: false, message: 'No fields to update' });
        return;
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE admin_users SET ${fields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, name, role, is_active, created_at, updated_at`,
        values,
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Admin user not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/v1/users/admin-users/:id
 * Hard-delete admin user - ADMIN only. Admin users have no booking/catalogue
 * dependencies, so this is always a real DELETE (with a 23503 safety net in
 * case future migrations add an FK).
 */
adminUsersRouter.delete(
  '/admin-users/:id',
  requireAdmin('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (req.user!.id === id) {
        res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        return;
      }

      const result = await pool.query(
        `DELETE FROM admin_users WHERE id = $1 RETURNING id`,
        [id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Admin user not found' });
        return;
      }

      res.json({ success: true, message: 'Admin user deleted' });
    } catch (err: any) {
      if (err?.code === '23503') {
        res.status(409).json({
          success: false,
          message: 'Cannot delete — admin user is referenced by other records. Use the status toggle to mark it inactive instead.',
        });
        return;
      }
      next(err);
    }
  },
);
