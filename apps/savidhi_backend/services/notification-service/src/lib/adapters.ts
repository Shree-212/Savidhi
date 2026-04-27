/**
 * Real-provider adapters for outbound messaging.
 *
 * Each adapter gracefully falls back to a console log if its provider is not
 * configured (empty env vars) — so dev never breaks, and production fails loud
 * only on actual provider errors.
 *
 * Providers:
 *   - Twilio Programmable SMS  (reuse TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN)
 *   - Twilio WhatsApp (messaging service or sandbox)
 *   - Nodemailer SMTP (any standard SMTP host)
 *   - Firebase Admin SDK (FCM) — token-based push
 */

import twilio from 'twilio';
import nodemailer, { Transporter } from 'nodemailer';

// ─── Twilio (shared across SMS + WhatsApp) ───────────────────────────────────
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM ?? '';                         // e.g. "+14155552671"
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM ?? '';               // e.g. "whatsapp:+14155238886"

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

function toE164(phone: string): string {
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.length === 10) return `+91${clean}`;
  if (clean.length === 12 && clean.startsWith('91')) return `+${clean}`;
  return `+${clean}`;
}

// ─── SMS ─────────────────────────────────────────────────────────────────────

export interface SendSmsResult { provider: 'twilio' | 'stub'; sid?: string }

export async function sendSms(phone: string, body: string): Promise<SendSmsResult> {
  if (twilioClient && TWILIO_SMS_FROM) {
    const msg = await twilioClient.messages.create({
      from: TWILIO_SMS_FROM,
      to: toE164(phone),
      body,
    });
    return { provider: 'twilio', sid: msg.sid };
  }
  // Dev fallback
  console.log(`[sms:stub] to=${phone}  body=${body}`);
  return { provider: 'stub' };
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

export interface SendWhatsAppResult { provider: 'twilio-whatsapp' | 'stub'; sid?: string }

export async function sendWhatsApp(
  phone: string,
  body: string,
  opts?: { mediaUrl?: string[] },
): Promise<SendWhatsAppResult> {
  if (twilioClient && TWILIO_WHATSAPP_FROM) {
    const msg = await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${toE164(phone)}`,
      body,
      mediaUrl: opts?.mediaUrl,
    });
    return { provider: 'twilio-whatsapp', sid: msg.sid };
  }
  console.log(`[whatsapp:stub] to=${phone}  body=${body}`);
  return { provider: 'stub' };
}

// ─── Email (Nodemailer SMTP) ─────────────────────────────────────────────────

const SMTP_HOST = process.env.SMTP_HOST ?? '';
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER ?? '';
const SMTP_PASS = process.env.SMTP_PASS ?? '';
const SMTP_FROM = process.env.SMTP_FROM ?? 'Savidhi <no-reply@savidhi.in>';

let mailer: Transporter | null = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export interface SendEmailResult { provider: 'smtp' | 'stub'; messageId?: string }

export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  if (mailer) {
    const info = await mailer.sendMail({ from: SMTP_FROM, to, subject, html });
    return { provider: 'smtp', messageId: info.messageId };
  }
  console.log(`[email:stub] to=${to}  subject=${subject}`);
  return { provider: 'stub' };
}

// ─── FCM Push ────────────────────────────────────────────────────────────────
// We lazy-import firebase-admin so the service still starts when the key is
// missing (avoids forcing every dev to set up a Firebase project).

const FCM_KEY_JSON = process.env.FCM_SERVICE_ACCOUNT_JSON ?? '';
let fcmMessaging: any = null;

async function getFcm() {
  if (fcmMessaging) return fcmMessaging;
  if (!FCM_KEY_JSON) return null;
  try {
    // firebase-admin is an optional runtime dep — only loaded when FCM_KEY_JSON is set.
    const admin: any = await import('firebase-admin' as any);
    if (!admin.apps.length) {
      const creds = JSON.parse(FCM_KEY_JSON);
      admin.initializeApp({ credential: admin.credential.cert(creds) });
    }
    fcmMessaging = admin.messaging();
    return fcmMessaging;
  } catch (err) {
    console.warn('[fcm] failed to init firebase-admin:', (err as Error).message);
    return null;
  }
}

export interface SendPushResult { provider: 'fcm' | 'stub'; messageId?: string }

export async function sendPush(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<SendPushResult> {
  const messaging = await getFcm();
  if (messaging) {
    const messageId = await messaging.send({
      token: deviceToken,
      notification: { title, body },
      data: data ?? {},
    });
    return { provider: 'fcm', messageId };
  }
  console.log(`[push:stub] token=${deviceToken.slice(0, 12)}…  title=${title}`);
  return { provider: 'stub' };
}
