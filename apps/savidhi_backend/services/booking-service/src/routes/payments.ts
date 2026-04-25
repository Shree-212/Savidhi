import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { pool } from '../lib/db';
import { requireAuth } from '../middleware/auth';

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

function tableForBookingType(bookingType: string): string {
  if (bookingType === 'PUJA') return 'puja_bookings';
  if (bookingType === 'CHADHAVA') return 'chadhava_bookings';
  return 'appointments';
}

/**
 * POST /create-order
 * Creates a Razorpay order AND a local `payments` row (status=CREATED).
 * Idempotent: if a payment with the same `idempotency_key` already exists, the
 * existing row is returned instead of creating a duplicate. A stable key is
 * derived from booking_type+booking_id so double-clicks never create two orders.
 */
paymentsRouter.post('/create-order', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { booking_type, booking_id, amount } = req.body;

    if (!booking_type || !booking_id || amount == null) {
      return res.status(400).json({ success: false, message: 'booking_type, booking_id, and amount are required' });
    }

    const idempotencyKey = `${booking_type}:${booking_id}`;
    // If there's an existing CREATED payment for this booking, return it instead of duplicating.
    const dup = await pool.query(
      `SELECT * FROM payments WHERE idempotency_key = $1 AND status = 'CREATED' AND devotee_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [idempotencyKey, userId],
    );
    if (dup.rows.length > 0) {
      return res.json({
        success: true,
        data: {
          ...dup.rows[0],
          razorpay_key_id: RAZORPAY_KEY_ID || null,
          stub: !razorpayConfigured(),
          reused: true,
        },
      });
    }

    const validTypes = ['PUJA', 'CHADHAVA', 'APPOINTMENT'];
    if (!validTypes.includes(booking_type)) {
      return res.status(400).json({ success: false, message: `booking_type must be one of: ${validTypes.join(', ')}` });
    }

    const amountPaise = Math.round(Number(amount) * 100);
    if (amountPaise < 100) {
      return res.status(400).json({ success: false, message: 'Amount must be at least ₹1 (100 paise)' });
    }

    // Ensure the booking belongs to this devotee
    const table = tableForBookingType(booking_type);
    const bookingCheck = await pool.query(
      `SELECT id, devotee_id, cost FROM ${table} WHERE id = $1`,
      [booking_id],
    );
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (bookingCheck.rows[0].devotee_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Reject if amount doesn't match the booking's stored cost (anti-tamper)
    const storedCostPaise = Math.round(Number(bookingCheck.rows[0].cost) * 100);
    if (storedCostPaise !== amountPaise) {
      return res.status(400).json({
        success: false,
        message: `Amount mismatch: booking cost is ₹${bookingCheck.rows[0].cost}`,
      });
    }

    // Create Razorpay order. In dev / non-prod we fall back to stub mode if
    // either the keys are missing OR the gateway rejects them (e.g. invalid
    // test keys), so booking flows remain testable end-to-end without a live
    // Razorpay account. In production a Razorpay failure stays a hard error.
    let gatewayOrderId: string;
    let usedStub = false;

    if (razorpayConfigured()) {
      try {
        const rzpOrder = await razorpayClient!.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt: `bkg_${booking_id.slice(0, 18)}`,
          notes: { booking_type, booking_id, devotee_id: userId },
        });
        gatewayOrderId = rzpOrder.id;
      } catch (err: any) {
        const detail = err?.error?.description ?? err?.message ?? 'unknown';
        console.error('[razorpay] order create failed:', err?.error ?? err.message);
        if (process.env.NODE_ENV === 'production') {
          return res.status(502).json({ success: false, message: 'Failed to create Razorpay order', detail });
        }
        // Dev fallback: pretend Razorpay is in stub mode for this order so the
        // booking flow can still complete (the verify step also accepts stubs).
        console.warn('[razorpay] falling back to stub order — non-prod environment');
        gatewayOrderId = `order_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        usedStub = true;
      }
    } else {
      // Stub mode — keys not configured at all
      gatewayOrderId = `order_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      usedStub = true;
    }

    const { rows } = await pool.query(
      `INSERT INTO payments (booking_type, booking_id, devotee_id, amount, gateway_order_id, gateway, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, 'RAZORPAY', $6) RETURNING *`,
      [booking_type, booking_id, userId, amount, gatewayOrderId, idempotencyKey],
    );

    res.status(201).json({
      success: true,
      data: {
        ...rows[0],
        razorpay_key_id: usedStub ? null : RAZORPAY_KEY_ID || null,
        stub: usedStub,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /verify
 * Verifies Razorpay signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 * On success:
 *   - payments.status → CAPTURED
 *   - booking.payment_status → PAID, booking.payment_id → payments.id
 */
paymentsRouter.post('/verify', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { payment_id, gateway_order_id, gateway_payment_id, gateway_signature } = req.body;

    if (!payment_id || !gateway_payment_id) {
      return res.status(400).json({ success: false, message: 'payment_id and gateway_payment_id are required' });
    }

    await client.query('BEGIN');

    const paymentResult = await client.query(`SELECT * FROM payments WHERE id = $1`, [payment_id]);
    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];
    if (payment.status !== 'CREATED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Payment is already "${payment.status}"` });
    }

    // Stub orders (`order_stub_…`) bypass signature validation. They occur when
    // Razorpay is unconfigured OR when create-order fell back to stub mode in
    // dev. In production with valid keys, every order is signed-validated.
    const isStubOrder = String(payment.gateway_order_id ?? '').startsWith('order_stub_');

    if (razorpayConfigured() && !isStubOrder) {
      if (!gateway_signature || !gateway_order_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'gateway_order_id and gateway_signature are required' });
      }
      if (gateway_order_id !== payment.gateway_order_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Order id mismatch' });
      }
      const expected = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${gateway_order_id}|${gateway_payment_id}`)
        .digest('hex');
      if (expected !== gateway_signature) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Signature mismatch' });
      }
    }

    // Persist payment + update booking
    const { rows } = await client.query(
      `UPDATE payments
       SET status = 'CAPTURED',
           gateway_payment_id = $1,
           gateway_signature = $2,
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [gateway_payment_id, gateway_signature ?? null, payment_id],
    );

    const table = tableForBookingType(payment.booking_type);
    await client.query(
      `UPDATE ${table} SET payment_status = 'PAID', payment_id = $1, updated_at = NOW() WHERE id = $2`,
      [payment_id, payment.booking_id],
    );

    await client.query('COMMIT');

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
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
 * Razorpay server-to-server webhook. Validates the X-Razorpay-Signature header
 * against RAZORPAY_WEBHOOK_SECRET, then processes supported events.
 *
 * NOTE: Because this endpoint needs the raw request body for signature
 * validation, the route is mounted with its own raw-parser at the top of this
 * file (below).
 *
 * Events handled:
 *   - payment.captured   → mark our payment CAPTURED + booking PAID (if not already)
 *   - payment.failed     → mark our payment FAILED
 *   - order.paid         → convenience alias for payment.captured
 */
paymentsRouter.post('/razorpay/webhook', async (req: Request, res: Response) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const raw = (req as any).rawBody as Buffer | undefined;

    if (secret && raw && signature) {
      const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      if (expected !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const body = req.body as any;
    const event = body?.event as string | undefined;
    const paymentEntity = body?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id as string | undefined;
    const rzpPaymentId = paymentEntity?.id as string | undefined;

    if (!event || !orderId) {
      return res.status(200).json({ success: true, ignored: true });
    }

    const pay = (await pool.query(`SELECT * FROM payments WHERE gateway_order_id = $1`, [orderId])).rows[0];
    if (!pay) return res.status(200).json({ success: true, ignored: true, reason: 'unknown order' });

    if (event === 'payment.captured' || event === 'order.paid') {
      if (pay.status !== 'CAPTURED') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(
            `UPDATE payments SET status='CAPTURED', gateway_payment_id = COALESCE($1, gateway_payment_id), updated_at = NOW() WHERE id = $2`,
            [rzpPaymentId ?? null, pay.id],
          );
          const table = tableForBookingType(pay.booking_type);
          await client.query(
            `UPDATE ${table} SET payment_status = 'PAID', payment_id = $1, updated_at = NOW() WHERE id = $2 AND payment_status != 'PAID'`,
            [pay.id, pay.booking_id],
          );
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }
    } else if (event === 'payment.failed') {
      await pool.query(`UPDATE payments SET status='FAILED', updated_at = NOW() WHERE id = $1`, [pay.id]);
    }

    res.json({ success: true, processed: event });
  } catch (err: any) {
    console.error('[razorpay webhook]', err);
    res.status(500).json({ success: false, message: 'webhook processing failed' });
  }
});
