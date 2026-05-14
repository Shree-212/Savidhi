'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { settingsService } from '@/lib/services';
import { normaliseMediaUrl } from '@/lib/utils';

interface HomeBanner {
  image_url: string;
  target_type: 'puja' | 'chadhava';
  target_id: string;
  target_slug?: string;
  target_name?: string;
}

const AUTOPLAY_MS = 3000;

/**
 * Auto-playing banner strip on the devotee homepage. Admin uploads images via
 * Settings → Devotee App. Each banner links to its associated puja/chadhava;
 * banners whose target has been deactivated are filtered server-side.
 */
export function HomeBannerCarousel() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    settingsService.getHomeBanners()
      .then((res) => {
        if (cancelled) return;
        const data = (res.data?.data ?? []) as HomeBanner[];
        setBanners(data);
      })
      .catch(() => { /* swallow — banners are optional */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setActive((i) => (i + 1) % banners.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const current = banners[active];
  const href = current.target_type === 'puja'
    ? `/puja/${current.target_slug ?? current.target_id}`
    : `/chadhava/${current.target_slug ?? current.target_id}`;

  return (
    <section className="section-container pt-6">
      <div className="relative w-full aspect-[16/6] sm:aspect-[16/5] rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-sm bg-black/5">
        {banners.map((b, i) => (
          <Link
            key={`${b.target_id}-${i}`}
            href={b.target_type === 'puja'
              ? `/puja/${b.target_slug ?? b.target_id}`
              : `/chadhava/${b.target_slug ?? b.target_id}`}
            aria-hidden={i !== active}
            tabIndex={i === active ? 0 : -1}
            className={`absolute inset-0 transition-opacity duration-500 ${i === active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <Image
              src={normaliseMediaUrl(b.image_url)}
              alt={b.target_name ?? 'Featured banner'}
              fill
              priority={i === 0}
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover"
              unoptimized
            />
          </Link>
        ))}

        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80'}`}
              />
            ))}
          </div>
        )}
        {/* Sneaky overlay so href stays clickable even when dots are hovered */}
        <span className="sr-only">{current.target_name}</span>
        {/* Failsafe for screen readers: link target announced */}
        <Link href={href} className="sr-only">Open {current.target_name}</Link>
      </div>
    </section>
  );
}
