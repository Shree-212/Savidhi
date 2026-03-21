import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { usersRouter } from './routes/users';
import { adminUsersRouter } from './routes/adminUsers';
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
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() });
});

// Devotee self-service routes (/me, /me/gems, /me/achievements, /me/bookings)
app.use('/api/v1/users', usersRouter);

// Admin routes (/devotees, /devotees/:id, /admin-users, etc.)
app.use('/api/v1/users', adminUsersRouter);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[user-service] Running on port ${PORT}`);
});

export default app;
