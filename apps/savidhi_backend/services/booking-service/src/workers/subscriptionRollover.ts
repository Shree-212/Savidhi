// Weekly Subscription Rollover worker (PDF item 6, Phase B).
//
// For every active SUBSCRIPTION parent booking whose next_charge_at falls
// within the next 7 days, this worker:
//   1. Finds the next puja_event / chadhava_event after the parent's last
//      charged event.
//   2. Materialises a CHILD booking that inherits the parent's cost, devotees,
//      offerings, addresses, etc.
//   3. Calls Razorpay `payments.createRecurringPayment` using the saved
//      mandate token.
//   4. On success records a payments row, marks the child booking PAID,
//      decrements parent.subscription_remaining, advances next_charge_at to
//      the event AFTER the one we just charged.
//   5. On failure leaves the child as a PENDING placeholder (payment_status
//      stays null/CREATED) and logs the error — next tick will retry.
//
// Designed to be re-runnable: a child booking is keyed by
// (parent_booking_id, event_id) — if the previous tick already created it but
// crashed before charging, the next tick picks up where it left off.
//
// Triggered by k8s/31-cronjob-subscription-rollover.yaml on a weekly schedule
// in production. In dev `startSubscriptionRolloverWorker` can be wired for
// a setInterval ticker.

import { pool } from '../lib/db';
import { chargeRecurring } from '../lib/razorpayHelpers';

interface ParentRow {
  id: string;
  devotee_id: string;
  cost: string;                       // numeric → comes back as string
  sankalp: string | null;
  prasad_delivery_address: string | null;
  razorpay_token_id: string;
  razorpay_customer_id: string;
  subscription_remaining: number;
  next_charge_at: string;             // ISO timestamp
  event_id: string;                   // FK to puja_events / chadhava_events
  event_parent_id: string;            // puja_id / chadhava_id (resolved from event)
  devotee_count?: number;             // puja-only
  devotee_name: string;
  devotee_phone: string;
}

/** Per-tick metrics that the caller can log / surface. */
export interface RolloverStats {
  puja_attempted: number;
  puja_charged: number;
  puja_failed: number;
  chadhava_attempted: number;
  chadhava_charged: number;
  chadhava_failed: number;
}

const LOOKAHEAD_DAYS = 7;

export async function tickSubscriptionRollover(): Promise<RolloverStats> {
  const stats: RolloverStats = {
    puja_attempted: 0,
    puja_charged: 0,
    puja_failed: 0,
    chadhava_attempted: 0,
    chadhava_charged: 0,
    chadhava_failed: 0,
  };

  // ─── Puja side ───────────────────────────────────────────────────────────
  const pujaParents = await pool.query(
    `SELECT pb.id, pb.devotee_id, pb.cost, pb.sankalp, pb.prasad_delivery_address,
            pb.razorpay_token_id, pb.razorpay_customer_id,
            pb.subscription_remaining, pb.next_charge_at,
            pb.puja_event_id AS event_id, pe.puja_id AS event_parent_id,
            pb.devotee_count,
            d.name AS devotee_name, d.phone AS devotee_phone
       FROM puja_bookings pb
       JOIN puja_events pe ON pe.id = pb.puja_event_id
       JOIN devotees d ON d.id = pb.devotee_id
      WHERE pb.booking_type = 'SUBSCRIPTION'
        AND pb.status <> 'CANCELLED'
        AND pb.subscription_remaining > 0
        AND pb.razorpay_token_id IS NOT NULL
        AND pb.razorpay_customer_id IS NOT NULL
        AND pb.next_charge_at IS NOT NULL
        AND pb.next_charge_at <= NOW() + INTERVAL '${LOOKAHEAD_DAYS} days'`,
  );
  for (const parent of pujaParents.rows as ParentRow[]) {
    stats.puja_attempted += 1;
    const ok = await rolloverOnePuja(parent);
    if (ok) stats.puja_charged += 1;
    else stats.puja_failed += 1;
  }

  // ─── Chadhava side ───────────────────────────────────────────────────────
  const chadhavaParents = await pool.query(
    `SELECT cb.id, cb.devotee_id, cb.cost, cb.sankalp, cb.prasad_delivery_address,
            cb.razorpay_token_id, cb.razorpay_customer_id,
            cb.subscription_remaining, cb.next_charge_at,
            cb.chadhava_event_id AS event_id, ce.chadhava_id AS event_parent_id,
            d.name AS devotee_name, d.phone AS devotee_phone
       FROM chadhava_bookings cb
       JOIN chadhava_events ce ON ce.id = cb.chadhava_event_id
       JOIN devotees d ON d.id = cb.devotee_id
      WHERE cb.booking_type = 'SUBSCRIPTION'
        AND cb.status <> 'CANCELLED'
        AND cb.subscription_remaining > 0
        AND cb.razorpay_token_id IS NOT NULL
        AND cb.razorpay_customer_id IS NOT NULL
        AND cb.next_charge_at IS NOT NULL
        AND cb.next_charge_at <= NOW() + INTERVAL '${LOOKAHEAD_DAYS} days'`,
  );
  for (const parent of chadhavaParents.rows as ParentRow[]) {
    stats.chadhava_attempted += 1;
    const ok = await rolloverOneChadhava(parent);
    if (ok) stats.chadhava_charged += 1;
    else stats.chadhava_failed += 1;
  }

  if (
    stats.puja_attempted + stats.chadhava_attempted > 0 ||
    process.env.SUBSCRIPTION_ROLLOVER_VERBOSE === 'true'
  ) {
    console.log('[subscriptionRollover]', stats);
  }
  return stats;
}

/** Roll over one puja parent. Returns true on successful charge. */
async function rolloverOnePuja(parent: ParentRow): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the parent row to keep two concurrent worker pods from
    // double-billing the same subscription.
    const locked = await client.query(
      `SELECT subscription_remaining, next_charge_at FROM puja_bookings
        WHERE id = $1 FOR UPDATE`,
      [parent.id],
    );
    if (locked.rows.length === 0 || locked.rows[0].subscription_remaining <= 0) {
      await client.query('ROLLBACK');
      return false;
    }

    // Find the next puja_event for this puja AFTER the parent's last charged
    // event (which is what `next_charge_at` currently points to or the row's
    // existing puja_event_id maps to). We look for the earliest event whose
    // start_time >= parent.next_charge_at.
    const nextEv = (await client.query(
      `SELECT id, start_time, max_bookings FROM puja_events
        WHERE puja_id = $1
          AND start_time >= $2
          AND status NOT IN ('CANCELLED', 'COMPLETED')
          AND id <> $3
        ORDER BY start_time ASC LIMIT 1`,
      [parent.event_parent_id, parent.next_charge_at, parent.event_id],
    )).rows[0];

    if (!nextEv) {
      // No event scheduled yet — leave parent alone, admin will create more.
      await client.query('ROLLBACK');
      console.log('[subscriptionRollover] puja: no next event yet', { parent_id: parent.id });
      return false;
    }

    // Idempotency: if we already created the child for this (parent, event)
    // pair on a previous tick, reuse it instead of inserting again.
    const existingChild = (await client.query(
      `SELECT id, payment_status FROM puja_bookings
        WHERE parent_booking_id = $1 AND puja_event_id = $2`,
      [parent.id, nextEv.id],
    )).rows[0];

    let childId: string;
    if (existingChild) {
      childId = existingChild.id;
      if (existingChild.payment_status === 'PAID') {
        // Already paid on a previous tick — just advance the parent's pointer.
        await advanceParentPuja(client, parent.id, nextEv.id);
        await client.query('COMMIT');
        return true;
      }
    } else {
      // Insert child booking inheriting parent's snapshot. status=NOT_STARTED
      // matches the post-cutover convention (see migration 017); payment_status
      // is intentionally NULL until charge completes.
      const childRow = (await client.query(
        `INSERT INTO puja_bookings (
           puja_event_id, devotee_id, devotee_count, cost,
           sankalp, prasad_delivery_address,
           booking_type, parent_booking_id, status
         ) VALUES ($1, $2, $3, $4, $5, $6, 'SUBSCRIPTION', $7, 'NOT_STARTED')
         RETURNING id`,
        [
          nextEv.id, parent.devotee_id, parent.devotee_count ?? 1, parent.cost,
          parent.sankalp, parent.prasad_delivery_address, parent.id,
        ],
      )).rows[0];
      childId = childRow.id;

      // Copy per-booking devotee detail rows so the sankalp form has them.
      await client.query(
        `INSERT INTO puja_booking_devotees (puja_booking_id, name, relation, gotra)
         SELECT $1, name, relation, gotra
           FROM puja_booking_devotees WHERE puja_booking_id = $2`,
        [childId, parent.id],
      );
    }

    // Attempt the recurring charge.
    const charge = await chargeRecurring({
      amount: Number(parent.cost),
      customer_id: parent.razorpay_customer_id,
      token_id: parent.razorpay_token_id,
      email: `devotee.${parent.devotee_id.slice(0, 8)}@savidhi.in`,
      contact: parent.devotee_phone || '',
      description: `Savidhi subscription puja charge ${childId.slice(0, 8)}`,
      receipt: `sub_${childId.slice(0, 18)}`,
      notes: { booking_type: 'PUJA', booking_id: childId, parent_booking_id: parent.id },
    });

    if (!charge.ok) {
      console.warn('[subscriptionRollover] puja charge failed', {
        parent_id: parent.id, child_id: childId, error: charge.error,
      });
      // Keep the child row so the next tick can retry without re-inserting.
      await client.query('COMMIT');
      return false;
    }

    // Record the payment row (matches the schema used by /create-order).
    await client.query(
      `INSERT INTO payments (
         booking_type, booking_id, devotee_id, amount,
         gateway_order_id, gateway_payment_id, gateway, status, idempotency_key
       ) VALUES ('PUJA', $1, $2, $3, $4, $5, 'RAZORPAY', 'CAPTURED', $6)`,
      [
        childId, parent.devotee_id, parent.cost,
        charge.razorpay_order_id, charge.razorpay_payment_id,
        `SUBSCRIPTION:${parent.id}:${nextEv.id}`,
      ],
    );
    await client.query(
      `UPDATE puja_bookings SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1`,
      [childId],
    );

    // Advance the parent pointer.
    await advanceParentPuja(client, parent.id, nextEv.id);
    await client.query('COMMIT');
    console.log('[subscriptionRollover] puja charged', {
      parent_id: parent.id, child_id: childId, amount: parent.cost, stub: charge.stub,
    });
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[subscriptionRollover] puja rollover error', { parent_id: parent.id, err });
    return false;
  } finally {
    client.release();
  }
}

/** Decrement parent.subscription_remaining and advance next_charge_at to the
 *  NEXT puja_event after the one we just charged. Sets next_charge_at to NULL
 *  when subscription_remaining reaches 0 so the worker stops picking it up. */
async function advanceParentPuja(client: any, parentId: string, lastEventId: string): Promise<void> {
  const nextNextEv = (await client.query(
    `SELECT pe.start_time
       FROM puja_events pe
      WHERE pe.puja_id = (SELECT puja_id FROM puja_events WHERE id = $1)
        AND pe.start_time > (SELECT start_time FROM puja_events WHERE id = $1)
        AND pe.status NOT IN ('CANCELLED', 'COMPLETED')
      ORDER BY pe.start_time ASC LIMIT 1`,
    [lastEventId],
  )).rows[0];
  await client.query(
    `UPDATE puja_bookings
        SET subscription_remaining = GREATEST(subscription_remaining - 1, 0),
            next_charge_at = CASE
              WHEN subscription_remaining - 1 <= 0 THEN NULL
              ELSE $2
            END,
            updated_at = NOW()
      WHERE id = $1`,
    [parentId, nextNextEv?.start_time ?? null],
  );
}

/** Chadhava sibling — same shape but with offerings copied across. */
async function rolloverOneChadhava(parent: ParentRow): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const locked = await client.query(
      `SELECT subscription_remaining FROM chadhava_bookings WHERE id = $1 FOR UPDATE`,
      [parent.id],
    );
    if (locked.rows.length === 0 || locked.rows[0].subscription_remaining <= 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const nextEv = (await client.query(
      `SELECT id, start_time FROM chadhava_events
        WHERE chadhava_id = $1
          AND start_time >= $2
          AND status NOT IN ('CANCELLED', 'COMPLETED')
          AND id <> $3
        ORDER BY start_time ASC LIMIT 1`,
      [parent.event_parent_id, parent.next_charge_at, parent.event_id],
    )).rows[0];

    if (!nextEv) {
      await client.query('ROLLBACK');
      console.log('[subscriptionRollover] chadhava: no next event yet', { parent_id: parent.id });
      return false;
    }

    const existingChild = (await client.query(
      `SELECT id, payment_status FROM chadhava_bookings
        WHERE parent_booking_id = $1 AND chadhava_event_id = $2`,
      [parent.id, nextEv.id],
    )).rows[0];

    let childId: string;
    if (existingChild) {
      childId = existingChild.id;
      if (existingChild.payment_status === 'PAID') {
        await advanceParentChadhava(client, parent.id, nextEv.id);
        await client.query('COMMIT');
        return true;
      }
    } else {
      const childRow = (await client.query(
        `INSERT INTO chadhava_bookings (
           chadhava_event_id, devotee_id, cost,
           sankalp, prasad_delivery_address,
           booking_type, parent_booking_id, status
         ) VALUES ($1, $2, $3, $4, $5, 'SUBSCRIPTION', $6, 'NOT_STARTED')
         RETURNING id`,
        [
          nextEv.id, parent.devotee_id, parent.cost,
          parent.sankalp, parent.prasad_delivery_address, parent.id,
        ],
      )).rows[0];
      childId = childRow.id;

      // Copy devotees + offerings so the child is a full snapshot of the parent.
      await client.query(
        `INSERT INTO chadhava_booking_devotees (chadhava_booking_id, name, gotra)
         SELECT $1, name, gotra
           FROM chadhava_booking_devotees WHERE chadhava_booking_id = $2`,
        [childId, parent.id],
      );
      await client.query(
        `INSERT INTO chadhava_booking_offerings (chadhava_booking_id, offering_id, quantity, unit_price)
         SELECT $1, offering_id, quantity, unit_price
           FROM chadhava_booking_offerings WHERE chadhava_booking_id = $2`,
        [childId, parent.id],
      );
    }

    const charge = await chargeRecurring({
      amount: Number(parent.cost),
      customer_id: parent.razorpay_customer_id,
      token_id: parent.razorpay_token_id,
      email: `devotee.${parent.devotee_id.slice(0, 8)}@savidhi.in`,
      contact: parent.devotee_phone || '',
      description: `Savidhi subscription chadhava charge ${childId.slice(0, 8)}`,
      receipt: `sub_${childId.slice(0, 18)}`,
      notes: { booking_type: 'CHADHAVA', booking_id: childId, parent_booking_id: parent.id },
    });

    if (!charge.ok) {
      console.warn('[subscriptionRollover] chadhava charge failed', {
        parent_id: parent.id, child_id: childId, error: charge.error,
      });
      await client.query('COMMIT');
      return false;
    }

    await client.query(
      `INSERT INTO payments (
         booking_type, booking_id, devotee_id, amount,
         gateway_order_id, gateway_payment_id, gateway, status, idempotency_key
       ) VALUES ('CHADHAVA', $1, $2, $3, $4, $5, 'RAZORPAY', 'CAPTURED', $6)`,
      [
        childId, parent.devotee_id, parent.cost,
        charge.razorpay_order_id, charge.razorpay_payment_id,
        `SUBSCRIPTION:${parent.id}:${nextEv.id}`,
      ],
    );
    await client.query(
      `UPDATE chadhava_bookings SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1`,
      [childId],
    );

    await advanceParentChadhava(client, parent.id, nextEv.id);
    await client.query('COMMIT');
    console.log('[subscriptionRollover] chadhava charged', {
      parent_id: parent.id, child_id: childId, amount: parent.cost, stub: charge.stub,
    });
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[subscriptionRollover] chadhava rollover error', { parent_id: parent.id, err });
    return false;
  } finally {
    client.release();
  }
}

async function advanceParentChadhava(client: any, parentId: string, lastEventId: string): Promise<void> {
  const nextNextEv = (await client.query(
    `SELECT ce.start_time
       FROM chadhava_events ce
      WHERE ce.chadhava_id = (SELECT chadhava_id FROM chadhava_events WHERE id = $1)
        AND ce.start_time > (SELECT start_time FROM chadhava_events WHERE id = $1)
        AND ce.status NOT IN ('CANCELLED', 'COMPLETED')
      ORDER BY ce.start_time ASC LIMIT 1`,
    [lastEventId],
  )).rows[0];
  await client.query(
    `UPDATE chadhava_bookings
        SET subscription_remaining = GREATEST(subscription_remaining - 1, 0),
            next_charge_at = CASE
              WHEN subscription_remaining - 1 <= 0 THEN NULL
              ELSE $2
            END,
            updated_at = NOW()
      WHERE id = $1`,
    [parentId, nextNextEv?.start_time ?? null],
  );
}

/** Dev-mode in-process ticker. Production uses k8s/31-cronjob-subscription-rollover.yaml. */
export function startSubscriptionRolloverWorker(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  void tickSubscriptionRollover().catch((err) =>
    console.error('[subscriptionRollover] initial tick failed:', err),
  );
  const handle = setInterval(() => {
    void tickSubscriptionRollover().catch((err) =>
      console.error('[subscriptionRollover] tick failed:', err),
    );
  }, intervalMs);
  if (typeof handle.unref === 'function') handle.unref();
  return handle;
}
