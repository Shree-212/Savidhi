import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { pool } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import {
  createOrFetchCustomer,
  fetchPaymentToken,
} from '../lib/razorpayHelpers';

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

/**
 * Soft-launch escape hatch. When `PAYMENTS_FORCE_STUB=true` is set on the
 * booking-service deployment, every booking goes through the stub path —
 * Razorpay is never called, the order id is `order_stub_…`, and the verify
 * step accepts the stub signature so the booking is auto-confirmed. Useful
 * when we want users to complete the full booking flow before live payments
 * are switched on. Flip the env back to unset (or "false") to resume normal
 * Razorpay processing.
 */
function paymentsForceStub(): boolean {
  return String(process.env.PAYMENTS_FORCE_STUB ?? '').toLowerCase() === 'true';
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
      // Treat the existing order as a stub if force-stub is on, OR if the
      // stored gateway_order_id starts with `order_stub_`, OR if Razorpay
      // isn't configured. The frontend uses this flag to skip the checkout
      // modal and verify directly.
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

    const validTypes = ['PUJA', 'CHADHAVA', 'APPOINTMENT'];
    if (!validTypes.includes(booking_type)) {
      return res.status(400).json({ success: false, message: `booking_type must be one of: ${validTypes.join(', ')}` });
    }

    const amountPaise = Math.round(Number(amount) * 100);
    if (amountPaise < 100) {
      return res.status(400).json({ success: false, message: 'Amount must be at least ₹1 (100 paise)' });
    }

    // Ensure the booking belongs to this devotee.
    // Phase B: also pull booking_type / razorpay_customer_id so SUBSCRIPTION
    // first payments can open Razorpay in recurring (Auth Transaction) mode.
    // booking_type column doesn't exist on the appointments table, so guard
    // its inclusion in the SELECT list.
    const table = tableForBookingType(booking_type);
    const hasSubscriptionCols = booking_type === 'PUJA' || booking_type === 'CHADHAVA';
    const bookingCheck = await pool.query(
      hasSubscriptionCols
        ? `SELECT id, devotee_id, cost, booking_type, razorpay_customer_id FROM ${table} WHERE id = $1`
        : `SELECT id, devotee_id, cost FROM ${table} WHERE id = $1`,
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

    // Phase B — for SUBSCRIPTION puja/chadhava bookings, the FIRST payment is
    // an "Auth Transaction" that authorises a Razorpay e-mandate token. We
    // need a Razorpay customer_id for that flow.
    const isSubscription = hasSubscriptionCols && bookingCheck.rows[0].booking_type === 'SUBSCRIPTION';
    let recurringCustomerId: string | null = isSubscription
      ? (bookingCheck.rows[0].razorpay_customer_id ?? null)
      : null;
    if (isSubscription && !recurringCustomerId) {
      try {
        const devoteeRow = (await pool.query(
          `SELECT id, name, phone FROM devotees WHERE id = $1`,
          [userId],
        )).rows[0];
        const cust = await createOrFetchCustomer({
          id: userId,
          name: devoteeRow?.name ?? 'Savidhi Devotee',
          phone: devoteeRow?.phone ?? '',
          email: null,
        });
        recurringCustomerId = cust.customer_id;
        // Persist immediately so retry safely reuses the same customer.
        await pool.query(
          `UPDATE ${table} SET razorpay_customer_id = $1 WHERE id = $2`,
          [recurringCustomerId, booking_id],
        );
      } catch (err: any) {
        // Razorpay customer creation failure shouldn't break ONE_TIME-style
        // booking flow — fall back to a non-recurring order. The /verify step
        // will skip token capture if no customer_id is on the booking.
        console.warn('[payments.create-order] customer create failed; falling back to non-recurring',
          err?.error?.description ?? err?.message);
        recurringCustomerId = null;
      }
    }

    // Create Razorpay order. In dev / non-prod we fall back to stub mode if
    // either the keys are missing OR the gateway rejects them (e.g. invalid
    // test keys), so booking flows remain testable end-to-end without a live
    // Razorpay account. In production a Razorpay failure stays a hard error.
    // Soft-launch override: PAYMENTS_FORCE_STUB=true forces stub even in prod.
    let gatewayOrderId: string;
    let usedStub = false;

    if (paymentsForceStub()) {
      gatewayOrderId = `order_stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      usedStub = true;
    } else if (razorpayConfigured()) {
      try {
        // For SUBSCRIPTION first payments include customer_id (and explicit
        // payment_capture) so Razorpay treats this as an Auth Transaction —
        // the eligible payment methods will be e-mandate-capable instruments
        // when the checkout opens with `recurring: 1`.
        const orderOptions: any = {
          amount: amountPaise,
          currency: 'INR',
          receipt: `bkg_${booking_id.slice(0, 18)}`,
          notes: {
            booking_type,
            booking_id,
            devotee_id: userId,
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
        // Phase B: tells the frontend to open Razorpay Checkout with
        // `recurring: 1` so the user is offered e-mandate-capable methods.
        recurring: isSubscription && !!recurringCustomerId,
        razorpay_customer_id: isSubscription ? recurringCustomerId : null,
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

    console.log('[payments.verify] called', { payment_id, gateway_order_id, gateway_payment_id });

    if (!payment_id || !gateway_payment_id) {
      console.warn('[payments.verify] missing required fields', { payment_id, gateway_payment_id });
      return res.status(400).json({ success: false, message: 'payment_id and gateway_payment_id are required' });
    }

    await client.query('BEGIN');

    const paymentResult = await client.query(`SELECT * FROM payments WHERE id = $1`, [payment_id]);
    if (paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // Idempotent: if the webhook already captured this payment, return success
    // so the client navigates to the confirmation screen instead of showing a
    // bogus "Payment verification failed" toast.
    if (payment.status === 'CAPTURED') {
      await client.query('ROLLBACK');
      console.log('[payments.verify] already CAPTURED, returning success', { payment_id });
      return res.json({ success: true, data: payment, alreadyCaptured: true });
    }

    if (payment.status !== 'CREATED') {
      await client.query('ROLLBACK');
      console.warn('[payments.verify] payment not in CREATED state', { payment_id, status: payment.status });
      return res.status(400).json({ success: false, message: `Payment is in "${payment.status}" state — cannot verify` });
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

    // Phase B — for SUBSCRIPTION puja/chadhava bookings, capture the Razorpay
    // token (e-mandate). With the token saved, the weekly rollover worker can
    // create + charge child bookings without re-prompting the devotee.
    //
    // Also advance `next_charge_at` to the START_TIME of the NEXT puja/chadhava
    // event after the one we just paid for (the current event_id on the parent
    // booking) so the worker has a hook for the second cycle. If there's no
    // next event yet, we leave next_charge_at as-is — admin must schedule more
    // events for the rollover to continue.
    if (
      (payment.booking_type === 'PUJA' || payment.booking_type === 'CHADHAVA') &&
      !isStubOrder
    ) {
      try {
        const bookingRow = (await client.query(
          `SELECT booking_type, razorpay_token_id,
                  ${payment.booking_type === 'PUJA' ? 'puja_event_id' : 'chadhava_event_id'} AS event_id
             FROM ${table} WHERE id = $1`,
          [payment.booking_id],
        )).rows[0];

        if (
          bookingRow?.booking_type === 'SUBSCRIPTION' &&
          !bookingRow.razorpay_token_id &&
          gateway_payment_id
        ) {
          const tokenRes = await fetchPaymentToken(gateway_payment_id);
          // Find the next event after the current one for this puja/chadhava.
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
            [tokenRes.token_id, tokenRes.customer_id, nextEv?.start_time ?? null, payment.booking_id],
          );
          console.log('[payments.verify] subscription token captured', {
            booking_id: payment.booking_id,
            token_id: tokenRes.token_id,
            stub: tokenRes.stub,
            next_charge_at: nextEv?.start_time ?? null,
          });
        }
      } catch (err: any) {
        // Failing to capture the token shouldn't fail the verify — the parent
        // payment already succeeded. Log so the daily monitor catches it and
        // an admin can re-trigger or manually fill the field.
        console.warn('[payments.verify] subscription token capture failed',
          err?.error?.description ?? err?.message);
      }
    }

    await client.query('COMMIT');

    console.log('[payments.verify] CAPTURED', { payment_id, booking_type: payment.booking_type, booking_id: payment.booking_id });
    res.json({ success: true, data: rows[0] });
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

    if (secret) {
      // Once the secret is configured, treat signature verification as mandatory.
      // Razorpay always sends `x-razorpay-signature` on every webhook, so any
      // request missing it is either misrouted or forged.
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
    // Token-level events (e-mandate lifecycle, Phase B) carry a different
    // payload shape — the token entity rather than the payment entity.
    const tokenEntity = body?.payload?.token?.entity;
    const tokenId = tokenEntity?.id as string | undefined;
    const tokenCustomerId = tokenEntity?.customer_id as string | undefined;

    console.log('[razorpay webhook] received', { event, orderId, rzpPaymentId, tokenId });

    if (!event) {
      return res.status(200).json({ success: true, ignored: true });
    }

    // ─── Token lifecycle (e-mandate cancellation / expiry) ────────────────
    // When Razorpay tells us a token is no longer chargeable we flip the
    // affected SUBSCRIPTION parent bookings back to ONE_TIME so the weekly
    // rollover worker skips them. Past bookings remain untouched.
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
          console.log('[razorpay webhook] CAPTURED via webhook', { payment_id: pay.id, booking_type: pay.booking_type, booking_id: pay.booking_id });
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      } else {
        console.log('[razorpay webhook] already CAPTURED, no-op', { payment_id: pay.id });
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
