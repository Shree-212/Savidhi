/**
 * Twilio Verify integration.
 *
 * Reads credentials from env:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_VERIFY_SERVICE_SID  (if empty, a service is created on first call)
 *
 * Exposes a tiny surface:
 *   ensureService()         – lazily create + cache a Verify service SID
 *   sendOtp(phone)          – triggers an SMS via Twilio Verify
 *   checkOtp(phone, code)   – returns true if the code matches
 *   isConfigured()          – true if account SID & token are present
 *
 * When `isConfigured()` is false, the caller should fall back to the
 * Redis-based stub. We also treat *any* Twilio error as falling back to the
 * stub in dev — real failures surface as plain errors with `err.twilio`.
 */

import twilio from 'twilio';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';
let SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID ?? '';

const client = ACCOUNT_SID && AUTH_TOKEN ? twilio(ACCOUNT_SID, AUTH_TOKEN) : null;

export function isConfigured(): boolean {
  return !!client;
}

/** Return a Verify Service SID, creating one on first use. */
async function ensureService(): Promise<string> {
  if (!client) throw new Error('Twilio client not configured');
  if (SERVICE_SID) return SERVICE_SID;

  // Look for an existing service named "Savidhi OTP" first
  try {
    const services = await client.verify.v2.services.list({ limit: 20 });
    const existing = services.find((s) => s.friendlyName === 'Savidhi OTP');
    if (existing) {
      SERVICE_SID = existing.sid;
      // eslint-disable-next-line no-console
      console.log(`[twilio] Reusing existing Verify service ${existing.sid}`);
      // eslint-disable-next-line no-console
      console.log('  → Add TWILIO_VERIFY_SERVICE_SID=' + existing.sid + ' to .env to skip this lookup');
      return SERVICE_SID;
    }
  } catch {
    /* list may fail on fresh account - continue to create */
  }

  const created = await client.verify.v2.services.create({ friendlyName: 'Savidhi OTP' });
  SERVICE_SID = created.sid;
  // eslint-disable-next-line no-console
  console.log(`[twilio] Created new Verify service ${created.sid}`);
  // eslint-disable-next-line no-console
  console.log('  → Add TWILIO_VERIFY_SERVICE_SID=' + created.sid + ' to .env to skip bootstrap');
  return SERVICE_SID;
}

/** Format an Indian phone number to E.164 (+91...). Other countries passed through. */
function toE164(phone: string): string {
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.length === 10) return `+91${clean}`;        // India default
  if (clean.length === 12 && clean.startsWith('91')) return `+${clean}`;
  return `+${clean}`;
}

/** Trigger an SMS OTP via Twilio Verify. Returns the verification SID. */
export async function sendOtp(phone: string): Promise<string> {
  if (!client) throw new Error('Twilio not configured');
  const serviceSid = await ensureService();
  const to = toE164(phone);
  const verification = await client.verify.v2.services(serviceSid).verifications.create({ to, channel: 'sms' });
  return verification.sid;
}

/** Check an OTP via Twilio Verify. Returns true iff code is approved. */
export async function checkOtp(phone: string, code: string): Promise<boolean> {
  if (!client) throw new Error('Twilio not configured');
  const serviceSid = await ensureService();
  const to = toE164(phone);
  try {
    const check = await client.verify.v2.services(serviceSid).verificationChecks.create({ to, code });
    return check.status === 'approved';
  } catch (err: any) {
    // Twilio returns 404 if the verification expired or never existed
    if (err?.status === 404) return false;
    throw err;
  }
}
