import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { pujaEventsRouter } from './routes/pujaEvents';
import { pujaBookingsRouter } from './routes/pujaBookings';
import { chadhavaEventsRouter } from './routes/chadhavaEvents';
import { chadhavaBookingsRouter } from './routes/chadhavaBookings';
import { appointmentsRouter } from './routes/appointments';
import { paymentsRouter } from './routes/payments';
import { dashboardRouter } from './routes/dashboard';
import { reportsRouter } from './routes/reports';
import { shiprocketWebhookRouter } from './routes/shiprocketWebhook';
import { startAppointmentAutoCompleteWorker } from './workers/appointmentAutoComplete';
import { startExpirePendingPaymentsWorker } from './workers/expirePendingPayments';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ?? 4004;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','),
  credentials: true,
}));
// Preserve raw body for Razorpay webhook HMAC verification.
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      if (req.originalUrl?.includes('/razorpay/webhook')) req.rawBody = buf;
    },
  }),
);
const _isProd = process.env.NODE_ENV === 'production';
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: _isProd ? 500 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'booking-service', timestamp: new Date().toISOString() });
});

app.use('/api/v1/bookings/puja-events', pujaEventsRouter);
app.use('/api/v1/bookings/puja-bookings', pujaBookingsRouter);
app.use('/api/v1/bookings/chadhava-events', chadhavaEventsRouter);
app.use('/api/v1/bookings/chadhava-bookings', chadhavaBookingsRouter);
app.use('/api/v1/bookings/appointments', appointmentsRouter);
app.use('/api/v1/bookings/payments', paymentsRouter);
app.use('/api/v1/bookings/dashboard', dashboardRouter);
app.use('/api/v1/bookings/reports', reportsRouter);

// Shiprocket pushes status updates here. Mounted as `/courier` (NOT
// `/shiprocket`) because the Shiprocket panel rejects webhook URLs that
// contain the words "shiprocket", "kartrocket", "sr", or "kr" — they
// detect those as their own infra and refuse to send to them. See the
// panel note under the Webhooks → URL field.
app.use('/api/v1/webhooks/courier', shiprocketWebhookRouter);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[booking-service] Running on port ${PORT}`);
  // In production this is replaced by a Kubernetes CronJob; locally we run it
  // in-process so dev tests of the appointment state machine work.
  if (process.env.RUN_AUTOCOMPLETE_WORKER !== 'false') {
    startAppointmentAutoCompleteWorker();
  }
  if (process.env.RUN_EXPIRE_PAYMENTS_WORKER !== 'false') {
    startExpirePendingPaymentsWorker();
  }
});

export default app;
