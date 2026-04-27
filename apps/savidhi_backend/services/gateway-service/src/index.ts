import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';

const app = express();
// Trust the GKE/Cloud Run load balancer (single hop) so X-Forwarded-For is
// honoured for client IP detection by express-rate-limit and the gateway logs.
app.set('trust proxy', 1);
const PORT = process.env.PORT ?? 4000;

const AUTH_SERVICE_URL    = process.env.AUTH_SERVICE_URL    ?? 'http://localhost:4001';
const USER_SERVICE_URL    = process.env.USER_SERVICE_URL    ?? 'http://localhost:4002';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL ?? 'http://localhost:4003';
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:4004';
const MEDIA_SERVICE_URL   = process.env.MEDIA_SERVICE_URL   ?? 'http://localhost:4005';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','),
  credentials: true,
}));
// In development the rate-limiter is effectively off — hot-reload + Next.js
// dev server can easily issue 200+ requests per minute per tab. We only enforce
// in production, and even then we skip static media so a page load's image
// fan-out doesn't blow the budget.
const isProd = process.env.NODE_ENV === 'production';

app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:       isProd ? (Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 600) : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/health' ||
    req.path.startsWith('/uploads/') ||
    req.path.startsWith('/api/v1/media/files/'),
}));

// ─── JWT Verification Middleware ──────────────────────────────────────────────
// Extracts token from Authorization header or admin cookie,
// verifies via auth-service, and forwards user info as headers
async function jwtMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.headers.cookie
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('savidhi_admin_token='))
      ?.split('=')[1];

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : cookieToken;

    if (!token) {
      // No token - proceed without user context (public routes)
      return next();
    }

    // Verify token via auth-service

    const response = await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/verify`, {
      headers: { Authorization: `Bearer ${token}`, Cookie: `savidhi_admin_token=${token}` },
      timeout: 3000,
    });

    if (response.data?.success && response.data?.data) {
      const { userId, userType, userRole } = response.data.data;
      req.headers['x-user-id'] = userId;
      req.headers['x-user-type'] = userType;
      req.headers['x-user-role'] = userRole;
    }
  } catch {
    // Token verification failed - proceed without user context
  }
  next();
}

app.use(jwtMiddleware);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway-service', timestamp: new Date().toISOString() });
});

// ─── Proxy Routes ─────────────────────────────────────────────────────────────
// Use pathFilter so the full original path is forwarded to downstream services.
app.use(createProxyMiddleware({ pathFilter: '/api/v1/auth',     target: AUTH_SERVICE_URL,    changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/v1/users',    target: USER_SERVICE_URL,    changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/v1/catalog',  target: CATALOG_SERVICE_URL, changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/v1/bookings', target: BOOKING_SERVICE_URL, changeOrigin: true }));
app.use(createProxyMiddleware({ pathFilter: '/api/v1/media',    target: MEDIA_SERVICE_URL,   changeOrigin: true }));

// Serve uploaded static files via media-service
app.use(createProxyMiddleware({ pathFilter: '/uploads',         target: MEDIA_SERVICE_URL,   changeOrigin: true }));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[gateway-service] Running on port ${PORT}`);
  console.log(`  → auth:    ${AUTH_SERVICE_URL}`);
  console.log(`  → user:    ${USER_SERVICE_URL}`);
  console.log(`  → catalog: ${CATALOG_SERVICE_URL}`);
  console.log(`  → booking: ${BOOKING_SERVICE_URL}`);
  console.log(`  → media:   ${MEDIA_SERVICE_URL}`);
});

export default app;
