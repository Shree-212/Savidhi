'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, Film, ImageIcon, Loader2 } from 'lucide-react';

/** Normalise any uploaded-media URL so it's served via the /api rewrite (already active).
 *  - /api/v1/media/files/... → kept as-is (correct new format)
 *  - http://localhost:PORT/uploads/xxx.jpg → /api/v1/media/files/xxx.jpg
 *  - /uploads/xxx.jpg → /api/v1/media/files/xxx.jpg
 *  - everything else (https://...) → kept as-is */
function normaliseUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/api/v1/media/files/')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' && parsed.pathname.startsWith('/uploads/')) {
      const filename = parsed.pathname.replace('/uploads/', '');
      return `/api/v1/media/files/${filename}`;
    }
  } catch { /* not an absolute URL */ }
  if (url.startsWith('/uploads/')) {
    const filename = url.replace('/uploads/', '');
    return `/api/v1/media/files/${filename}`;
  }
  return url;
}

/**
 * Two-step upload: ask media-service for a V4 signed URL, then PUT the
 * file straight to storage.googleapis.com. The browser → GCS hop bypasses
 * Cloud Run / GKE Ingress / multer body-size limits, so videos and other
 * large files upload without further infra tuning.
 *
 * Step 1 (small JSON request, same-origin via Next.js /api rewrite — cookie
 * carries auth) → server returns { uploadUrl, fileUrl }.
 * Step 2 (PUT direct to GCS, cross-origin — bucket has CORS allowing PUT
 * from admin.savidhi.in).
 */
async function uploadFile(file: File): Promise<string> {
  const presignRes = await fetch('/api/v1/media/upload/presigned-url', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder: 'uploads',
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  if (!presignRes.ok) {
    let message = presignRes.statusText;
    try {
      const j = await presignRes.json();
      if (j?.message) message = j.message;
    } catch { /* keep statusText */ }
    throw new Error(`Could not get upload URL (${presignRes.status}): ${message}`);
  }
  const { uploadUrl, fileUrl, success, message } = await presignRes.json();
  if (success === false || !uploadUrl || !fileUrl) {
    throw new Error(message || 'Could not get upload URL');
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status}): ${putRes.statusText}`);
  }

  return fileUrl;
}

/* ─── Single file upload (image or video) ─────────────────────────────────── */
interface MediaUploadSingleProps {
  value: string;
  onChange: (url: string) => void;
  accept: string;
  label: string;
  type?: 'image' | 'video';
}

export function MediaUploadSingle({ value, onChange, accept, label, type = 'image' }: MediaUploadSingleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-3">
      <p className="text-[10px] font-bold mb-2">{label}</p>
      <div
        className="bg-accent rounded-lg h-20 flex items-center justify-center cursor-pointer hover:bg-accent/80 transition relative overflow-hidden group"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : value ? (
          type === 'video' ? (
            <div className="flex flex-col items-center gap-1">
              <Film className="w-6 h-6 text-primary" />
              <span className="text-[10px] text-primary font-medium">Video ready</span>
              <span className="text-[9px] text-muted-foreground">Click to replace</span>
            </div>
          ) : (
            <Image src={normaliseUrl(value)} alt={label} fill className="object-cover rounded-lg" unoptimized sizes="200px" />
          )
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            {type === 'video' ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            <span className="text-[10px]">Click to upload</span>
          </div>
        )}
        {value && !uploading && (
          <button
            className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            title="Remove"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* ─── Multi-image upload ───────────────────────────────────────────────────── */
interface MediaUploadMultiProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label: string;
}

export function MediaUploadMulti({ value, onChange, label }: MediaUploadMultiProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setError('');
    try {
      const urls = await Promise.all(Array.from(files).map(uploadFile));
      onChange([...(value ?? []), ...urls]);
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-3">
      <p className="text-[10px] font-bold mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {(value ?? []).map((url, idx) => (
          <div key={idx} className="relative w-14 h-14 rounded-md overflow-hidden border border-border group">
            <Image src={normaliseUrl(url)} alt="" fill className="object-cover" unoptimized sizes="56px" />
            <button
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
              onClick={() => onChange((value ?? []).filter((_, i) => i !== idx))}
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}
        <div
          className="w-14 h-14 bg-accent rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-accent/80 transition border border-dashed border-border"
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground mt-0.5">Add</span>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
