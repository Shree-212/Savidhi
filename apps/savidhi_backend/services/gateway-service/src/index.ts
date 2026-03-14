import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT ?? 4000;

const AUTH_SERVICE_URL  = process.env.AUTH_SERVICE_URL  ?? 'http://localhost:4001';
const USER_SERVICE_URL  = process.env.USER_SERVICE_URL  ?? 'http://localhost:4002';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','),
  credentials: true,
}));
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:       Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway-service', timestamp: new Date().toISOString() });
});

// ─── Proxy Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
}));

app.use('/api/v1/users', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
}));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[gateway-service] Running on port ${PORT}`);
  console.log(`  → auth:  ${AUTH_SERVICE_URL}`);
  console.log(`  → user:  ${USER_SERVICE_URL}`);
});

export default app;
