'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageSliderProps {
  images: string[];
  alt: string;
  className?: string;
  fallback?: string;
  /** Auto-advance interval in ms. Set 0 to disable. Defaults to 3000ms. */
  autoplayMs?: number;
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
 *  - Main image auto-slides every 3 s (configurable); pauses while the user
 *    interacts (arrows / thumbnail click). Tapping the main image opens a
 *    full-screen lightbox with pinch / wheel zoom.
 *  - Horizontal thumbnail rail beneath; active thumb gets a primary ring.
 */
export function ImageSlider({ images, alt, className = '', fallback = '/images/placeholder.jpg', autoplayMs = 3000 }: ImageSliderProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const validImages = images.filter(Boolean).map(normaliseUrl);
  const srcs = validImages.length > 0 ? validImages : [fallback];
  const total = srcs.length;
  const hasMultiple = total > 1;

  const prev = () => { setPaused(true); setCurrent((c) => (c - 1 + total) % total); };
  const next = () => { setPaused(true); setCurrent((c) => (c + 1) % total); };
  const goto = (i: number) => { setPaused(true); setCurrent(i); };

  // Auto-advance the main image. Pauses if the user has interacted (paused=true)
  // or the lightbox is open so it doesn't move out from under their zoom.
  useEffect(() => {
    if (!hasMultiple || paused || lightboxOpen || !autoplayMs) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % total), autoplayMs);
    return () => clearInterval(t);
  }, [hasMultiple, paused, lightboxOpen, autoplayMs, total]);

  // ESC closes lightbox. Wheel zooms.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') setCurrent((c) => (c - 1 + total) % total);
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % total);
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 4));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 1));
      if (e.key === '0') setZoom(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxOpen, total]);

  // Body scroll lock while the lightbox is open.
  useEffect(() => {
    if (!lightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [lightboxOpen]);

  const openLightbox = () => { setZoom(1); setLightboxOpen(true); };

  return (
    <div className={`w-full ${className}`}>
      {/* Main image — tighter aspect on mobile so the gallery doesn't eat the fold */}
      <button
        type="button"
        onClick={openLightbox}
        aria-label="Open image in full screen"
        className="relative aspect-[16/10] sm:aspect-[3/2] w-full rounded-2xl overflow-hidden bg-black/5 ring-1 ring-black/5 shadow-sm cursor-zoom-in"
      >
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
          <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full px-2.5 py-1 z-10 tabular-nums tracking-wide">
            {current + 1} / {total}
          </span>
        )}

        {/* Arrows */}
        {hasMultiple && (
          <>
            <span
              onClick={(e) => { e.stopPropagation(); prev(); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); prev(); } }}
              className="group absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg z-10 cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 text-text-primary group-hover:-translate-x-0.5 transition" />
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); next(); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); next(); } }}
              className="group absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg z-10 cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 text-text-primary group-hover:translate-x-0.5 transition" />
            </span>
          </>
        )}
      </button>

      {/* Horizontal thumbnail rail — beneath the main image on every screen */}
      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-3 -mx-1 px-1">
          {srcs.map((src, i) => (
            <button
              key={i}
              onClick={() => goto(i)}
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

      {/* Lightbox — full screen, zoomable */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => Math.min(4, Math.max(1, z + (e.deltaY > 0 ? -0.15 : 0.15))));
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Zoom controls */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(1, z - 0.25)); }}
              className="px-2 py-0.5 hover:bg-white/15 rounded"
              aria-label="Zoom out"
            >−</button>
            <span className="tabular-nums w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(4, z + 0.25)); }}
              className="px-2 py-0.5 hover:bg-white/15 rounded"
              aria-label="Zoom in"
            >+</button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoom(1); }}
              className="px-2 py-0.5 hover:bg-white/15 rounded text-[10px]"
              aria-label="Reset zoom"
            >100%</button>
          </div>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div
            className="max-w-[95vw] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={srcs[current]}
              alt={`${alt} ${current + 1}`}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}
              className="max-w-[95vw] max-h-[90vh] object-contain select-none"
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
