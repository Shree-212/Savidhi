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

export function ImageSlider({ images, alt, className = '', fallback = '/images/placeholder.jpg' }: ImageSliderProps) {
  const [current, setCurrent] = useState(0);
  const validImages = images.filter(Boolean);
  const srcs = validImages.length > 0 ? validImages : [fallback];
  const total = srcs.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        key={srcs[current]}
        src={srcs[current]}
        alt={`${alt} ${current + 1}`}
        fill
        className="object-cover transition-opacity duration-300"
        sizes="100vw"
        priority={current === 0}
        unoptimized
        onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* Arrows — only if multiple images */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {srcs.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition ${i === current ? 'bg-white w-4' : 'bg-white/50'}`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
