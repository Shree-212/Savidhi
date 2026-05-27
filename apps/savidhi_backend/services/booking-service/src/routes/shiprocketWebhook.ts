// Shiprocket → booking-service webhook.
//
// Shiprocket POSTs status updates per AWB. We verify the shared-token in
// the `x-api-key` header against SHIPROCKET_WEBHOOK_SECRET, map their
// fine-grained status string to our enum, then update puja_bookings.
//
// Audit: every payload (verified or not) is persisted into
// shiprocket_webhook_events so we can replay or investigate later.

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { verifyWebhookSignature, mapShiprocketStatus } from '../lib/shiprocket';

export const shiprocketWebhookRouter = Router();

shiprocketWebhookRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signatureOk = verifyWebhookSignature(req.headers);

    // The payload shape is documented at
    // https://apidocs.shiprocket.in/ → "Webhook Sample Payload". Fields we
    // care about:
    //   awb               — AWB / tracking number
    //   order_id          — our traceable order id (pb_<short>_<ts>) OR shiprocket's
    //   current_status    — fine-grained status string
    //   etd               — expected delivery date (YYYY-MM-DD)
    //   courier_name      — assigned courier
    const payload = (req.body ?? {}) as Record<string, any>;
    const awb = (payload.awb ?? payload.awb_code) ? String(payload.awb ?? payload.awb_code) : null;
    const orderId = payload.order_id ? String(payload.order_id) : null;
    const currentStatus = payload.current_status ?? payload.shipment_status ?? null;
    const etd = payload.etd ?? payload.expected_delivery_date ?? null;
    const courierName = payload.courier_name ?? null;

    // Always log first so we have an audit trail even when signature fails.
    await pool.query(
      `INSERT INTO shiprocket_webhook_events
         (awb_code, order_id, current_status, event_payload, signature_ok, processed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [awb, orderId, currentStatus, JSON.stringify(payload), signatureOk],
    );

    if (!signatureOk) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    if (!awb) {
      // Verified but unidentifiable — accept so Shiprocket doesn't retry,
      // but flag it in logs for investigation.
      console.warn('[shiprocket-webhook] verified payload with no AWB', payload);
      return res.status(200).json({ success: true, message: 'No AWB in payload; ignored' });
    }

    const mapped = mapShiprocketStatus(currentStatus);
    if (!mapped) {
      console.warn('[shiprocket-webhook] unknown status', currentStatus, 'for AWB', awb);
      return res.status(200).json({ success: true, message: `Unmapped status "${currentStatus}"` });
    }

    const update = await pool.query(
      `UPDATE puja_bookings
          SET shipment_status = $1,
              sr_expected_delivery = COALESCE($2, sr_expected_delivery),
              sr_courier_name = COALESCE($3, sr_courier_name),
              sr_last_synced_at = NOW()
        WHERE sr_awb_code = $4
       RETURNING id`,
      [mapped, etd, courierName, awb],
    );

    res.status(200).json({
      success: true,
      data: { matched_bookings: update.rowCount ?? 0, mapped_status: mapped },
    });
  } catch (err) { next(err); }
});
