import { Router, Request, Response, NextFunction } from 'express';
import pool from '../lib/db';
import { requireAuth, requireDevotee } from '../middleware/auth';

export const familyRouter = Router();

/**
 * GET /me/family
 * Returns { accepted: [...], sent: [...], received: [...] } for the current devotee.
 *   - accepted: either direction, status=ACCEPTED
 *   - sent: outgoing PENDING (devotee_id = me)
 *   - received: incoming PENDING (linked_devotee_id = me)
 */
familyRouter.get('/me/family', requireAuth, requireDevotee, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = req.headers['x-user-id'] as string;
    const { rows } = await pool.query(
      `SELECT fm.*,
              d_inv.name   AS inviter_name,  d_inv.phone   AS inviter_phone,  d_inv.image_url  AS inviter_image,
              d_link.name  AS linked_name,   d_link.phone  AS linked_phone,   d_link.image_url AS linked_image
       FROM family_members fm
       JOIN devotees d_inv  ON d_inv.id  = fm.devotee_id
       JOIN devotees d_link ON d_link.id = fm.linked_devotee_id
       WHERE fm.devotee_id = $1 OR fm.linked_devotee_id = $1
       ORDER BY fm.created_at DESC`,
      [me],
    );

    const accepted: any[] = [];
    const sent: any[] = [];
    const received: any[] = [];

    for (const r of rows) {
      const iAmInviter = r.devotee_id === me;
      const other = iAmInviter
        ? { id: r.linked_devotee_id, name: r.linked_name, phone: r.linked_phone, image_url: r.linked_image }
        : { id: r.devotee_id, name: r.inviter_name, phone: r.inviter_phone, image_url: r.inviter_image };
      const entry = {
        id: r.id,
        relation: r.relation,
        status: r.status,
        other,
        direction: iAmInviter ? 'outgoing' : 'incoming',
        created_at: r.created_at,
      };
      if (r.status === 'ACCEPTED') accepted.push(entry);
      else if (r.status === 'PENDING' && iAmInviter) sent.push(entry);
      else if (r.status === 'PENDING' && !iAmInviter) received.push(entry);
    }

    res.json({ success: true, data: { accepted, sent, received } });
  } catch (err) { next(err); }
});

/**
 * POST /me/family
 * Invite a phone number to become a family member.
 * Body: { phone: string, relation: string }
 * Creates the devotee if they don't exist yet (with a placeholder name).
 */
familyRouter.post('/me/family', requireAuth, requireDevotee, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const me = req.headers['x-user-id'] as string;
    const { phone, relation } = req.body ?? {};
    if (!phone || !relation) {
      return res.status(400).json({ success: false, message: 'phone and relation are required' });
    }
    if (!/^\d{10}$/.test(String(phone))) {
      return res.status(400).json({ success: false, message: 'phone must be a 10-digit number' });
    }

    await client.query('BEGIN');

    // Find or create the invitee devotee
    let invitee = (await client.query('SELECT id, name, phone FROM devotees WHERE phone = $1', [phone])).rows[0];
    if (!invitee) {
      invitee = (await client.query(
        'INSERT INTO devotees (name, phone) VALUES ($1, $2) RETURNING id, name, phone',
        [`Devotee_${String(phone).slice(-4)}`, phone],
      )).rows[0];
    }

    if (invitee.id === me) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'You cannot link to yourself' });
    }

    // Upsert family row
    const existing = await client.query(
      `SELECT * FROM family_members WHERE devotee_id = $1 AND linked_devotee_id = $2`,
      [me, invitee.id],
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Already invited (status: ' + existing.rows[0].status + ')' });
    }

    const { rows } = await client.query(
      `INSERT INTO family_members (devotee_id, linked_devotee_id, relation)
       VALUES ($1, $2, $3) RETURNING *`,
      [me, invitee.id, relation],
    );

    // Insert notification for the invitee
    await client.query(
      `INSERT INTO notifications (devotee_id, type, title, body, deep_link, metadata)
       VALUES ($1, 'FAMILY_REQUEST', 'New family request',
               'Someone invited you as ' || $2 || '. Tap to review.',
               'savidhi://profile/family/received',
               jsonb_build_object('family_id', $3::text, 'from_devotee_id', $4::text))`,
      [invitee.id, relation, rows[0].id, me],
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * PATCH /me/family/:id/accept
 * The invitee accepts a PENDING request.
 */
familyRouter.patch('/me/family/:id/accept', requireAuth, requireDevotee, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const existing = await pool.query(
      `SELECT * FROM family_members WHERE id = $1 AND linked_devotee_id = $2 AND status = 'PENDING'`,
      [id, me],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pending family request not found' });
    }
    const { rows } = await pool.query(
      `UPDATE family_members SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/**
 * PATCH /me/family/:id/reject
 * The invitee rejects.
 */
familyRouter.patch('/me/family/:id/reject', requireAuth, requireDevotee, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const existing = await pool.query(
      `SELECT * FROM family_members WHERE id = $1 AND linked_devotee_id = $2 AND status = 'PENDING'`,
      [id, me],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pending family request not found' });
    }
    const { rows } = await pool.query(
      `UPDATE family_members SET status = 'REJECTED', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/**
 * DELETE /me/family/:id
 * Either party can remove the link.
 */
familyRouter.delete('/me/family/:id', requireAuth, requireDevotee, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { rowCount } = await pool.query(
      `DELETE FROM family_members WHERE id = $1 AND (devotee_id = $2 OR linked_devotee_id = $2)`,
      [id, me],
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'Family link not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});
