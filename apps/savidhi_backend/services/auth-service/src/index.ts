import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { connectRedis } from './lib/redis';

const app = express();
const PORT = process.env.PORT ?? 4001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
const _isProd = process.env.NODE_ENV === 'production';
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: _isProd ? 100 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRouter);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectRedis();
    console.log('[auth-service] Redis connected');
  } catch (err) {
    console.warn('[auth-service] Redis not available, OTP features disabled');
  }

  app.listen(PORT, () => {
    console.log(`[auth-service] Running on port ${PORT}`);
  });
}

start();

export default app;
