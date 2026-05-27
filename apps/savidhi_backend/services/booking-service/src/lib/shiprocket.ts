// Shiprocket REST client used by the puja prasad shipping flow.
//
// The booking-service calls these helpers in three places:
//   1. POST /puja-events/:id/ship  — admin clicks "Ship Prashad" on an event
//      that has reached the TO_BE_SHIPPED stage. We loop the event's active
//      bookings, create one Shiprocket order per booking, assign an AWB,
//      and request a single pickup for the whole batch.
//   2. POST /webhooks/shiprocket  — Shiprocket pushes status updates per AWB.
//      We verify the HMAC signature and fold the new status into puja_bookings.
//   3. GET /puja-events/:id/shipments — admin "Refresh status" refreshes a
//      single shipment via /courier/track/awb/{awb}.
//
// Reference: https://apidocs.shiprocket.in/
//
// Behaviour conventions (mirrors razorpayHelpers.ts):
//   - All helpers return structured `{ ok, data | error }` so routes don't
//     have to litter try/catch.
//   - When FEATURE_SHIPROCKET_ENABLED is "false" (or env creds are missing),
//     every helper returns ok:false with reason 'shiprocket_disabled' so the
//     admin Ship modal can render a clear "not configured yet" state without
//     crashing.
//   - The auth token is cached in module-scope memory for 9 days (Shiprocket
//     tokens are valid ~10). On 401 we force-refresh once and retry.

import axios, { AxiosError, AxiosInstance } from 'axios';
import crypto from 'crypto';

const BASE_URL = process.env.SHIPROCKET_API_BASE ?? 'https://apiv2.shiprocket.in';
const EMAIL = process.env.SHIPROCKET_EMAIL ?? '';
const PASSWORD = process.env.SHIPROCKET_PASSWORD ?? '';
const PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_NICKNAME ?? '';
const CHANNEL_ID = process.env.SHIPROCKET_CHANNEL_ID ?? '';
const WEBHOOK_SECRET = process.env.SHIPROCKET_WEBHOOK_SECRET ?? '';
const ENABLED = String(process.env.FEATURE_SHIPROCKET_ENABLED ?? '').toLowerCase() === 'true';

export function shiprocketConfigured(): boolean {
  return ENABLED && !!EMAIL && !!PASSWORD && !!PICKUP_LOCATION;
}

// ─── Auth token cache ────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

let _tokenCache: TokenCache | null = null;

// Shiprocket tokens are documented as valid ~10 days; we refresh at 9 days
// to leave headroom for clock drift between us and their auth server.
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

async function fetchFreshToken(): Promise<string> {
  const res = await axios.post(
    `${BASE_URL}/v1/external/auth/login`,
    { email: EMAIL, password: PASSWORD },
    { timeout: 10_000 },
  );
  const token = res.data?.token;
  if (!token) throw new Error('Shiprocket auth: no token in response');
  _tokenCache = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

async function getToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && _tokenCache && _tokenCache.expiresAt > Date.now()) {
    return _tokenCache.token;
  }
  return fetchFreshToken();
}

async function authedClient(forceRefresh = false): Promise<AxiosInstance> {
  const token = await getToken(forceRefresh);
  return axios.create({
    baseURL: BASE_URL,
    timeout: 20_000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

// Wraps a Shiprocket call so a single 401 triggers a one-shot token refresh +
// retry. Anything else bubbles as a typed error.
async function withAuthRetry<T>(call: (c: AxiosInstance) => Promise<T>): Promise<T> {
  try {
    const c = await authedClient(false);
    return await call(c);
  } catch (err) {
    const ax = err as AxiosError;
    if (ax.response?.status === 401) {
      const c = await authedClient(true);
      return await call(c);
    }
    throw err;
  }
}

// ─── Result type ─────────────────────────────────────────────────────────────

export type SrResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'shiprocket_disabled' | 'api_error' | 'invalid_response'; error?: string };

function asError(err: unknown): string {
  const ax = err as AxiosError<any>;
  if (ax?.response?.data) {
    if (typeof ax.response.data === 'string') return ax.response.data;
    return JSON.stringify(ax.response.data);
  }
  if (ax?.message) return ax.message;
  return String(err);
}

// ─── Order creation ──────────────────────────────────────────────────────────

export interface CreateOrderInput {
  /** Stable, unique id we generate per puja_booking. Shiprocket dedupes on this. */
  order_id: string;
  /** Format "YYYY-MM-DD HH:mm" — Shiprocket is strict. */
  order_date: string;
  /** Nickname registered in Shiprocket panel → Settings → Pickup Addresses. */
  pickup_location: string;
  channel_id?: string;
  comment?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email?: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    discount?: number;
    tax?: number;
    hsn?: string | number;
  }>;
  payment_method: 'Prepaid' | 'COD';
  shipping_charges?: number;
  giftwrap_charges?: number;
  transaction_charges?: number;
  total_discount?: number;
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export interface CreateOrderResult {
  order_id: string | number;
  shipment_id: string | number;
  status?: string;
  status_code?: number;
  onboarding_completed_now?: number;
  awb_code?: string;
  courier_company_id?: number;
  courier_name?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<SrResult<CreateOrderResult>> {
  if (!shiprocketConfigured()) return { ok: false, reason: 'shiprocket_disabled' };
  try {
    const res = await withAuthRetry((c) =>
      c.post('/v1/external/orders/create/adhoc', input).then((r) => r.data),
    );
    if (!res?.order_id || !res?.shipment_id) {
      return { ok: false, reason: 'invalid_response', error: JSON.stringify(res ?? {}) };
    }
    return { ok: true, data: res as CreateOrderResult };
  } catch (err) {
    return { ok: false, reason: 'api_error', error: asError(err) };
  }
}

// ─── AWB allocation ──────────────────────────────────────────────────────────

export interface AssignAwbResult {
  awb_code: string;
  courier_company_id: number;
  courier_name: string;
  shipment_id: number | string;
  /** Shiprocket sometimes returns "expected_delivery_date" as a YYYY-MM-DD string. */
  expected_delivery_date?: string;
}

export async function assignAwb(shipmentId: number | string): Promise<SrResult<AssignAwbResult>> {
  if (!shiprocketConfigured()) return { ok: false, reason: 'shiprocket_disabled' };
  try {
    const res = await withAuthRetry((c) =>
      c.post('/v1/external/courier/assign/awb', { shipment_id: shipmentId }).then((r) => r.data),
    );
    // Shape: { awb_assign_status: 1, response: { data: { awb_code, courier_name, ... } } }
    const data = res?.response?.data ?? res?.data ?? res;
    const awb = data?.awb_code;
    if (!awb) return { ok: false, reason: 'invalid_response', error: JSON.stringify(res ?? {}) };
    return {
      ok: true,
      data: {
        awb_code: String(awb),
        courier_company_id: Number(data.courier_company_id ?? 0),
        courier_name: String(data.courier_name ?? ''),
        shipment_id: data.shipment_id ?? shipmentId,
        expected_delivery_date: data.expected_delivery_date,
      },
    };
  } catch (err) {
    return { ok: false, reason: 'api_error', error: asError(err) };
  }
}

// ─── Pickup scheduling ───────────────────────────────────────────────────────

export interface GeneratePickupResult {
  pickup_status?: number;
  response?: any;
}

export async function generatePickup(shipmentIds: Array<number | string>): Promise<SrResult<GeneratePickupResult>> {
  if (!shiprocketConfigured()) return { ok: false, reason: 'shiprocket_disabled' };
  if (shipmentIds.length === 0) return { ok: true, data: {} };
  try {
    const res = await withAuthRetry((c) =>
      c.post('/v1/external/courier/generate/pickup', { shipment_id: shipmentIds }).then((r) => r.data),
    );
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, reason: 'api_error', error: asError(err) };
  }
}

// ─── Tracking ────────────────────────────────────────────────────────────────

export interface TrackResult {
  tracking_data?: {
    track_status?: number;
    shipment_status?: number;
    shipment_track?: Array<{
      current_status?: string;
      courier_name?: string;
      edd?: string;
    }>;
    shipment_track_activities?: Array<{
      date?: string;
      status?: string;
      activity?: string;
      location?: string;
    }>;
  };
}

export async function trackByAwb(awb: string): Promise<SrResult<TrackResult>> {
  if (!shiprocketConfigured()) return { ok: false, reason: 'shiprocket_disabled' };
  try {
    const res = await withAuthRetry((c) =>
      c.get(`/v1/external/courier/track/awb/${encodeURIComponent(awb)}`).then((r) => r.data),
    );
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, reason: 'api_error', error: asError(err) };
  }
}

// ─── Cancel order ────────────────────────────────────────────────────────────

export async function cancelOrder(srOrderIds: Array<string | number>): Promise<SrResult<{ message?: string }>> {
  if (!shiprocketConfigured()) return { ok: false, reason: 'shiprocket_disabled' };
  try {
    const res = await withAuthRetry((c) =>
      c.post('/v1/external/orders/cancel', { ids: srOrderIds }).then((r) => r.data),
    );
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, reason: 'api_error', error: asError(err) };
  }
}

// ─── Webhook signature verification ──────────────────────────────────────────
//
// Shiprocket's webhook panel uses a plain shared-token scheme: the seller
// configures a token string in the panel, and Shiprocket echoes it back as
// the `x-api-key` header on every webhook POST. We compare against the secret
// we have in env. Constant-time so the comparison can't be probed by timing.

export function verifyWebhookSignature(headers: Record<string, string | string[] | undefined>): boolean {
  if (!WEBHOOK_SECRET) return false;
  const provided =
    (headers['x-api-key'] as string | undefined) ??
    (headers['x-shiprocket-signature'] as string | undefined) ??
    '';
  if (!provided || provided.length !== WEBHOOK_SECRET.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(WEBHOOK_SECRET));
  } catch {
    return false;
  }
}

// ─── Status mapping ──────────────────────────────────────────────────────────
// Shiprocket sends many fine-grained statuses; collapse them to our lifecycle.

export type ShipmentStatus =
  | 'NEW'
  | 'AWB_ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'NDR'
  | 'RTO_INITIATED'
  | 'RTO_DELIVERED'
  | 'CANCELLED';

export function mapShiprocketStatus(raw: string | undefined | null): ShipmentStatus | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase().replace(/[\s_-]+/g, '_');
  if (s.includes('DELIVERED') && s.includes('RTO')) return 'RTO_DELIVERED';
  if (s.includes('RTO')) return 'RTO_INITIATED';
  if (s.includes('OUT_FOR_DELIVERY')) return 'OUT_FOR_DELIVERY';
  if (s.includes('DELIVERED')) return 'DELIVERED';
  if (s.includes('NDR') || s.includes('UNDELIVERED')) return 'NDR';
  if (s.includes('IN_TRANSIT') || s.includes('SHIPPED')) return 'IN_TRANSIT';
  if (s.includes('PICKED_UP') || s.includes('PICKUP_COMPLETE')) return 'PICKED_UP';
  if (s.includes('PICKUP_SCHEDULED') || s.includes('PICKUP_QUEUED') || s.includes('PICKUP_GENERATED')) return 'PICKUP_SCHEDULED';
  if (s.includes('AWB_ASSIGNED') || s.includes('AWB_GENERATED')) return 'AWB_ASSIGNED';
  if (s.includes('CANCEL')) return 'CANCELLED';
  if (s.includes('NEW') || s.includes('CREATED')) return 'NEW';
  return null;
}

// ─── Test helper: reset the in-memory token cache. ───────────────────────────
// Exposed so unit tests can flush stale state between cases.
export function _resetTokenCacheForTests(): void {
  _tokenCache = null;
}
