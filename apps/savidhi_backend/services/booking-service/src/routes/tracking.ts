/**
 * Meta Conversions API proxy — client-fired events.
 *
 * Mounted at /api/v1/bookings/tracking. The web client fires the browser
 * Pixel (window.fbq) AND posts the same event here so the server-side
 * CAPI sibling can be sent. Meta dedups via `event_id`.
 *
 * Purchase is NOT handled here — it's fired by the payment lifecycle
 * (payments.ts /verify and /razorpay/webhook) because that's where the
 * authoritative "money landed" signal exists.
 *
 * Authentication is OPTIONAL: anonymous browsing should still emit
 * ViewContent. If the user is logged in, we enrich user_data with their
 * hashed email/phone via the devotees row.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db';
import {
  sendCapiEventAsync,
  CapiEventName,
  CapiUserIdentifiers,
  CapiCustomData,
} from '../lib/metaCapi';

export const trackingRouter = Router();

const CLIENT_EVENT_NAMES: ReadonlySet<CapiEventName> = new Set([
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
]);

interface TrackingRequestBody {
  event_name?: string;
  event_id?: string;
  event_source_url?: string;
  fbp?: string | null;
  fbc?: string | null;
  custom?: CapiCustomData;
}

trackingRouter.post('/event', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      event_name,
      event_id,
      event_source_url,
      fbp,
      fbc,
      custom,
    } = (req.body ?? {}) as TrackingRequestBody;

    // Always 2xx — tracking should never break the user's session.
    if (!event_name || !event_id) {
      return res.status(202).json({ success: false, message: 'event_name and event_id required' });
    }
    if (!CLIENT_EVENT_NAMES.has(event_name as CapiEventName)) {
      // Purchase is intentionally not allowed here — see file header.
      return res.status(202).json({ success: false, message: `unsupported event_name: ${event_name}` });
    }

    const userId = req.headers['x-user-id'] as string | undefined;
    const clientIp = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? null;
    const userAgent = req.headers['user-agent'] as string | undefined ?? null;

    const user: CapiUserIdentifiers = {
      clientIp,
      userAgent,
      fbp: fbp ?? null,
      fbc: fbc ?? null,
    };

    // Enrich with authenticated user's identifiers when available. Best-
    // effort: a failed lookup still fires the event with browser-only data.
    if (userId) {
      try {
        const dev = (await pool.query(
          `SELECT email, phone, name FROM devotees WHERE id = $1`,
          [userId],
        )).rows[0];
        if (dev) {
          user.externalId = userId;
          user.email = dev.email ?? null;
          user.phone = dev.phone ?? null;
          if (dev.name) {
            const parts = String(dev.name).trim().split(/\s+/);
            user.firstName = parts[0] ?? null;
            user.lastName = parts.slice(1).join(' ') || null;
          }
        }
      } catch (err: any) {
        console.warn('[tracking] devotee lookup failed', { userId, message: err?.message });
      }
    }

    sendCapiEventAsync({
      event_name: event_name as CapiEventName,
      event_id,
      event_source_url: event_source_url ?? null,
      user,
      custom,
      action_source: 'website',
    });

    return res.status(202).json({ success: true });
  } catch (err) {
    next(err);
  }
});
