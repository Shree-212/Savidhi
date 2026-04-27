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

/** Generate a V4 signed URL for direct browser upload to the private bucket. */
export async function getGcsUploadSignedUrl(opts: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; publicUrl: string } | null> {
  const client = await getGcsClient();
  if (!client || !GCS_UPLOAD_BUCKET || !GCS_MEDIA_BUCKET) return null;

  const file = client.bucket(GCS_UPLOAD_BUCKET).file(opts.key);
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + (opts.expiresInSeconds ?? 3600) * 1000,
    contentType: opts.contentType,
  });

  // After upload, the asset is moved/copied to the public media bucket via a
  // separate finalize step. For now return the public-bucket URL it will end up at.
  const publicUrl = `https://storage.googleapis.com/${GCS_MEDIA_BUCKET}/${opts.key}`;
  return { uploadUrl, publicUrl };
}
