'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageSliderProps {
  images: string[];
  alt: string;
  className?: string;
  fallback?: string;
}

/** Normalise any uploaded-media URL so it's served via the /api rewrite (always active). */
function normaliseUrl(url: string): string {
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

/**
 * Gallery-style image slider:
 *  - Main image on top with chevron arrows + counter pill.
 *  - Horizontal thumbnail rail beneath (same on mobile and desktop).
 *  - Active thumbnail: primary-colour ring + offset; inactive: dim, hover to brighten.
 * Component manages its own aspect ratio; pass `className` only for outer
 * margin/positioning, not height.
 */
export function ImageSlider({ images, alt, className = '', fallback = '/images/placeholder.jpg' }: ImageSliderProps) {
  const [current, setCurrent] = useState(0);
  const validImages = images.filter(Boolean).map(normaliseUrl);
  const srcs = validImages.length > 0 ? validImages : [fallback];
  const total = srcs.length;
  const hasMultiple = total > 1;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <div className={`w-full ${className}`}>
      {/* Main image — tighter aspect on mobile so the gallery doesn't eat the fold */}
      <div className="relative aspect-[16/10] sm:aspect-[3/2] rounded-2xl overflow-hidden bg-black/5 ring-1 ring-black/5 shadow-sm">
        <Image
          key={srcs[current]}
          src={srcs[current]}
          alt={`${alt} ${current + 1}`}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, 55vw"
          priority={current === 0}
          unoptimized
          onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
        />

        {/* Counter pill */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full px-2.5 py-1 z-10 tabular-nums tracking-wide">
            {current + 1} / {total}
          </div>
        )}

        {/* Arrows */}
        {hasMultiple && (
          <>
            <button
              onClick={prev}
              className="group absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 text-text-primary group-hover:-translate-x-0.5 transition" />
            </button>
            <button
              onClick={next}
              className="group absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 text-text-primary group-hover:translate-x-0.5 transition" />
            </button>
          </>
        )}
      </div>

      {/* Horizontal thumbnail rail — beneath the main image on every screen */}
      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-3 -mx-1 px-1">
          {srcs.map((src, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === current ? 'true' : undefined}
              className={`relative aspect-square w-16 sm:w-20 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                i === current
                  ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface-warm shadow-md'
                  : 'ring-1 ring-black/5 opacity-65 hover:opacity-100'
              }`}
            >
              <Image
                src={src}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
