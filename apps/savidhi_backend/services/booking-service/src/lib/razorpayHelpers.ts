// Razorpay helpers used by the SUBSCRIPTION flow (Phase B of PDF item 6).
//
// We deliberately wrap each SDK call so:
//   - The booking-service routes don't have to litter `try/catch` around every
//     Razorpay call — these helpers return structured results.
//   - Stub mode (`PAYMENTS_FORCE_STUB=true`) is honoured uniformly, mirroring
//     the pattern already established in routes/payments.ts.
//   - Token / customer creation is idempotent on devotee email when possible
//     (Razorpay's `fail_existing: 0` flag) so re-running the verify step on
//     a SUBSCRIPTION booking doesn't proliferate customer records.
//
// Razorpay reference docs:
//   - Auth Transaction (mandate setup):
//     https://razorpay.com/docs/payments/recurring-payments/emandate/auth-transaction-via-api/
//   - Subsequent recurring charge:
//     https://razorpay.com/docs/api/payments/recurring-payments/emandate/create-subsequent-payments

import Razorpay from 'razorpay';

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';

const client: Razorpay | null =
  KEY_ID && KEY_SECRET ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET }) : null;

export function razorpayConfigured(): boolean {
  return !!client;
}

export function paymentsForceStub(): boolean {
  return String(process.env.PAYMENTS_FORCE_STUB ?? '').toLowerCase() === 'true';
}

/** Stable identifier we use when the Razorpay client isn't available or
 *  PAYMENTS_FORCE_STUB is on — so downstream code can spot stub rows. */
const STUB_CUSTOMER_PREFIX = 'cust_stub_';
const STUB_TOKEN_PREFIX = 'token_stub_';
const STUB_PAYMENT_PREFIX = 'pay_stub_recurring_';

function rand(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface DevoteeForCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
}

export interface CustomerResult {
  customer_id: string;
  stub: boolean;
}

/** Idempotent: passes `fail_existing: 0` so Razorpay returns the existing
 *  customer row when our devotee already has one tied to the same email/phone. */
export async function createOrFetchCustomer(devotee: DevoteeForCustomer): Promise<CustomerResult> {
  if (paymentsForceStub() || !client) {
    return { customer_id: `${STUB_CUSTOMER_PREFIX}${devotee.id.slice(0, 8)}`, stub: true };
  }
  // Razorpay requires email; synthesise one when missing so the API call
  // doesn't 400. Devotee can update later — we only use the id for billing.
  const email = devotee.email && devotee.email.includes('@')
    ? devotee.email
    : `devotee.${devotee.id.slice(0, 8)}@savidhi.in`;
  const customer = await client.customers.create({
    name: devotee.name || 'Savidhi Devotee',
    email,
    contact: devotee.phone || '',
    fail_existing: 0,
  });
  return { customer_id: customer.id, stub: false };
}

// ─── Token capture (after first authorising payment) ─────────────────────────

export interface TokenCaptureResult {
  token_id: string | null;
  customer_id: string | null;
  stub: boolean;
}

/** Reads the `token_id` Razorpay produced when the user authorised the mandate
 *  during the first SUBSCRIPTION payment. Idempotent — safe to call again. */
export async function fetchPaymentToken(razorpayPaymentId: string): Promise<TokenCaptureResult> {
  if (paymentsForceStub() || !client || razorpayPaymentId.startsWith('pay_stub_')) {
    return {
      token_id: `${STUB_TOKEN_PREFIX}${rand()}`,
      customer_id: `${STUB_CUSTOMER_PREFIX}stub`,
      stub: true,
    };
  }
  const payment = await client.payments.fetch(razorpayPaymentId);
  return {
    token_id: (payment as any).token_id ?? null,
    customer_id: (payment as any).customer_id ?? null,
    stub: false,
  };
}

// ─── Subsequent recurring charge (worker) ────────────────────────────────────

export interface ChargeRecurringParams {
  amount: number;       // rupees (we convert to paise internally)
  customer_id: string;
  token_id: string;
  email: string;
  contact: string;
  description: string;
  notes?: Record<string, string>;
  /** Receipt suffix passed to the underlying Razorpay order. */
  receipt: string;
}

export interface ChargeRecurringResult {
  ok: boolean;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  stub: boolean;
  /** Error message if `ok === false`. */
  error?: string;
}

/** Two-step Razorpay flow:
 *    1. orders.create with `payment_capture: 1` and the customer_id
 *    2. payments.createRecurringPayment using the saved token_id
 *  Returns structured success/error instead of throwing — the worker decides
 *  whether to retry next tick or surface to admin. */
export async function chargeRecurring(params: ChargeRecurringParams): Promise<ChargeRecurringResult> {
  const amountPaise = Math.round(params.amount * 100);

  if (paymentsForceStub() || !client || params.token_id.startsWith('token_stub_')) {
    return {
      ok: true,
      razorpay_order_id: `order_stub_recurring_${rand()}`,
      razorpay_payment_id: `${STUB_PAYMENT_PREFIX}${rand()}`,
      stub: true,
    };
  }

  try {
    const order = await client.orders.create({
      amount: amountPaise,
      currency: 'INR',
      customer_id: params.customer_id,
      payment_capture: true,
      receipt: params.receipt,
      notes: params.notes ?? {},
    });

    const payment = await client.payments.createRecurringPayment({
      amount: amountPaise,
      currency: 'INR',
      order_id: order.id,
      email: params.email || `devotee@savidhi.in`,
      contact: params.contact || '',
      customer_id: params.customer_id,
      token: params.token_id,
      recurring: '1',
      description: params.description,
      notes: params.notes ?? {},
    });

    return {
      ok: true,
      razorpay_order_id: order.id,
      razorpay_payment_id: (payment as any).razorpay_payment_id ?? (payment as any).id ?? null,
      stub: false,
    };
  } catch (err: any) {
    return {
      ok: false,
      razorpay_order_id: '',
      razorpay_payment_id: null,
      stub: false,
      error: err?.error?.description ?? err?.message ?? 'Razorpay recurring charge failed',
    };
  }
}

// ─── Cancel token (mandate) ──────────────────────────────────────────────────

export interface CancelTokenResult {
  ok: boolean;
  stub: boolean;
  error?: string;
}

/** Cancels the e-mandate token at Razorpay. Soft-fail: if the API call fails
 *  the caller still completes the DB-side cancel (subscription is dead from
 *  our perspective regardless). */
export async function cancelToken(customerId: string, tokenId: string): Promise<CancelTokenResult> {
  if (paymentsForceStub() || !client || tokenId.startsWith('token_stub_')) {
    return { ok: true, stub: true };
  }
  try {
    await client.customers.deleteToken(customerId, tokenId);
    return { ok: true, stub: false };
  } catch (err: any) {
    return {
      ok: false,
      stub: false,
      error: err?.error?.description ?? err?.message ?? 'Token cancel failed',
    };
  }
}
