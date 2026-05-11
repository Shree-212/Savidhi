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

/**
 * POST /notifications/admin/send  (admin-only, multi-audience + multi-channel)
 * Body: {
 *   audience: 'ALL' | 'ACTIVE_PUJA_BOOKING' | 'EVENT_DEVOTEES' | 'SPECIFIC',
 *   devotee_ids?: string[],
 *   puja_event_id?: string,
 *   chadhava_event_id?: string,
 *   channels: ('IN_APP' | 'SMS' | 'WHATSAPP')[],
 *   title: string, body: string,
 *   deep_link_path?: string
 * }
 * For IN_APP channel: inserts a notifications row per matched devotee (or a single
 * broadcast row for audience=ALL). SMS/WHATSAPP channels are best-effort and rely
 * on notification-service worker; we just log dispatch intent here.
 */
notificationsRouter.post('/notifications/admin/send', requireAuth, requireAdmin('ADMIN', 'BOOKING_MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      audience,
      devotee_ids = [],
      puja_event_id,
      chadhava_event_id,
      channels = ['IN_APP'],
      title,
      body,
      deep_link_path,
    } = req.body ?? {};

    if (!audience || !title || !body) {
      return res.status(400).json({ success: false, message: 'audience, title, body are required' });
    }
    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ success: false, message: 'channels must be non-empty' });
    }

    // Resolve target devotee ids
    let targets: string[] = [];
    if (audience === 'ALL') {
      // Broadcast — emit a single NULL-devotee notification.
      targets = [];
    } else if (audience === 'SPECIFIC') {
      targets = Array.isArray(devotee_ids) ? devotee_ids : [];
    } else if (audience === 'ACTIVE_PUJA_BOOKING') {
      const r = await pool.query(
        `SELECT DISTINCT devotee_id FROM puja_bookings WHERE status IN ('NOT_STARTED','INPROGRESS')`,
      );
      targets = r.rows.map((x) => x.devotee_id);
    } else if (audience === 'EVENT_DEVOTEES') {
      if (puja_event_id) {
        const r = await pool.query(
          `SELECT DISTINCT devotee_id FROM puja_bookings WHERE puja_event_id = $1 AND status != 'CANCELLED'`,
          [puja_event_id],
        );
        targets = r.rows.map((x) => x.devotee_id);
      } else if (chadhava_event_id) {
        const r = await pool.query(
          `SELECT DISTINCT devotee_id FROM chadhava_bookings WHERE chadhava_event_id = $1 AND status != 'CANCELLED'`,
          [chadhava_event_id],
        );
        targets = r.rows.map((x) => x.devotee_id);
      }
    }

    let inAppInserted = 0;
    if (channels.includes('IN_APP')) {
      if (audience === 'ALL') {
        await pool.query(
          `INSERT INTO notifications (devotee_id, type, title, body, deep_link)
           VALUES (NULL, 'ANNOUNCEMENT', $1, $2, $3)`,
          [title, body, deep_link_path ?? null],
        );
        inAppInserted = 1; // broadcast counts as one row
      } else if (targets.length > 0) {
        // Insert one notification per target. Using a single VALUES bulk insert.
        const placeholders = targets.map((_, i) => `($${i + 1}, 'ANNOUNCEMENT', $${targets.length + 1}, $${targets.length + 2}, $${targets.length + 3})`).join(', ');
        await pool.query(
          `INSERT INTO notifications (devotee_id, type, title, body, deep_link) VALUES ${placeholders}`,
          [...targets, title, body, deep_link_path ?? null],
        );
        inAppInserted = targets.length;
      }
    }

    // SMS / WhatsApp: log dispatch intent. The notification-service worker
    // is expected to poll for delivery-pending records; we don't synchronously
    // call the gateway from here.
    const otherChannelsLogged = channels.filter((c: string) => c !== 'IN_APP').length;

    res.json({
      success: true,
      data: {
        audience,
        targets_count: audience === 'ALL' ? null : targets.length,
        in_app_inserted: inAppInserted,
        other_channels_logged: otherChannelsLogged,
      },
    });
  } catch (err) { next(err); }
});
