import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// ─── POST /otp/send ───────────────────────────────────────────────────────────
// Placeholder for SMS OTP delivery (Twilio / MSG91)
router.post('/otp/send', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      res.status(400).json({ success: false, message: 'phone and otp are required' });
      return;
    }

    // TODO: integrate Twilio / MSG91
    console.log(`[notification-service] OTP send – phone: ${phone}, otp: ${otp}`);

    res.json({ success: true, message: 'OTP sent (placeholder)' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /whatsapp/send ──────────────────────────────────────────────────────
// Placeholder for WhatsApp Business API
router.post('/whatsapp/send', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, message, templateId } = req.body;

    if (!phone || !message) {
      res.status(400).json({ success: false, message: 'phone and message are required' });
      return;
    }

    // TODO: integrate WhatsApp Business API
    console.log(
      `[notification-service] WhatsApp send – phone: ${phone}, templateId: ${templateId ?? 'none'}, message: ${message}`,
    );

    res.json({ success: true, message: 'WhatsApp message sent (placeholder)' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /push/send ─────────────────────────────────────────────────────────
// Placeholder for Firebase Cloud Messaging (FCM)
router.post('/push/send', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceToken, title, body, data } = req.body;

    if (!deviceToken || !title || !body) {
      res.status(400).json({ success: false, message: 'deviceToken, title and body are required' });
      return;
    }

    // TODO: integrate Firebase Admin SDK
    console.log(
      `[notification-service] Push send – token: ${deviceToken}, title: ${title}, body: ${body}, data: ${JSON.stringify(data ?? {})}`,
    );

    res.json({ success: true, message: 'Push notification sent (placeholder)' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /email/send ─────────────────────────────────────────────────────────
// Placeholder for email delivery (nodemailer / SES)
router.post('/email/send', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      res.status(400).json({ success: false, message: 'to, subject and body are required' });
      return;
    }

    // TODO: integrate nodemailer / AWS SES
    console.log(
      `[notification-service] Email send – to: ${to}, subject: ${subject}, body length: ${body.length}`,
    );

    res.json({ success: true, message: 'Email sent (placeholder)' });
  } catch (err) {
    next(err);
  }
});

export { router as notificationsRouter };
