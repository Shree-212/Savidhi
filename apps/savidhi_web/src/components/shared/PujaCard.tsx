import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Clock } from 'lucide-react';
import type { Puja } from '@/data/models';
import { normaliseMediaUrl, isLocalMediaUrl } from '@/lib/utils';

interface PujaCardProps {
  puja: Puja;
}

export function PujaCard({ puja }: PujaCardProps) {
  return (
    <Link href={`/puja/${puja.slug || puja.id}`} className="group block">
      <div className="card overflow-hidden hover:shadow-md transition-shadow p-0">
        <div className="relative h-44 w-full">
          <Image
            src={normaliseMediaUrl(puja.imageUrl) || '/images/placeholder.jpg'}
            alt={puja.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={isLocalMediaUrl(puja.imageUrl)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white text-xs font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {puja.countdown}
            </p>
          </div>
          {puja.isWeekly && (
            <span className="absolute top-3 left-3 bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              WEEKLY
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-text-primary text-sm group-hover:text-primary-500 transition-colors line-clamp-1">
            {puja.name}
          </h3>
          <p className="text-xs text-text-muted flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {puja.templeName}, {puja.templeLocation}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-text-secondary">{puja.date}</span>
            <span className="text-sm font-bold text-primary-500">
              ₹{puja.pricePerDevotee.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
