import Image from 'next/image';
import Link from 'next/link';
import { Star, Bookmark } from 'lucide-react';
import type { Astrologer } from '@/data/models';

interface AstrologerCardProps {
  astrologer: Astrologer;
}

export function AstrologerCard({ astrologer }: AstrologerCardProps) {
  return (
    <Link href={`/consult/${astrologer.id}`} className="group block">
      <div className="card hover:shadow-md transition-shadow flex gap-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
          <Image
            src={astrologer.imageUrl || '/images/placeholder.jpg'}
            alt={astrologer.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm text-text-primary group-hover:text-primary-500 transition-colors">
                {astrologer.name}
              </h3>
              <p className="text-xs text-text-muted">{astrologer.specialty}</p>
            </div>
            <Bookmark
              className={`w-4 h-4 shrink-0 ${
                astrologer.isBookmarked
                  ? 'fill-primary-500 text-primary-500'
                  : 'text-text-muted'
              }`}
            />
          </div>
          <p className="text-xs text-text-secondary">{astrologer.experience}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-text-muted">{astrologer.appointmentsBooked} appointments</span>
            <span className="font-bold text-primary-500">₹{astrologer.pricePerMin}/min</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {astrologer.languages.map((lang) => (
              <span key={lang} className="text-[10px] px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full">
                {lang}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
