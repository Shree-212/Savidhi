import { Router, Request, Response, NextFunction } from 'express';
import { sendSms, sendWhatsApp, sendEmail, sendPush } from '../lib/adapters';

const router = Router();

/**
 * All four endpoints share the same pattern:
 *   1. Validate body
 *   2. Call the matching real-provider adapter (graceful stub fallback in dev)
 *   3. Return { success, provider, ...providerIds }
 */

// ─── POST /sms/send ──────────────────────────────────────────────────────────

router.post('/sms/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, message } = req.body ?? {};
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'phone and message are required' });
    }
    const result = await sendSms(phone, message);
    res.json({ success: true, message: 'SMS dispatched', ...result });
  } catch (err) { next(err); }
});

// Convenience alias kept for backwards-compat with earlier code paths.
router.post('/otp/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp } = req.body ?? {};
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'phone and otp are required' });
    }
    const result = await sendSms(phone, `Your Savidhi verification code is ${otp}. Valid for 5 minutes.`);
    res.json({ success: true, message: 'OTP dispatched', ...result });
  } catch (err) { next(err); }
});

// ─── POST /whatsapp/send ────────────────────────────────────────────────────

router.post('/whatsapp/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, message, mediaUrl } = req.body ?? {};
    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'phone and message are required' });
    }
    const result = await sendWhatsApp(phone, message, { mediaUrl });
    res.json({ success: true, message: 'WhatsApp dispatched', ...result });
  } catch (err) { next(err); }
});

// ─── POST /push/send ────────────────────────────────────────────────────────

router.post('/push/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceToken, title, body, data } = req.body ?? {};
    if (!deviceToken || !title || !body) {
      return res.status(400).json({ success: false, message: 'deviceToken, title, and body are required' });
    }
    const result = await sendPush(deviceToken, title, body, data);
    res.json({ success: true, message: 'Push dispatched', ...result });
  } catch (err) { next(err); }
});

// ─── POST /email/send ───────────────────────────────────────────────────────

router.post('/email/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, subject, body, html } = req.body ?? {};
    if (!to || !subject || (!body && !html)) {
      return res.status(400).json({ success: false, message: 'to, subject, and body/html are required' });
    }
    const result = await sendEmail(to, subject, html ?? `<p>${String(body).replace(/\n/g, '<br/>')}</p>`);
    res.json({ success: true, message: 'Email dispatched', ...result });
  } catch (err) { next(err); }
});

export { router as notificationsRouter };
