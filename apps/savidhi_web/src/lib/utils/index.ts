/** Joins class names, filtering falsy values */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Format a date to locale string */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Normalise any uploaded-media URL so it's served via the /api rewrite.
 *  - /api/v1/media/files/... → kept as-is (correct routed form)
 *  - http://localhost:PORT/uploads/xxx.jpg → /api/v1/media/files/xxx.jpg
 *  - /uploads/xxx.jpg → /api/v1/media/files/xxx.jpg
 *  - everything else (https://...) → kept as-is
 */
export function normaliseMediaUrl(url: string): string {
  if (!url) return '';
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

/** Returns true if the URL points to a locally served media file (not an external CDN). */
export function isLocalMediaUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('/api/v1/media/files/') || url.startsWith('/uploads/');
}
