import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { Temple } from '@/data/models';

interface TempleCardProps {
  temple: Temple;
}

export function TempleCard({ temple }: TempleCardProps) {
  return (
    <Link href={`/temples/${temple.id}`} className="group block">
      <div className="card overflow-hidden hover:shadow-md transition-shadow p-0">
        <div className="relative h-44 w-full">
          <Image
            src={temple.images?.[0] || '/images/placeholder.jpg'}
            alt={temple.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <span className="text-white text-xs font-medium">{temple.pujaCount}+ Pujas Booked</span>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-text-primary text-sm group-hover:text-primary-500 transition-colors line-clamp-1">
            {temple.name}
          </h3>
          <p className="text-xs text-text-muted flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {temple.location}
          </p>
        </div>
      </div>
    </Link>
  );
}
