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

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Convert "Durga Navami Upasana Puja" → "durga-navami-upasana-puja" for use in URLs. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')       // drop non-alphanum (keep spaces/hyphens)
    .trim()
    .replace(/\s+/g, '-')               // spaces → hyphens
    .replace(/-+/g, '-')                // collapse repeats
    .replace(/^-|-$/g, '');             // trim edges
}

/** Build a slug-id URL segment for SEO-friendly detail URLs.
 *  e.g. slugWithId("Durga Navami Upasana Puja", "ee100000-...") →
 *       "durga-navami-upasana-puja-ee100000-0000-0000-0000-000000000003"
 *  The trailing UUID is required so the route handler can resolve the entity. */
export function slugWithId(name: string | undefined | null, id: string): string {
  if (!id) return '';
  const slug = name ? slugify(name) : '';
  return slug ? `${slug}-${id}` : id;
}

/** Extract the canonical UUID from a slug-id URL segment.
 *  Accepts either a slug-id ("durga-navami-puja-ee100000-...") or a bare UUID. */
export function extractIdFromSlug(slugOrId: string): string {
  if (!slugOrId) return slugOrId;
  const match = slugOrId.match(UUID_RE);
  return match ? match[0] : slugOrId;
}
