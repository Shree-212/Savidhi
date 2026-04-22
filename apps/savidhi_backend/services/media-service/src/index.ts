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
const PORT = process.env.PORT ?? 4005;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: '*', // Allow all origins for static file serving
  credentials: false,
}));
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
