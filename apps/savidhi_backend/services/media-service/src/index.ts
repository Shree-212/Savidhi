import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { mediaRouter } from './routes/media';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ?? 4005;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// CORS:
//  - /uploads and /api/v1/media/files/* are static image fetches; keep them
//    permissive (origin: *, no credentials) so any frontend can <img src=…>.
//  - Everything else (upload endpoints, presigned-url issuance, etc.) is
//    credentialed and must come from an allow-listed origin matching the
//    gateway's CORS_ORIGIN. Wildcard with credentials is illegal in browsers.
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(',');
app.use((req, res, next) => {
  const isPublicAsset =
    req.path.startsWith('/uploads/') ||
    req.path.startsWith('/api/v1/media/files/');
  return cors({
    origin: isPublicAsset ? '*' : allowedOrigins,
    credentials: !isPublicAsset,
  })(req, res, next);
});
app.use(express.json());
const _isProd = process.env.NODE_ENV === 'production';
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: _isProd ? 500 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Static file serving — uploaded media ─────────────────────────────────────
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1d',
  etag: true,
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'media-service', timestamp: new Date().toISOString() });
});

app.use('/api/v1/media', mediaRouter);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[media-service] Running on port ${PORT}`);
});

export default app;
