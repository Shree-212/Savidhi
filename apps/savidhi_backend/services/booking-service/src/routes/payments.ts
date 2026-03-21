import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import { requireAuth } from '../middleware/auth';

export const paymentsRouter = Router();

/** POST /create-order – create a payment record */
paymentsRouter.post('/create-order', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { booking_type, booking_id, amount } = req.body;

    if (!booking_type || !booking_id || amount == null) {
      return res.status(400).json({ success: false, message: 'booking_type, booking_id, and amount are required' });
    }

    const validTypes = ['PUJA', 'CHADHAVA', 'APPOINTMENT'];
    if (!validTypes.includes(booking_type)) {
      return res.status(400).json({ success: false, message: `booking_type must be one of: ${validTypes.join(', ')}` });
    }

    // Verify the booking exists and belongs to the user
    let table: string;
    if (booking_type === 'PUJA') table = 'puja_bookings';
    else if (booking_type === 'CHADHAVA') table = 'chadhava_bookings';
    else table = 'appointments';

    const bookingCheck = await pool.query(
      `SELECT id, devotee_id FROM ${table} WHERE id = $1`,
      [booking_id],
    );
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (bookingCheck.rows[0].devotee_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Generate a placeholder gateway order id
    const gatewayOrderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { rows } = await pool.query(
      `INSERT INTO payments (booking_type, booking_id, devotee_id, amount, gateway_order_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [booking_type, booking_id, userId, amount, gatewayOrderId],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/** POST /verify – verify payment */
paymentsRouter.post('/verify', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { payment_id, gateway_payment_id, gateway_signature } = req.body;

    if (!payment_id || !gateway_payment_id || !gateway_signature) {
      return res.status(400).json({ success: false, message: 'payment_id, gateway_payment_id, and gateway_signature are required' });
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
      return res.status(400).json({ success: false, message: `Payment is already in status "${payment.status}"` });
    }

    // Update payment status to CAPTURED
    const { rows } = await client.query(
      `UPDATE payments
       SET status = 'CAPTURED',
           gateway_payment_id = $1,
           gateway_signature = $2,
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [gateway_payment_id, gateway_signature, payment_id],
    );

    // Update booking payment_status to PAID
    let table: string;
    if (payment.booking_type === 'PUJA') table = 'puja_bookings';
    else if (payment.booking_type === 'CHADHAVA') table = 'chadhava_bookings';
    else table = 'appointments';

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
