import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireDevotee, requireAdmin } from '../middleware/auth';

export const notificationsRouter = Router();

/**
 * GET /me/notifications?unread=true&limit=50
 * Returns notifications for the current devotee + any broadcast rows.
 */
notificationsRouter.get('/me/notifications', requireAuth, requireDevotee, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = req.headers['x-user-id'] as string;
    const { unread, limit = '50' } = req.query;
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    const conditions: string[] = ['(devotee_id = $1 OR devotee_id IS NULL)'];
    const params: unknown[] = [me];
    if (unread === 'true') conditions.push('read = false');

    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, limitNum],
    );

    const unreadCount = (await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM notifications
       WHERE (devotee_id = $1 OR devotee_id IS NULL) AND read = false`,
      [me],
    )).rows[0].cnt;

    res.json({ success: true, data: rows, meta: { unread: unreadCount } });
  } catch (err) { next(err); }
});

/** PATCH /me/notifications/:id/read – mark single notification read. */
notificationsRouter.patch('/me/notifications/:id/read', requireAuth, requireDevotee, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE notifications SET read = true
       WHERE id = $1 AND (devotee_id = $2 OR devotee_id IS NULL)
       RETURNING *`,
      [id, me],
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /me/notifications/read-all – mark all read. */
notificationsRouter.patch('/me/notifications/read-all', requireAuth, requireDevotee, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = req.headers['x-user-id'] as string;
    const { rowCount } = await pool.query(
      `UPDATE notifications SET read = true
       WHERE (devotee_id = $1 OR devotee_id IS NULL) AND read = false`,
      [me],
    );
    res.json({ success: true, data: { updated: rowCount } });
  } catch (err) { next(err); }
});

/**
 * POST /notifications  (admin-only)
 * Body: { devotee_id?, type, title, body, deep_link?, metadata? }
 * If devotee_id is omitted the notification is a broadcast (visible to everyone).
 */
notificationsRouter.post('/notifications', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { devotee_id, type, title, body, deep_link, metadata } = req.body ?? {};
    if (!type || !title || !body) {
      return res.status(400).json({ success: false, message: 'type, title, body are required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO notifications (devotee_id, type, title, body, deep_link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [devotee_id ?? null, type, title, body, deep_link ?? null, JSON.stringify(metadata ?? {})],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});
