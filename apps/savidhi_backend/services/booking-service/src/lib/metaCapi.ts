/**
 * Meta Conversions API (CAPI) — server-side event sender.
 *
 * Pairs with the browser-side Meta Pixel (window.fbq) to give Meta two
 * signals per user action. Dedup happens automatically on Meta's side via
 * a matching `event_id` between the Pixel and the CAPI call.
 *
 * This module is intentionally a soft dependency:
 *   - When META_CAPI_ACCESS_TOKEN is unset, every call is a no-op (logged
 *     in dev). Useful for local boot without creds.
 *   - When META_PIXEL_ID is unset, same.
 *   - When NODE_ENV !== 'production', `test_event_code` is attached so
 *     events show in Meta Events Manager → Test Events (TEST58456 by
 *     default; override with META_TEST_EVENT_CODE).
 *   - Never throws to the caller. A failing CAPI call must never break
 *     a payment flow.
 *
 * Endpoint: https://graph.facebook.com/v21.0/{PIXEL_ID}/events
 * Docs:     https://developers.facebook.com/docs/marketing-api/conversions-api/
 */

import crypto from 'crypto';

// ─── Env ──────────────────────────────────────────────────────────────────────
const PIXEL_ID = process.env.META_PIXEL_ID ?? '';
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN ?? '';
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE ?? 'TEST58456';
const IS_PROD = process.env.NODE_ENV === 'production';
const GRAPH_VERSION = 'v21.0';

function configured(): boolean {
  return Boolean(PIXEL_ID) && Boolean(ACCESS_TOKEN);
}

// ─── Hashing helpers (SHA256 lowercase trimmed) ───────────────────────────────
// Meta requires every user-data identifier to be SHA256-hashed except
// fbc/fbp/client_ip_address/client_user_agent. Email and phone get an extra
// normalize first (lowercase, strip whitespace, strip non-digit for phone).

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function normalizePhone(raw: string): string {
  // Strip everything except digits; if no country code present and length
  // looks like an Indian mobile (10 digits), prepend 91.
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function normalizeName(raw: string): string {
  return raw.trim().toLowerCase();
}

// ─── Public types ─────────────────────────────────────────────────────────────
export type CapiEventName =
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase';

export interface CapiUserIdentifiers {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  externalId?: string | null;       // your internal user id — hashed by us
  clientIp?: string | null;          // NOT hashed (per Meta spec)
  userAgent?: string | null;         // NOT hashed
  fbp?: string | null;               // _fbp cookie, NOT hashed
  fbc?: string | null;               // _fbc cookie, NOT hashed
}

export interface CapiCustomData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  content_category?: string;
  num_items?: number;
  order_id?: string;
}

export interface CapiEvent {
  event_name: CapiEventName;
  event_id: string;                  // dedup key — must match the Pixel event_id
  event_source_url?: string | null;  // page URL where the user action happened
  user: CapiUserIdentifiers;
  custom?: CapiCustomData;
  event_time?: number;               // unix seconds; defaults to now
  action_source?: 'website' | 'app' | 'system_generated' | 'other';
}

// ─── Payload builder ──────────────────────────────────────────────────────────
function buildUserData(user: CapiUserIdentifiers): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};

  if (user.email)      out.em = sha256Hex(normalizeEmail(user.email));
  if (user.phone)      out.ph = sha256Hex(normalizePhone(user.phone));
  if (user.firstName)  out.fn = sha256Hex(normalizeName(user.firstName));
  if (user.lastName)   out.ln = sha256Hex(normalizeName(user.lastName));
  if (user.externalId) out.external_id = sha256Hex(user.externalId);

  if (user.clientIp)   out.client_ip_address = user.clientIp;
  if (user.userAgent)  out.client_user_agent = user.userAgent;
  if (user.fbp)        out.fbp = user.fbp;
  if (user.fbc)        out.fbc = user.fbc;

  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Send a single event to the Meta Conversions API.
 *
 * Best-effort: returns true on success, false on any failure (logged).
 * Never throws.
 */
export async function sendCapiEvent(evt: CapiEvent): Promise<boolean> {
  if (!configured()) {
    if (!IS_PROD) {
      console.log('[meta-capi] skipped — META_PIXEL_ID or META_CAPI_ACCESS_TOKEN unset', {
        event: evt.event_name,
        event_id: evt.event_id,
      });
    }
    return false;
  }

  const data = [{
    event_name: evt.event_name,
    event_time: evt.event_time ?? Math.floor(Date.now() / 1000),
    event_id: evt.event_id,
    action_source: evt.action_source ?? 'website',
    event_source_url: evt.event_source_url ?? undefined,
    user_data: buildUserData(evt.user),
    custom_data: evt.custom ?? undefined,
  }];

  const body: Record<string, unknown> = {
    data,
    access_token: ACCESS_TOKEN,
  };
  // In non-prod environments, attach the test code so events route to the
  // Test Events tab in Meta Events Manager instead of the live aggregations.
  if (!IS_PROD && TEST_EVENT_CODE) {
    body.test_event_code = TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[meta-capi] non-2xx response', {
        event: evt.event_name,
        event_id: evt.event_id,
        status: res.status,
        body: text.slice(0, 500),
      });
      return false;
    }
    if (!IS_PROD) {
      console.log('[meta-capi] sent', {
        event: evt.event_name,
        event_id: evt.event_id,
        test_event_code: body.test_event_code ?? null,
      });
    }
    return true;
  } catch (err: any) {
    console.warn('[meta-capi] fetch failed', {
      event: evt.event_name,
      event_id: evt.event_id,
      message: err?.message,
    });
    return false;
  }
}

/**
 * Convenience wrapper that fires-and-forgets — for use inside payment
 * handlers where we don't want to delay the response. The CAPI call runs
 * on the next tick.
 */
export function sendCapiEventAsync(evt: CapiEvent): void {
  // setImmediate ensures the HTTP response goes out before we touch the
  // network for analytics.
  setImmediate(() => {
    sendCapiEvent(evt).catch(() => { /* already logged */ });
  });
}
