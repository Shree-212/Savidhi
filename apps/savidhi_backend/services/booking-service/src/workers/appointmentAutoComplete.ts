import { pool } from '../lib/db';

const DURATION_TO_INTERVAL: Record<string, string> = {
  '15min': '15 minutes',
  '30min': '30 minutes',
  '1hour': '1 hour',
  '2hour': '2 hours',
};

/**
 * Drives the appointment status state-machine on a tick:
 *   LINK_YET_TO_BE_GENERATED + meet_link IS NOT NULL  → YET_TO_START
 *   YET_TO_START at scheduled_at - 30 min             → INPROGRESS
 *   INPROGRESS at scheduled_at + duration             → COMPLETED
 *
 * Idempotent — safe to run on a 5-minute interval (or as a CronJob in prod).
 */
export async function tickAppointmentAutoComplete(): Promise<void> {
  const linkAdded = await pool.query(
    `UPDATE appointments
        SET status = 'YET_TO_START', updated_at = NOW()
      WHERE status = 'LINK_YET_TO_BE_GENERATED'
        AND meet_link IS NOT NULL
        AND meet_link <> ''`,
  );

  const startable = await pool.query(
    `UPDATE appointments
        SET status = 'INPROGRESS', updated_at = NOW()
      WHERE status = 'YET_TO_START'
        AND scheduled_at - INTERVAL '30 minutes' <= NOW()`,
  );

  // Auto-complete any INPROGRESS appointment past its duration window.
  let completed = 0;
  for (const [duration, interval] of Object.entries(DURATION_TO_INTERVAL)) {
    const r = await pool.query(
      `UPDATE appointments
          SET status = 'COMPLETED', updated_at = NOW()
        WHERE status = 'INPROGRESS'
          AND duration = $1
          AND scheduled_at + INTERVAL '${interval}' <= NOW()`,
      [duration],
    );
    completed += r.rowCount ?? 0;
  }

  const linkCount = linkAdded.rowCount ?? 0;
  const startCount = startable.rowCount ?? 0;
  if (linkCount + startCount + completed > 0) {
    console.log(
      `[appointmentAutoComplete] linkAdded=${linkCount} started=${startCount} completed=${completed}`,
    );
  }
}

/**
 * Start a setInterval-based ticker for development. In production this should
 * be replaced by a Kubernetes CronJob (see k8s/cronjob-appointment-autocomplete.yaml).
 */
export function startAppointmentAutoCompleteWorker(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  // Run once at startup so a freshly-restarted dev box catches up.
  void tickAppointmentAutoComplete().catch((err) =>
    console.error('[appointmentAutoComplete] initial tick failed:', err),
  );

  const handle = setInterval(() => {
    void tickAppointmentAutoComplete().catch((err) =>
      console.error('[appointmentAutoComplete] tick failed:', err),
    );
  }, intervalMs);

  // Don't keep the event loop alive just for this timer.
  if (typeof handle.unref === 'function') handle.unref();
  return handle;
}
