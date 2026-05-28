import { pool } from '../lib/db';

/**
 * Marks payments stuck in CREATED for too long as EXPIRED. These rows exist
 * because the customer opened the Razorpay modal but never completed payment
 * (closed the tab, network died, etc.). Since the deferred-booking flow no
 * longer creates a `puja_bookings` / `chadhava_bookings` / `appointments` row
 * until /verify succeeds, there's nothing to clean up beyond flipping the
 * payment status — the booking simply never existed.
 *
 * 30 min is a generous window: Razorpay's order TTL is 15 min by default, so
 * any payment older than that is definitively stale.
 */
const STALE_AFTER = '30 minutes';

export async function tickExpirePendingPayments(): Promise<void> {
  const res = await pool.query(
    `UPDATE payments
        SET status = 'EXPIRED', updated_at = NOW()
      WHERE status = 'CREATED'
        AND created_at < NOW() - INTERVAL '${STALE_AFTER}'`,
  );
  const expired = res.rowCount ?? 0;
  if (expired > 0) {
    console.log(`[expirePendingPayments] expired=${expired}`);
  }
}

/**
 * Tick every 10 min in dev. In prod this should be replaced by a Kubernetes
 * CronJob — see appointmentAutoComplete for the equivalent pattern.
 */
export function startExpirePendingPaymentsWorker(intervalMs: number = 10 * 60 * 1000): NodeJS.Timeout {
  void tickExpirePendingPayments().catch((err) =>
    console.error('[expirePendingPayments] initial tick failed:', err),
  );
  const handle = setInterval(() => {
    void tickExpirePendingPayments().catch((err) =>
      console.error('[expirePendingPayments] tick failed:', err),
    );
  }, intervalMs);
  if (typeof handle.unref === 'function') handle.unref();
  return handle;
}
