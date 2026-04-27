import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
import { isGcsConfigured, getGcsUploadSignedUrl } from '../lib/gcs';

const router = Router();

// ─── S3 setup (lazy – only when env vars are present) ─────────────────────────
let s3Client: any = null;
let s3Bucket: string | undefined;

const S3_REGION = process.env.S3_REGION;
const S3_ENDPOINT = process.env.S3_ENDPOINT; // e.g. MinIO URL
s3Bucket = process.env.S3_BUCKET;

if (S3_REGION && s3Bucket) {
  // Dynamic import keeps the service startable even without the SDK at runtime
  (async () => {
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      s3Client = new S3Client({
        region: S3_REGION,
        ...(S3_ENDPOINT && {
          endpoint: S3_ENDPOINT,
          forcePathStyle: true, // required for MinIO
        }),
      });
      console.log('[media-service] S3 client initialised');
    } catch (err) {
      console.warn('[media-service] Failed to initialise S3 client:', err);
    }
  })();
} else {
  console.warn(
    '[media-service] S3 env vars (S3_BUCKET, S3_REGION) not set – only local uploads are available',
  );
}

// ─── Multer for local uploads ─────────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── POST /upload/presigned-url ───────────────────────────────────────────────
router.post('/upload/presigned-url', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { folder, fileName, contentType } = req.body;

    if (!folder || !fileName || !contentType) {
      res.status(400).json({ success: false, message: 'folder, fileName and contentType are required' });
      return;
    }

    // Prefer GCS in production. Fall back to S3/MinIO if configured.
    if (isGcsConfigured()) {
      const key = `${folder}/${uuidv4()}-${fileName}`;
      const signed = await getGcsUploadSignedUrl({ key, contentType });
      if (signed) {
        res.json({ success: true, uploadUrl: signed.uploadUrl, fileUrl: signed.publicUrl, key });
        return;
      }
      // Fall through to S3 if GCS module failed to load.
    }

    if (!s3Client || !s3Bucket) {
      res.status(503).json({
        success: false,
        message: 'No object storage configured. Set GCS_MEDIA_BUCKET+GCS_UPLOAD_BUCKET (prod) or S3_BUCKET+S3_REGION (dev). Use /upload/local for local development.',
      });
      return;
    }

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const key = `${folder}/${uuidv4()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    const fileUrl = S3_ENDPOINT
      ? `${S3_ENDPOINT}/${s3Bucket}/${key}`
      : `https://${s3Bucket}.s3.${S3_REGION}.amazonaws.com/${key}`;

    res.json({ success: true, uploadUrl, fileUrl, key });
  } catch (err) {
    next(err);
  }
});

// ─── POST /upload/local ───────────────────────────────────────────────────────
router.post('/upload/local', requireAuth, upload.single('file'), (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  // Return an /api/v1/media/files/:filename URL so it's served through
  // the existing /api rewrite in Next.js — no extra proxy routes needed.
  const fileUrl = `/api/v1/media/files/${file.filename}`;

  res.json({
    success: true,
    fileUrl,
    key: file.filename,
    originalName: file.originalname,
    size: file.size,
  });
});

// ─── GET /files/*path — serve locally-uploaded files (incl. subdirectories) ──
// Uses a wildcard param so seed-asset paths like /files/seed/pujas/abc/1.jpg
// resolve to <UPLOAD_DIR>/seed/pujas/abc/1.jpg.
// Path traversal defence: normalise the requested path and reject anything
// that escapes UPLOAD_DIR.
router.get('/files/*', (req: Request, res: Response) => {
  // req.params[0] contains everything after /files/
  const requested = (req.params as any)[0] as string || '';
  const resolved = path.resolve(UPLOAD_DIR, requested);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    res.status(400).json({ success: false, message: 'Invalid path' });
    return;
  }
  if (!fs.existsSync(resolved)) {
    res.status(404).json({ success: false, message: 'File not found' });
    return;
  }
  res.sendFile(resolved);
});

// ─── DELETE /images/:key ──────────────────────────────────────────────────────
router.delete('/images/:key', requireAuth, (_req: Request, res: Response) => {
  // Placeholder – in production this would remove the object from S3 / mark as deleted in DB
  res.json({ success: true, message: 'Image marked for deletion' });
});

export { router as mediaRouter };
