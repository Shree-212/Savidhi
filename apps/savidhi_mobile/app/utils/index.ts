import { ENV } from '../config/env';

/** Format a date string for display */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Hindi suffix for the day-of-week tag shown on single-event puja/chadhava
// detail pages, e.g. Monday → "Somvar Visesh". Index 0 = Sunday.
const HINDI_DAY_SUFFIX = [
  'Ravivar Visesh',
  'Somvar Visesh',
  'Mangalvar Visesh',
  'Budhvar Visesh',
  'Guruvar Visesh',
  'Shukravar Visesh',
  'Shanivar Visesh',
] as const;

/**
 * Format an ISO timestamp into the "Mon - 18 May, 2026 - Somvar Visesh" line
 * used on single-event puja/chadhava detail pages. Always formats in IST so
 * the weekday matches the temple's local calendar regardless of the device
 * timezone. Returns '' on bad input rather than throwing.
 */
export function formatEventDateWithHindiDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  // weekday index in IST — re-derive via toLocaleString to dodge UTC drift.
  const istDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dow = istDate.getDay();
  return `${parts.weekday} - ${parts.day} ${parts.month}, ${parts.year} - ${HINDI_DAY_SUFFIX[dow]}`;
}

/** Truncate a string to maxLength */
export function truncate(str: string, maxLength = 100): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

/**
 * Resolve a media URL returned by the API into an absolute URL
 * that React Native's Image component can load.
 *
 * Handles these cases:
 *  - /api/v1/media/files/xxx.jpg  → prepends API_URL
 *  - /uploads/xxx.jpg             → converts to /api/v1/media/files/ and prepends API_URL
 *  - http://localhost:PORT/uploads/xxx.jpg → converts to absolute API media URL
 *  - https://... (external)       → kept as-is
 *  - empty / falsy                → returns empty string
 */
export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return '';

  // Already an absolute non-localhost URL (e.g. Unsplash, CDN) — keep as-is
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://') && !url.includes('localhost')) return url;

  // localhost absolute URL with /uploads/ path
  if (url.startsWith('http://localhost') || url.startsWith('http://10.0.2.2')) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/uploads/')) {
        const filename = parsed.pathname.replace('/uploads/', '');
        return `${ENV.API_URL}/api/v1/media/files/${filename}`;
      }
      // Already has /api/v1/media/files path
      return `${ENV.API_URL}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  // Relative /uploads/ path
  if (url.startsWith('/uploads/')) {
    const filename = url.replace('/uploads/', '');
    return `${ENV.API_URL}/api/v1/media/files/${filename}`;
  }

  // Relative /api/ path (the most common case from current backend)
  if (url.startsWith('/api/')) {
    return `${ENV.API_URL}${url}`;
  }

  // Relative path without leading /api — assume it's a filename
  if (!url.startsWith('http')) {
    return `${ENV.API_URL}/api/v1/media/files/${url}`;
  }

  return url;
}
