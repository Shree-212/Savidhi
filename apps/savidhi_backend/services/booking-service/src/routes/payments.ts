import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { pool } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import {
  createOrFetchCustomer,
  fetchPaymentToken,
} from '../lib/razorpayHelpers';
import {
  materializeBookingFromPayment,
  tableForBookingType,
  bookingErrorStatus,
  previewBookingAmount,
} from '../lib/materializeBooking';

export const paymentsRouter = Router();

// ─── Razorpay client (lazy; tolerant to missing keys in dev) ─────────────────
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';
const razorpayClient =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
    : null;

function razorpayConfigured(): boolean {
  return !!razorpayClient;
}

function paymentsForceStub(): boolean {
  return String(process.env.PAYMENTS_FORCE_STUB ?? '').toLowerCase() === 'true';
}

const VALID_BOOKING_TYPES = ['PUJA', 'CHADHAVA', 'APPOINTMENT'] as const;
type BookingType = typeof VALID_BOOKING_TYPES[number];

/**
 * POST /create-order
 *
 * Deferred-booking flow:
 *  - The client sends the FULL booking payload here, NOT a pre-created
 *    booking_id. The server validates the payload, computes the authoritative
 *    amount, creates a Razorpay order, and stashes the payload + idempotency
 *    key on the payments row. The booking row itself is NOT inserted yet —
 *    that happens in /verify (or the webhook) after payment succeeds.
 *
 *  - Idempotency: keyed on `<booking_type>:<booking_idempotency_key>` from the
 *    client. A retry within the same browser session returns the existing
 *    CREATED payment so the Razorpay modal can be reopened against the same
 *    order_id.
 */
paymentsRouter.post('/create-order', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const userId = req.headers['x-user-id'] as string;
    const {
      booking_type,
      booking_payload,
      booking_idempotency_key,
      // Legacy shape — used by the mobile app (which still creates the booking
      // row before calling create-order). Once mobile is migrated to the
      // deferred flow these can be removed.
      booking_id: legacyBookingId,
      amount: legacyAmount,
    } = req.body as {
      booking_type?: string;
      booking_payload?: Record<string, unknown>;
      booking_idempotency_key?: string;
      booking_id?: string;
      amount?: number;
    };

    if (!booking_type) {
      return res.status(400).json({ success: false, message: 'booking_type is required' });
    }
    if (!VALID_BOOKING_TYPES.includes(booking_type as BookingType)) {
      return res.status(400).json({ success: false, message: `booking_type must be one of: ${VALID_BOOKING_TYPES.join(', ')}` });
    }

    // Pick a flow based on shape. Web sends {booking_payload, booking_idempotency_key};
    // mobile sends {booking_id, amount}. Mobile keeps the pre-create-booking
    // behavior until it's migrated.
    const isDeferredFlow = !!booking_payload && typeof booking_payload === 'object';
    const isLegacyFlow = !isDeferredFlow && !!legacyBookingId && legacyAmount != null;

    if (!isDeferredFlow && !isLegacyFlow) {
      return res.status(400).json({
        success: false,
        message: 'Either booking_payload+booking_idempotency_key (deferred flow) or booking_id+amount (legacy) is required',
      });
    }

    if (isDeferredFlow && (!booking_idempotency_key || typeof booking_idempotency_key !== 'string')) {
      return res.status(400).json({ success: false, message: 'booking_idempotency_key is required (client-generated UUID)' });
    }

    const idempotencyKey = isDeferredFlow
      ? `${booking_type}:${booking_idempotency_key}`
      : `${booking_type}:${legacyBookingId}`;

    // Replay: re-open the modal against the same order if the user double-tapped
    // Pay or refreshed during checkout. Only payments still in CREATED are
    // eligible — anything CAPTURED / FAILED / EXPIRED should force a new try.
    const dup = await pool.query(
      `SELECT * FROM payments
        WHERE idempotency_key = $1 AND status = 'CREATED' AND devotee_id = $2
        ORDER BY created_at DESC LIMIT 1`,
      [idempotencyKey, userId],
    );
    if (dup.rows.length > 0) {
      const existing = dup.rows[0];
      const existingIsStub = paymentsForceStub()
        || String(existing.gateway_order_id ?? '').startsWith('order_stub_')
        || !razorpayConfigured();
      return res.json({
        success: true,
        data: {
          ...existing,
          razorpay_key_id: existingIsStub ? null : RAZORPAY_KEY_ID || null,
          stub: existingIsStub,
          reused: true,
        },
      });
    }

    // Validate payload + compute amount server-side. Anti-tamper: the client
    // never sets the amount — we derive it from the puja/chadhava/astrologer
    // pricing tables. Legacy flow looks the amount up off the existing booking
    // row for the same anti-tamper guarantee.
    let amount: number;
    if (isDeferredFlow) {
      try {
        const preview = await previewBookingAmount(client, booking_type as BookingType, booking_payload!);
        amount = preview.amount;
      } catch (err: any) {
        const status = bookingErrorStatus(err) ?? 400;
        return res.status(status).json({ success: false, message: err.message ?? 'Invalid booking payload' });
      }
    } else {
      const table = tableForBookingType(booking_type);
      const bookingCheck = await pool.query(
        `SELECT id, devotee_id, cost FROM ${table} WHERE id = $1`,
        [legacyBookingId],
      );
      if (bookingCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
      if (bookingCheck.rows[0].devotee_id !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      const storedCostPaise = Math.round(Number(bookingCheck.rows[0].cost) * 100);
      const requestedPaise = Math.round(Number(legacyAmount) * 100);
      if (storedCostPaise !== requestedPaise) {
        return res.status(400).json({
          success: false,
          message: `Amount mismatch: booking cost is ₹${bookingCheck.rows[0].cost}`,
        });
      }
      amount = Number(legacyAmount);
    }

    const amountPaise = Math.round(amount * 100);
    if (amountPaise < 100) {
      return res.status(400).json({ success: false, message: 'Amount must be at least ₹1 (100 paise)' });
    }

    // Phase B subscription handling — for SUBSCRIPTION puja/chadhava bookings,
    // the FIRST payment needs a Razorpay customer_id so the order can authorise
    // an e-mandate token. Since the booking row doesn't exist yet, we attach
    // (or create) the customer on the DEVOTEE for now and the materialize step
    // will copy it onto the booking row.
    const isSubscription = (booking_type === 'PUJA' || booking_type === 'CHADHAVA') &&
      String(booking_payload?.booking_type ?? '').toUpperCase() === 'SUBSCRIPTION';

    let recurringCustomerId: string | null = null;
    if (isSubscription) {
      try {
        const devoteeRow = (await pool.query(
          `SELECT id, name, phone FROM devotees WHERE id = $1`,
          [userId],
        )).rows[0];
        // createOrFetchCustomer passes Razorpay's fail_existing=0 so calling it
        // again for the same devotee returns the existing customer rather than
        // creating duplicates.
        const cust = await createOrFetchCustomer({
          id: userId,
          name: devoteeRow?.name ?? 'Savidhi Devotee',
          phone: devoteeRow?.phone ?? '',
          email: null,
        });
        recurringCustomerId = cust.customer_id;
      } catch (err: any) {
        console.warn('[payments.create-order] customer create failed; falling back to non-recurring',
          err?.error?.description ?? err?.message);
        recurringCustomerId = null;
      }
    }

    // Create Razorpay order (or stub).
    let gatewayOrderId: string;
    let usedStub = false;

    if (paymentsForceStub()) {
      gatewayOrderId = `order_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      usedStub = true;
    } else if (razorpayConfigured()) {
      try {
        const receiptSeed = (isDeferredFlow ? booking_idempotency_key! : legacyBookingId!).slice(0, 18);
        const orderOptions: any = {
          amount: amountPaise,
          currency: 'INR',
          receipt: `pay_${receiptSeed}`,
          notes: {
            booking_type,
            devotee_id: userId,
            ...(isDeferredFlow ? {} : { booking_id: legacyBookingId }),
            ...(isSubscription ? { subscription: 'true' } : {}),
          },
        };
        if (isSubscription && recurringCustomerId) {
          orderOptions.customer_id = recurringCustomerId;
          orderOptions.payment_capture = true;
        }
        const rzpOrder = await razorpayClient!.orders.create(orderOptions);
        gatewayOrderId = rzpOrder.id;
      } catch (err: any) {
        const detail = err?.error?.description ?? err?.message ?? 'unknown';
        console.error('[razorpay] order create failed:', err?.error ?? err.message);
        if (process.env.NODE_ENV === 'production') {
          return res.status(502).json({ success: false, message: 'Failed to create Razorpay order', detail });
        }
        console.warn('[razorpay] falling back to stub order — non-prod environment');
        gatewayOrderId = `order_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        usedStub = true;
      }
    } else {
      gatewayOrderId = `order_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      usedStub = true;
    }

    // Insert the pending payment. Deferred flow stashes the booking_payload
    // and leaves booking_id NULL until /verify materializes the row. Legacy
    // flow already has a booking row, so link directly.
    const { rows } = await pool.query(
      `INSERT INTO payments (
         booking_type, booking_id, devotee_id, amount, gateway_order_id, gateway,
         idempotency_key, booking_payload, booking_idempotency_key
       )
       VALUES ($1, $2, $3, $4, $5, 'RAZORPAY', $6, $7, $8) RETURNING *`,
      [
        booking_type,
        isDeferredFlow ? null : legacyBookingId,
        userId,
        amount,
        gatewayOrderId,
        idempotencyKey,
        isDeferredFlow ? JSON.stringify(booking_payload) : null,
        isDeferredFlow ? booking_idempotency_key : null,
      ],
    );

    res.status(201).json({
      success: true,
      data: {
        ...rows[0],
        razorpay_key_id: usedStub ? null : RAZORPAY_KEY_ID || null,
        stub: usedStub,
        recurring: isSubscription && !!recurringCustomerId,
        razorpay_customer_id: isSubscription ? recurringCustomerId : null,
      },
    });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /verify
 *
 * Deferred-booking flow: validates the Razorpay signature, then in ONE
 * transaction:
 *   1. Materializes the booking row from `payments.booking_payload`.
 *   2. Updates `payments.status = 'CAPTURED'` and links `payments.booking_id`.
 *   3. Sets booking.payment_status = 'PAID' and booking.payment_id.
 *
 * Idempotent: if the webhook already captured this payment (a race), we just
 * return the existing booking row.
 */
paymentsRouter.post('/verify', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { payment_id, gateway_order_id, gateway_payment_id, gateway_signature } = req.body;

    console.log('[payments.verify] called', { payment_id, gateway_order_id, gateway_payment_id });

    if (!payment_id || !gateway_payment_id) {
      console.warn('[payments.verify] missing required fields', { payment_id, gateway_payment_id });
      return res.status(400).json({ success: false, message: 'payment_id and gateway_payment_id are required' });
    }

    await client.query('BEGIN');

    // Lock the payment row so verify and webhook can't materialize twice.
    const paymentResult = await client.query(
      `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
      [payment_id],
    );
    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    if (payment.status === 'CAPTURED') {
      // Already done by /verify or the webhook on a prior call. Return the
      // booking that was materialized so the client navigates to confirmation.
      let booking: any = null;
      if (payment.booking_id) {
        const table = tableForBookingType(payment.booking_type);
        const br = await client.query(`SELECT * FROM ${table} WHERE id = $1`, [payment.booking_id]);
        booking = br.rows[0] ?? null;
      }
      await client.query('ROLLBACK');
      console.log('[payments.verify] already CAPTURED, returning success', { payment_id });
      return res.json({ success: true, data: { payment, booking }, alreadyCaptured: true });
    }

    if (payment.status !== 'CREATED') {
      await client.query('ROLLBACK');
      console.warn('[payments.verify] payment not in CREATED state', { payment_id, status: payment.status });
      return res.status(400).json({ success: false, message: `Payment is in "${payment.status}" state — cannot verify` });
    }

    const isStubOrder = String(payment.gateway_order_id ?? '').startsWith('order_stub_');

    if (razorpayConfigured() && !isStubOrder) {
      if (!gateway_signature || !gateway_order_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'gateway_order_id and gateway_signature are required' });
      }
      if (gateway_order_id !== payment.gateway_order_id) {
        await client.query('ROLLBACK');
        console.warn('[payments.verify] order id mismatch', { payment_id, expected: payment.gateway_order_id, got: gateway_order_id });
        return res.status(400).json({ success: false, message: 'Order id mismatch' });
      }
      const expected = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${gateway_order_id}|${gateway_payment_id}`)
        .digest('hex');
      if (expected !== gateway_signature) {
        await client.query('ROLLBACK');
        console.warn('[payments.verify] signature mismatch', { payment_id, gateway_order_id, gateway_payment_id });
        return res.status(400).json({ success: false, message: 'Signature mismatch' });
      }
    }

    // Materialize the booking row using the stashed payload.
    let booking: any;
    try {
      booking = await materializeBookingFromPayment(client, payment);
    } catch (err: any) {
      await client.query('ROLLBACK');
      const status = bookingErrorStatus(err) ?? 500;
      console.error('[payments.verify] materialize failed', { payment_id, status, message: err?.message });
      return res.status(status).json({ success: false, message: err?.message ?? 'Failed to create booking after payment' });
    }

    // Flip the payment row to CAPTURED and link the new booking.
    const { rows: paymentRows } = await client.query(
      `UPDATE payments
       SET status = 'CAPTURED',
           booking_id = $1,
           gateway_payment_id = $2,
           gateway_signature = $3,
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [booking.id, gateway_payment_id, gateway_signature ?? null, payment_id],
    );

    // Mark the booking as PAID.
    const table = tableForBookingType(payment.booking_type);
    await client.query(
      `UPDATE ${table} SET payment_status = 'PAID', payment_id = $1, updated_at = NOW() WHERE id = $2`,
      [payment_id, booking.id],
    );

    // Phase B subscription token capture (puja/chadhava SUBSCRIPTION first
    // payments only). See earlier inline doc for rationale.
    if (
      (payment.booking_type === 'PUJA' || payment.booking_type === 'CHADHAVA') &&
      !isStubOrder
    ) {
      try {
        const bookingRow = (await client.query(
          `SELECT booking_type, razorpay_token_id,
                  ${payment.booking_type === 'PUJA' ? 'puja_event_id' : 'chadhava_event_id'} AS event_id
             FROM ${table} WHERE id = $1`,
          [booking.id],
        )).rows[0];

        if (
          bookingRow?.booking_type === 'SUBSCRIPTION' &&
          !bookingRow.razorpay_token_id &&
          gateway_payment_id
        ) {
          const tokenRes = await fetchPaymentToken(gateway_payment_id);
          const eventsTable = payment.booking_type === 'PUJA' ? 'puja_events' : 'chadhava_events';
          const parentFkCol = payment.booking_type === 'PUJA' ? 'puja_id' : 'chadhava_id';
          const nextEv = (await client.query(
            `SELECT start_time FROM ${eventsTable}
              WHERE ${parentFkCol} = (SELECT ${parentFkCol} FROM ${eventsTable} WHERE id = $1)
                AND start_time > (SELECT start_time FROM ${eventsTable} WHERE id = $1)
                AND status NOT IN ('CANCELLED', 'COMPLETED')
              ORDER BY start_time ASC LIMIT 1`,
            [bookingRow.event_id],
          )).rows[0];

          await client.query(
            `UPDATE ${table}
                SET razorpay_token_id = COALESCE($1, razorpay_token_id),
                    razorpay_customer_id = COALESCE($2, razorpay_customer_id),
                    next_charge_at = COALESCE($3, next_charge_at),
                    updated_at = NOW()
              WHERE id = $4`,
            [tokenRes.token_id, tokenRes.customer_id, nextEv?.start_time ?? null, booking.id],
          );
          console.log('[payments.verify] subscription token captured', {
            booking_id: booking.id,
            token_id: tokenRes.token_id,
            stub: tokenRes.stub,
            next_charge_at: nextEv?.start_time ?? null,
          });
        }
      } catch (err: any) {
        console.warn('[payments.verify] subscription token capture failed',
          err?.error?.description ?? err?.message);
      }
    }

    await client.query('COMMIT');

    console.log('[payments.verify] CAPTURED', { payment_id, booking_type: payment.booking_type, booking_id: booking.id });
    res.json({ success: true, data: { payment: paymentRows[0], booking } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[payments.verify] error', err);
    next(err);
  } finally {
    client.release();
  }
});

/** GET /razorpay/key – expose the public Key ID so the web client can init Checkout.js */
paymentsRouter.get('/razorpay/key', (_req: Request, res: Response) => {
  res.json({ success: true, data: { key_id: RAZORPAY_KEY_ID, configured: razorpayConfigured() } });
});

/**
 * POST /razorpay/webhook
 *
 * Server-to-server webhook from Razorpay. Same deferred-booking model as
 * /verify: on payment.captured we materialize the booking row inside the same
 * transaction that flips the payment to CAPTURED. On payment.failed we mark
 * the payment FAILED — no booking is created (so nothing to clean up).
 */
paymentsRouter.post('/razorpay/webhook', async (req: Request, res: Response) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const raw = (req as any).rawBody as Buffer | undefined;

    if (secret) {
      if (!signature || !raw) {
        console.warn('[razorpay webhook] missing signature or raw body', { hasSignature: !!signature, hasRaw: !!raw });
        return res.status(400).json({ success: false, message: 'Missing webhook signature' });
      }
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      if (expected !== signature) {
        console.warn('[razorpay webhook] invalid signature');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const body = req.body as any;
    const event = body?.event as string | undefined;
    const paymentEntity = body?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id as string | undefined;
    const rzpPaymentId = paymentEntity?.id as string | undefined;
    const tokenEntity = body?.payload?.token?.entity;
    const tokenId = tokenEntity?.id as string | undefined;
    const tokenCustomerId = tokenEntity?.customer_id as string | undefined;

    console.log('[razorpay webhook] received', { event, orderId, rzpPaymentId, tokenId });

    if (!event) {
      return res.status(200).json({ success: true, ignored: true });
    }

    // ─── Token lifecycle (e-mandate cancellation / expiry) ────────────────
    if (event === 'token.cancelled' || event === 'token.expired') {
      if (!tokenId) {
        console.warn('[razorpay webhook] token event with no token_id', { event });
        return res.status(200).json({ success: true, ignored: true, reason: 'no token id' });
      }
      const pujaRows = await pool.query(
        `UPDATE puja_bookings
            SET booking_type = 'ONE_TIME', updated_at = NOW()
          WHERE razorpay_token_id = $1 AND booking_type = 'SUBSCRIPTION'
          RETURNING id`,
        [tokenId],
      );
      const chadhavaRows = await pool.query(
        `UPDATE chadhava_bookings
            SET booking_type = 'ONE_TIME', updated_at = NOW()
          WHERE razorpay_token_id = $1 AND booking_type = 'SUBSCRIPTION'
          RETURNING id`,
        [tokenId],
      );
      console.log('[razorpay webhook] subscription lapsed via token event', {
        event,
        tokenId,
        tokenCustomerId,
        puja_flipped: pujaRows.rowCount,
        chadhava_flipped: chadhavaRows.rowCount,
      });
      return res.json({ success: true, processed: event });
    }

    if (!orderId) {
      return res.status(200).json({ success: true, ignored: true });
    }

    const pay = (await pool.query(`SELECT * FROM payments WHERE gateway_order_id = $1`, [orderId])).rows[0];
    if (!pay) {
      console.warn('[razorpay webhook] unknown order', { orderId, event });
      return res.status(200).json({ success: true, ignored: true, reason: 'unknown order' });
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      if (pay.status === 'CAPTURED') {
        console.log('[razorpay webhook] already CAPTURED, no-op', { payment_id: pay.id });
        return res.json({ success: true, processed: event });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Re-fetch with FOR UPDATE so a concurrent /verify doesn't double-materialize.
        const lockedRes = await client.query(
          `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
          [pay.id],
        );
        const locked = lockedRes.rows[0];
        if (locked.status === 'CAPTURED') {
          await client.query('ROLLBACK');
          console.log('[razorpay webhook] race: already CAPTURED inside tx, no-op', { payment_id: pay.id });
          return res.json({ success: true, processed: event });
        }

        let booking: any;
        try {
          booking = await materializeBookingFromPayment(client, locked);
        } catch (err: any) {
          await client.query('ROLLBACK');
          console.error('[razorpay webhook] materialize failed', { payment_id: pay.id, message: err?.message });
          // 200 so Razorpay doesn't retry forever; we'll see the failure in logs.
          return res.json({ success: false, processed: event, materialize_error: err?.message });
        }

        await client.query(
          `UPDATE payments
             SET status = 'CAPTURED',
                 booking_id = $1,
                 gateway_payment_id = COALESCE($2, gateway_payment_id),
                 updated_at = NOW()
           WHERE id = $3`,
          [booking.id, rzpPaymentId ?? null, pay.id],
        );

        const table = tableForBookingType(pay.booking_type);
        await client.query(
          `UPDATE ${table} SET payment_status = 'PAID', payment_id = $1, updated_at = NOW() WHERE id = $2 AND payment_status != 'PAID'`,
          [pay.id, booking.id],
        );

        await client.query('COMMIT');
        console.log('[razorpay webhook] CAPTURED via webhook', { payment_id: pay.id, booking_type: pay.booking_type, booking_id: booking.id });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else if (event === 'payment.failed') {
      await pool.query(`UPDATE payments SET status='FAILED', updated_at = NOW() WHERE id = $1`, [pay.id]);
      console.log('[razorpay webhook] FAILED', { payment_id: pay.id });
    }

    res.json({ success: true, processed: event });
  } catch (err: any) {
    console.error('[razorpay webhook]', err);
    res.status(500).json({ success: false, message: 'webhook processing failed' });
  }
});
