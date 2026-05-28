import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAdmin, requireAuth } from '../middleware/auth';
import {
  shiprocketConfigured,
  createOrder as srCreateOrder,
  assignAwb as srAssignAwb,
  generatePickup as srGeneratePickup,
  trackByAwb as srTrackByAwb,
  mapShiprocketStatus,
} from '../lib/shiprocket';

export const pujaEventsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown) => typeof v === 'string' && UUID_RE.test(v);

// ─── Allowed stage transitions & side-effects ────────────────────────────────
// Live link is OPTIONAL — admin can advance to LIVE_ADDED with or without one.
const STAGE_TRANSITIONS: Record<string, { next: string; requiredField?: string; statusUpdate?: string }> = {
  YET_TO_START:          { next: 'LIVE_ADDED',                                                  statusUpdate: 'INPROGRESS' },
  LIVE_ADDED:            { next: 'SHORT_VIDEO_ADDED',     requiredField: 'short_video_url' },
  SHORT_VIDEO_ADDED:     { next: 'SANKALP_VIDEO_ADDED',   requiredField: 'sankalp_video_url' },
  SANKALP_VIDEO_ADDED:   { next: 'TO_BE_SHIPPED' },
  TO_BE_SHIPPED:         { next: 'SHIPPED',               statusUpdate: 'COMPLETED' },
};

/** GET / – list puja events. Admins see all; devotees see future non-cancelled events. */
pujaEventsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, puja_id, pujari_id, from_date, to_date, upcoming, search, page = '1', limit = '20' } = req.query;
    const role = req.headers['x-user-role'] as string;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Devotees can only see events they can still book (future, not completed or cancelled)
    if (role === 'DEVOTEE') {
      conditions.push(`pe.status NOT IN ('COMPLETED', 'CANCELLED')`);
      conditions.push(`pe.start_time >= NOW() - INTERVAL '1 day'`);
    }

    if (status) { conditions.push(`pe.status = $${idx++}`); params.push(status); }
    if (puja_id) {
      // Accept either a UUID directly, or a slug (resolve via subquery on pujas.slug)
      if (isUuid(puja_id)) {
        conditions.push(`pe.puja_id = $${idx++}`);
        params.push(puja_id);
      } else {
        conditions.push(`pe.puja_id = (SELECT id FROM pujas WHERE slug = $${idx++})`);
        params.push(puja_id);
      }
    }
    if (pujari_id && isUuid(pujari_id)) {
      conditions.push(`pe.pujari_id = $${idx++}`);
      params.push(pujari_id);
    }
    if (from_date) { conditions.push(`pe.start_time >= $${idx++}`); params.push(from_date); }
    // INCLUSIVE to_date — see reports.ts dateRangeParams for rationale.
    if (to_date) { conditions.push(`pe.start_time < ($${idx++}::date + INTERVAL '1 day')`); params.push(to_date); }
    if (upcoming === 'true') { conditions.push(`pe.start_time >= NOW()`); }
    // Search across event ID, puja name, temple name (PDF item 3a — puja-bookings page).
    if (typeof search === 'string' && search.trim()) {
      const p = `$${idx++}`;
      conditions.push(`(pe.id::text ILIKE ${p} OR p.name ILIKE ${p} OR t.name ILIKE ${p})`);
      params.push(`%${search.trim()}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query also needs the joins so search predicates resolve.
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM puja_events pe
         JOIN pujas p   ON p.id = pe.puja_id
         JOIN temples t ON t.id = p.temple_id
       ${where}`,
      params,
    );
    const total = Number(countResult.rows[0].count);

    const { rows } = await pool.query(
      `SELECT pe.*,
              p.name  AS puja_name,
              t.name  AS temple_name,
              COALESCE(bk.total_bookings, 0)::int  AS total_bookings,
              COALESCE(bk.total_devotees, 0)::int   AS total_devotees
       FROM puja_events pe
       JOIN pujas p   ON p.id = pe.puja_id
       JOIN temples t ON t.id = p.temple_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)                        AS total_bookings,
                COALESCE(SUM(devotee_count), 0) AS total_devotees
         FROM puja_bookings
         WHERE puja_event_id = pe.id AND status != 'CANCELLED'
       ) bk ON true
       ${where}
       ORDER BY pe.start_time DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limitNum, offset],
    );

    res.json({ success: true, data: rows, meta: { total, page: pageNum, limit: limitNum } });
  } catch (err) { next(err); }
});

/** GET /:id – event detail with nested bookings (admin) / public event info (devotee) */
pujaEventsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.headers['x-user-role'] as string;

    const eventResult = await pool.query(
      `SELECT pe.*,
              p.name AS puja_name, t.name AS temple_name,
              pj.name AS pujari_name
       FROM puja_events pe
       JOIN pujas p   ON p.id = pe.puja_id
       JOIN temples t ON t.id = p.temple_id
       LEFT JOIN pujaris pj ON pj.id = pe.pujari_id
       WHERE pe.id = $1`,
      [id],
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }

    // Devotees get event info only — no bookings list
    if (role === 'DEVOTEE') {
      return res.json({ success: true, data: eventResult.rows[0] });
    }

    const bookingsResult = await pool.query(
      // Earliest booking first so the admin sankalp-video modal and the
      // puja sankalp report list devotees in booking order.
      `SELECT pb.*, d.name AS devotee_name, d.phone AS devotee_phone
       FROM puja_bookings pb
       JOIN devotees d ON d.id = pb.devotee_id
       WHERE pb.puja_event_id = $1
       ORDER BY pb.created_at ASC`,
      [id],
    );

    // Attach devotee details per booking
    for (const booking of bookingsResult.rows) {
      const devResult = await pool.query(
        `SELECT id, name, relation, gotra FROM puja_booking_devotees WHERE puja_booking_id = $1`,
        [booking.id],
      );
      booking.devotees = devResult.rows;
    }

    const event = eventResult.rows[0];
    event.bookings = bookingsResult.rows;

    res.json({ success: true, data: event });
  } catch (err) { next(err); }
});

/** POST / – create puja event */
pujaEventsRouter.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { puja_id, pujari_id, start_time, has_prasad } = req.body;
    if (!puja_id) {
      return res.status(400).json({ success: false, message: 'puja_id is required' });
    }

    // Fetch max_devotee from puja definition
    const pujaResult = await pool.query(`SELECT max_devotee FROM pujas WHERE id = $1`, [puja_id]);
    if (pujaResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja not found' });
    }

    const maxBookings = pujaResult.rows[0].max_devotee;

    const { rows } = await pool.query(
      `INSERT INTO puja_events (puja_id, pujari_id, start_time, max_bookings, has_prasad)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [puja_id, pujari_id ?? null, start_time ?? null, maxBookings, has_prasad ?? true],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id – update puja event fields */
pujaEventsRouter.patch('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // short_video_url/sankalp_video_url accept null so admin "Remove video"
    // can clear them without going through the stage-advance endpoint.
    const allowed = ['pujari_id', 'start_time', 'max_bookings', 'has_prasad', 'short_video_url', 'sankalp_video_url'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(req.body[field]);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE puja_events SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** DELETE /:id – delete a puja event (only if no active bookings) */
pujaEventsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const inUse = await pool.query(
      `SELECT COUNT(*)::int AS n FROM puja_bookings
       WHERE puja_event_id = $1 AND status IN ('NOT_STARTED', 'INPROGRESS')`,
      [id],
    );
    if (inUse.rows[0].n > 0) {
      return res.status(409).json({ success: false, message: 'Event has active bookings; cancel them first' });
    }
    const { rows } = await pool.query(`DELETE FROM puja_events WHERE id = $1 RETURNING id`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }
    res.json({ success: true, message: 'Puja event deleted' });
  } catch (err) { next(err); }
});

/** PATCH /:id/media – update intro/sankalp video URLs WITHOUT running the
 *  STAGE_TRANSITIONS guard. The stage endpoint refuses once an event reaches
 *  SHIPPED (no transition defined out of it), which blocked admins from
 *  replacing a sankalp video after shipping. Per the PDF spec the admin must
 *  be able to add / replace / delete intro + sankalp videos at any stage.
 *  Pass `null` to clear a slot, omit a field to leave it untouched. */
pujaEventsRouter.patch('/:id/media', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { short_video_url, sankalp_video_url } = req.body ?? {};

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (short_video_url !== undefined) {
      sets.push(`short_video_url = $${idx++}`);
      params.push(short_video_url);
    }
    if (sankalp_video_url !== undefined) {
      sets.push(`sankalp_video_url = $${idx++}`);
      params.push(sankalp_video_url);
    }
    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'No media fields supplied' });
    }
    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE puja_events SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** PATCH /:id/stage – advance event stage with state machine validation */
pujaEventsRouter.patch('/:id/stage', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const eventResult = await pool.query(`SELECT stage, status FROM puja_events WHERE id = $1`, [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }

    if (eventResult.rows[0].status === 'CANCELLED') {
      return res.status(409).json({ success: false, message: 'Event is cancelled; cannot advance stage.' });
    }

    const currentStage = eventResult.rows[0].stage as string;
    const transition = STAGE_TRANSITIONS[currentStage];
    if (!transition) {
      return res.status(400).json({ success: false, message: `Cannot advance from stage "${currentStage}"` });
    }

    // Validate required field in body
    if (transition.requiredField && !req.body[transition.requiredField]) {
      return res.status(400).json({
        success: false,
        message: `"${transition.requiredField}" is required to advance from "${currentStage}" to "${transition.next}"`,
      });
    }

    const sets: string[] = [`stage = $1`];
    const params: unknown[] = [transition.next];
    let idx = 2;

    if (transition.statusUpdate) {
      sets.push(`status = $${idx++}`);
      params.push(transition.statusUpdate);
    }

    // Persist the media field
    if (transition.requiredField) {
      sets.push(`${transition.requiredField} = $${idx++}`);
      params.push(req.body[transition.requiredField]);
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await pool.query(
      `UPDATE puja_events SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    // If transitioning to INPROGRESS or COMPLETED, update related bookings
    if (transition.statusUpdate) {
      const bookingStatus = transition.statusUpdate === 'COMPLETED' ? 'COMPLETED' : 'INPROGRESS';
      await pool.query(
        `UPDATE puja_bookings SET status = $1, updated_at = NOW() WHERE puja_event_id = $2 AND status != 'CANCELLED'`,
        [bookingStatus, id],
      );
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** POST /:id/cancel-all-bookings – cancel every active booking on this event.
 *  Used when admin needs to nuke an event (pujari sick, festival rescheduled).
 *  Marks affected payments PENDING_REFUND so the payment-service worker can
 *  trigger Razorpay refunds; this endpoint does not invoke the gateway directly. */
pujaEventsRouter.post('/:id/cancel-all-bookings', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, refund = true } = req.body ?? {};

    const eventResult = await pool.query(`SELECT id FROM puja_events WHERE id = $1`, [id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }

    const activeBookings = await pool.query(
      `SELECT id, payment_id, cost
       FROM puja_bookings
       WHERE puja_event_id = $1 AND status IN ('NOT_STARTED', 'INPROGRESS')`,
      [id],
    );

    if (activeBookings.rows.length === 0) {
      return res.json({
        success: true,
        data: { cancelled_count: 0, refund_initiated_count: 0, errors: [] },
        message: 'No active bookings on this event',
      });
    }

    const ids = activeBookings.rows.map((b: { id: string }) => b.id);
    await pool.query(
      `UPDATE puja_bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = ANY($1::uuid[])`,
      [ids],
    );

    // Mark the event itself as cancelled so admin stage-advance is blocked
    // and devotees see a cancelled notice instead of a live timeline.
    await pool.query(
      `UPDATE puja_events SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
      [id],
    );

    const errors: Array<{ booking_id: string; reason: string }> = [];
    let refundInitiated = 0;
    if (refund) {
      for (const b of activeBookings.rows) {
        if (!b.payment_id) {
          errors.push({ booking_id: b.id, reason: 'No payment_id (not paid)' });
          continue;
        }
        try {
          await pool.query(
            `UPDATE puja_bookings SET payment_status = 'PENDING_REFUND' WHERE id = $1`,
            [b.id],
          );
          refundInitiated++;
        } catch (e: any) {
          errors.push({ booking_id: b.id, reason: e?.message ?? 'Refund flag failed' });
        }
      }
    }

    res.json({
      success: true,
      data: {
        cancelled_count: ids.length,
        refund_initiated_count: refundInitiated,
        errors,
        reason: reason ?? null,
      },
    });
  } catch (err) { next(err); }
});

// ─── Shiprocket integration ──────────────────────────────────────────────────
//
// One Shiprocket order per puja_booking, one pickup request per event.
// The flow is intentionally NOT wrapped in a single DB transaction — each
// Shiprocket call has side-effects on their server, so we persist
// per-booking results as we go and surface partial failures to the admin.

const REQUIRED_SHIP_FIELDS = ['ship_to_name', 'ship_to_phone', 'ship_to_line1', 'ship_to_city', 'ship_to_state', 'ship_to_pincode'] as const;

function fmtSrOrderDate(start: Date | string): string {
  const d = new Date(start);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** POST /:id/ship — admin triggers Shiprocket flow for every active booking on the event. */
pujaEventsRouter.post('/:id/ship', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!shiprocketConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Shiprocket integration is not configured. Set SHIPROCKET_* env vars and FEATURE_SHIPROCKET_ENABLED=true.',
      });
    }

    // Load event + puja + hamper in a single round-trip.
    const eventResult = await pool.query(
      `SELECT pe.id, pe.stage, pe.status, pe.start_time, pe.has_prasad,
              p.id   AS puja_id, p.name AS puja_name, p.send_hamper, p.hamper_id,
              h.id   AS h_id, h.name AS h_name, h.length_cm, h.breadth_cm, h.height_cm, h.weight_kg, h.declared_value
       FROM puja_events pe
       JOIN pujas p   ON p.id = pe.puja_id
       LEFT JOIN hampers h ON h.id = p.hamper_id
       WHERE pe.id = $1`,
      [id],
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Puja event not found' });
    }
    const evt = eventResult.rows[0];
    if (evt.status === 'CANCELLED') {
      return res.status(409).json({ success: false, message: 'Event is cancelled' });
    }
    if (!evt.send_hamper || !evt.has_prasad) {
      return res.status(400).json({ success: false, message: 'This puja does not ship a hamper' });
    }
    if (!evt.hamper_id) {
      return res.status(400).json({ success: false, message: 'Puja has no hamper assigned' });
    }
    if (evt.stage === 'SHIPPED') {
      return res.status(409).json({ success: false, message: 'Event is already SHIPPED' });
    }

    // Active bookings for the event.
    const bookings = await pool.query(
      `SELECT pb.id, pb.devotee_id, pb.sr_order_id, pb.sr_shipment_id, pb.shipment_status,
              pb.ship_to_name, pb.ship_to_phone, pb.ship_to_line1, pb.ship_to_line2,
              pb.ship_to_city, pb.ship_to_state, pb.ship_to_pincode, pb.ship_to_country,
              d.name AS devotee_name, d.phone AS devotee_phone
       FROM puja_bookings pb
       JOIN devotees d ON d.id = pb.devotee_id
       WHERE pb.puja_event_id = $1 AND pb.status != 'CANCELLED'`,
      [id],
    );

    if (bookings.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No active bookings on this event' });
    }

    // First pass: validate addresses. If any required field is missing, refuse
    // and return the per-booking error map so admin fixes them before any
    // outbound Shiprocket calls are made (avoids partial-state side effects).
    const missing: Array<{ booking_id: string; devotee_name: string; missing: string[] }> = [];
    for (const b of bookings.rows) {
      const missingFields: string[] = [];
      for (const f of REQUIRED_SHIP_FIELDS) {
        if (!b[f]) missingFields.push(f);
      }
      if (missingFields.length > 0) missing.push({ booking_id: b.id, devotee_name: b.devotee_name, missing: missingFields });
    }
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some bookings are missing structured shipping address fields',
        data: { missing },
      });
    }

    const succeeded: any[] = [];
    const failed: Array<{ booking_id: string; devotee_name: string; reason: string }> = [];
    const shipmentIdsForPickup: Array<number | string> = [];

    for (const b of bookings.rows) {
      // Idempotent skip: if an order already exists for this booking, leave it alone.
      if (b.sr_order_id) {
        succeeded.push({ booking_id: b.id, sr_order_id: b.sr_order_id, sr_shipment_id: b.sr_shipment_id, skipped: 'already_created' });
        continue;
      }

      const phone = String(b.ship_to_phone ?? '').replace(/[^0-9]/g, '').slice(-10);
      const traceableOrderId = `pb_${b.id.slice(0, 8)}_${Date.now()}`;

      // Shiprocket's /orders/create/adhoc requires both billing_customer_name
      // (first name) AND billing_last_name as separate keys — sending only the
      // full name fails with {"billing_last_name":["validation.present"]}.
      // Split on the last whitespace; if the recipient has a single name we
      // duplicate it so neither key is empty.
      const fullName = String(b.ship_to_name ?? '').trim();
      const nameTokens = fullName.split(/\s+/).filter(Boolean);
      const firstName = nameTokens[0] || fullName || 'Devotee';
      const lastName = nameTokens.length > 1 ? nameTokens.slice(1).join(' ') : firstName;

      const createResult = await srCreateOrder({
        order_id: traceableOrderId,
        order_date: fmtSrOrderDate(evt.start_time ?? new Date()),
        pickup_location: process.env.SHIPROCKET_PICKUP_NICKNAME ?? 'work',
        channel_id: process.env.SHIPROCKET_CHANNEL_ID || undefined,
        comment: `Prasad for ${evt.puja_name}`,
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: b.ship_to_line1,
        billing_address_2: b.ship_to_line2 ?? '',
        billing_city: b.ship_to_city,
        billing_pincode: b.ship_to_pincode,
        billing_state: b.ship_to_state,
        billing_country: b.ship_to_country ?? 'India',
        billing_phone: phone,
        shipping_is_billing: true,
        order_items: [{
          name: evt.h_name,
          sku: `hamper_${String(evt.h_id).slice(0, 8)}`,
          units: 1,
          selling_price: Number(evt.declared_value),
        }],
        payment_method: 'Prepaid',
        sub_total: Number(evt.declared_value),
        length: Number(evt.length_cm),
        breadth: Number(evt.breadth_cm),
        height: Number(evt.height_cm),
        weight: Number(evt.weight_kg),
      });

      if (!createResult.ok) {
        await pool.query(
          `UPDATE puja_bookings SET sr_last_error = $1, sr_last_synced_at = NOW() WHERE id = $2`,
          [createResult.error ?? createResult.reason, b.id],
        );
        failed.push({ booking_id: b.id, devotee_name: b.devotee_name, reason: createResult.error ?? createResult.reason });
        continue;
      }

      const created = createResult.data;
      await pool.query(
        `UPDATE puja_bookings
            SET sr_order_id = $1, sr_shipment_id = $2, shipment_status = 'NEW',
                shipment_id = $2, sr_last_error = NULL, sr_last_synced_at = NOW()
          WHERE id = $3`,
        [String(created.order_id), String(created.shipment_id), b.id],
      );

      // Try AWB allocation; not fatal if it fails — order still exists in SR.
      const awbResult = await srAssignAwb(created.shipment_id);
      if (awbResult.ok) {
        const awb = awbResult.data;
        await pool.query(
          `UPDATE puja_bookings
              SET sr_awb_code = $1, sr_courier_name = $2,
                  sr_expected_delivery = $3, shipment_status = 'AWB_ASSIGNED',
                  sr_last_synced_at = NOW()
            WHERE id = $4`,
          [awb.awb_code, awb.courier_name, awb.expected_delivery_date ?? null, b.id],
        );
        shipmentIdsForPickup.push(created.shipment_id);
        succeeded.push({
          booking_id: b.id,
          devotee_name: b.devotee_name,
          sr_order_id: created.order_id,
          sr_shipment_id: created.shipment_id,
          sr_awb_code: awb.awb_code,
          sr_courier_name: awb.courier_name,
          sr_expected_delivery: awb.expected_delivery_date,
        });
      } else {
        await pool.query(
          `UPDATE puja_bookings SET sr_last_error = $1, sr_last_synced_at = NOW() WHERE id = $2`,
          [awbResult.error ?? awbResult.reason, b.id],
        );
        failed.push({ booking_id: b.id, devotee_name: b.devotee_name, reason: `AWB allocation failed: ${awbResult.error ?? awbResult.reason}` });
      }
    }

    // Single batched pickup for everything that got an AWB.
    let pickupOk = false;
    let pickupErr: string | undefined;
    if (shipmentIdsForPickup.length > 0) {
      const p = await srGeneratePickup(shipmentIdsForPickup);
      pickupOk = p.ok;
      if (p.ok) {
        await pool.query(
          `UPDATE puja_bookings SET shipment_status = 'PICKUP_SCHEDULED', sr_last_synced_at = NOW()
            WHERE sr_shipment_id = ANY($1::text[])`,
          [shipmentIdsForPickup.map(String)],
        );
      } else {
        pickupErr = p.error ?? p.reason;
      }
    }

    // Advance event stage only if every booking succeeded AND pickup scheduled.
    let stageAdvanced = false;
    if (failed.length === 0 && (shipmentIdsForPickup.length === 0 || pickupOk)) {
      if (evt.stage === 'TO_BE_SHIPPED') {
        await pool.query(
          `UPDATE puja_events SET stage = 'SHIPPED', status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
          [id],
        );
        await pool.query(
          `UPDATE puja_bookings SET status = 'COMPLETED', updated_at = NOW() WHERE puja_event_id = $1 AND status != 'CANCELLED'`,
          [id],
        );
        stageAdvanced = true;
      }
    }

    res.json({
      success: failed.length === 0,
      data: {
        total: bookings.rows.length,
        succeeded_count: succeeded.length,
        failed_count: failed.length,
        pickup_scheduled: pickupOk,
        pickup_error: pickupErr,
        stage_advanced: stageAdvanced,
        succeeded,
        failed,
      },
    });
  } catch (err) { next(err); }
});

/** GET /:id/shipments — fresh per-booking shipment status; optional `?refresh=true` polls Shiprocket. */
pujaEventsRouter.get('/:id/shipments', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const wantRefresh = String(req.query.refresh ?? '').toLowerCase() === 'true';

    const { rows } = await pool.query(
      `SELECT pb.id AS booking_id, d.name AS devotee_name,
              pb.ship_to_name, pb.ship_to_phone, pb.ship_to_line1, pb.ship_to_line2,
              pb.ship_to_city, pb.ship_to_state, pb.ship_to_pincode,
              pb.sr_order_id, pb.sr_shipment_id, pb.sr_awb_code, pb.sr_courier_name,
              pb.sr_expected_delivery, pb.shipment_status, pb.sr_last_synced_at, pb.sr_last_error
       FROM puja_bookings pb
       JOIN devotees d ON d.id = pb.devotee_id
       WHERE pb.puja_event_id = $1 AND pb.status != 'CANCELLED'
       ORDER BY pb.created_at ASC`,
      [id],
    );

    if (wantRefresh && shiprocketConfigured()) {
      for (const r of rows) {
        if (!r.sr_awb_code) continue;
        const t = await srTrackByAwb(r.sr_awb_code);
        if (!t.ok) continue;
        const track = t.data.tracking_data?.shipment_track?.[0];
        if (!track) continue;
        const mapped = mapShiprocketStatus(track.current_status);
        if (mapped) {
          await pool.query(
            `UPDATE puja_bookings SET shipment_status = $1, sr_last_synced_at = NOW(),
                                     sr_expected_delivery = COALESCE($2, sr_expected_delivery)
              WHERE id = $3`,
            [mapped, track.edd ?? null, r.booking_id],
          );
          r.shipment_status = mapped;
          if (track.edd) r.sr_expected_delivery = track.edd;
          r.sr_last_synced_at = new Date().toISOString();
        }
      }
    }

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});
