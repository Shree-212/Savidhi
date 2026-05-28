'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Sparkles } from 'lucide-react';
import type { Chadhava } from '@/data/models';
import { normaliseMediaUrl, isLocalMediaUrl } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { getRepeatLabel } from '@/lib/repeatLabel';
import { trackEvent } from '@/lib/analytics';

interface ChadhavaCardProps {
  chadhava: Chadhava;
}

export function ChadhavaCard({ chadhava }: ChadhavaCardProps) {
  const t = useT();
  const repeatLabel = getRepeatLabel(t, chadhava);
  return (
    <Link
      href={`/chadhava/${chadhava.slug || chadhava.id}`}
      className="group block"
      onClick={() =>
        trackEvent('view_content', {
          content_type: 'chadhava',
          content_ids: [chadhava.slug || chadhava.id],
          content_name: chadhava.name,
          value: chadhava.startingPrice,
          currency: 'INR',
        })
      }
    >
      <div className="card overflow-hidden hover:shadow-md transition-shadow p-0">
        <div className="relative h-44 w-full">
          <Image
            src={normaliseMediaUrl(chadhava.imageUrl) || '/images/placeholder.jpg'}
            alt={chadhava.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={isLocalMediaUrl(chadhava.imageUrl)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {repeatLabel && (
            <span className="absolute top-3 left-3 bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {repeatLabel}
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-text-primary text-sm group-hover:text-primary-500 transition-colors line-clamp-1">
            {chadhava.name}
          </h3>
          <p className="text-xs text-text-muted flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {chadhava.templeName}, {chadhava.templeLocation}
          </p>
          {chadhava.deityName && (
            <p className="text-xs text-text-muted flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {chadhava.deityName}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-text-secondary">{chadhava.date}</span>
            <span className="text-sm font-bold text-primary-500">
              Arpit Kare ₹{chadhava.startingPrice}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
