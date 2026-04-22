import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { usersRouter } from './routes/users';
import { adminUsersRouter } from './routes/adminUsers';
import { familyRouter } from './routes/family';
import { notificationsRouter } from './routes/notifications';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 4002;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','),
  credentials: true,
}));
app.use(express.json());
const _isProd = process.env.NODE_ENV === 'production';
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: _isProd ? 100 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() });
});

// Devotee self-service routes (/me, /me/gems, /me/achievements, /me/bookings)
// NOTE: devotee-scoped routers MUST be mounted BEFORE adminUsersRouter because
// the latter applies a router-wide `requireAdmin()` guard that would otherwise
// short-circuit requests to /me/family and /me/notifications.
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/users', familyRouter);
app.use('/api/v1/users', notificationsRouter);

// Admin routes (/devotees, /devotees/:id, /admin-users, etc.)
app.use('/api/v1/users', adminUsersRouter);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[user-service] Running on port ${PORT}`);
});

export default app;
