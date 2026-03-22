import { ENV } from '../config/env';

/** Format a date string for display */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
