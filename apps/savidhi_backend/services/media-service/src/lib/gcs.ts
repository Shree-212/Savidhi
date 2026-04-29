// Google Cloud Storage adapter. Loaded lazily so dev environments without
// GCS env vars (and without @google-cloud/storage installed) keep starting.
//
// Required env vars (production):
//   GCS_MEDIA_BUCKET    public-read bucket for delivered assets
//   GCS_UPLOAD_BUCKET   private bucket for raw uploads (signed URLs only)
//   GOOGLE_APPLICATION_CREDENTIALS or workload identity binding

let gcsClient: any = null;
let gcsLoadAttempted = false;

export const GCS_MEDIA_BUCKET = process.env.GCS_MEDIA_BUCKET;
export const GCS_UPLOAD_BUCKET = process.env.GCS_UPLOAD_BUCKET;

export function isGcsConfigured(): boolean {
  return Boolean(GCS_MEDIA_BUCKET && GCS_UPLOAD_BUCKET);
}

export async function getGcsClient(): Promise<any | null> {
  if (gcsClient || gcsLoadAttempted) return gcsClient;
  gcsLoadAttempted = true;
  if (!isGcsConfigured()) return null;
  try {
    const { Storage } = await import('@google-cloud/storage');
    gcsClient = new Storage();
    console.log('[media-service] GCS client initialised', { GCS_MEDIA_BUCKET, GCS_UPLOAD_BUCKET });
  } catch (err) {
    console.warn('[media-service] Failed to load @google-cloud/storage:', err);
  }
  return gcsClient;
}

/**
 * Generate a V4 signed URL for direct browser upload to the public media bucket.
 *
 * The admin browser PUTs the file straight to storage.googleapis.com via this
 * URL — bypassing the gateway/Cloud Run/multer body-size limits entirely.
 * Bucket policy already grants allUsers `storage.objectViewer` so the resulting
 * `publicUrl` is web-readable without a finalize step.
 */
export async function getGcsUploadSignedUrl(opts: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  const client = await getGcsClient();
  if (!client || !GCS_MEDIA_BUCKET) return null;

  const file = client.bucket(GCS_MEDIA_BUCKET).file(opts.key);
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + (opts.expiresInSeconds ?? 3600) * 1000,
    contentType: opts.contentType,
  });

  const publicUrl = `https://storage.googleapis.com/${GCS_MEDIA_BUCKET}/${opts.key}`;
  return { uploadUrl, publicUrl };
}

/**
 * Server-side upload: write a buffer straight into the public media bucket
 * and return its https://storage.googleapis.com URL. Used by /upload/local
 * so admin clients can POST a multipart form and get back a public URL in
 * one round-trip without dealing with signed-URL flow.
 */
export async function uploadBufferToMediaBucket(opts: {
  key: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string | null> {
  const client = await getGcsClient();
  if (!client || !GCS_MEDIA_BUCKET) return null;

  const file = client.bucket(GCS_MEDIA_BUCKET).file(opts.key);
  await file.save(opts.buffer, {
    contentType: opts.contentType,
    resumable: false,
  });
  return `https://storage.googleapis.com/${GCS_MEDIA_BUCKET}/${opts.key}`;
}
