'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, Play, User, Loader2 } from 'lucide-react';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { ImageSlider } from '@/components/shared/ImageSlider';
import { templeService } from '@/lib/services';
import { mapTemple } from '@/lib/mappers';
import type { Temple } from '@/data/models';
import { normaliseMediaUrl } from '@/lib/utils';

export default function TempleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [temple, setTemple] = useState<Temple | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templeService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (raw) setTemple(mapTemple(raw));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!temple) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Temple not found. <Link href="/temples" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Hero slider */}
      <div className="relative h-72 sm:h-96 w-full">
        <ImageSlider
          images={temple.images}
          alt={temple.name}
          className="h-72 sm:h-96 w-full"
        />
        <div className="absolute top-4 left-4 z-10">
          <Link href="/temples" className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
        </div>
      </div>

      <div className="section-container py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{temple.name}</h1>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-6">
          <MapPin className="w-4 h-4 text-green-500" />
          {temple.location}{temple.pincode ? `, ${temple.pincode}` : ''}
        </div>

        {temple.pujaris.length > 0 && (
          <ExpandableSection title="Registered Pujari Here" initiallyExpanded>
            <div className="flex gap-4 flex-wrap">
              {temple.pujaris.map((p) => (
                <div key={p.id} className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-border-light flex items-center justify-center mb-1 overflow-hidden relative">
                    {p.imageUrl ? (
                      <Image src={normaliseMediaUrl(p.imageUrl)} alt={p.name} fill className="object-cover" unoptimized sizes="40px" />
                    ) : (
                      <User className="w-5 h-5 text-text-muted" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-text-primary">{p.name}</span>
                  <span className="text-[10px] text-primary-500">{p.role}</span>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {temple.about && (
          <ExpandableSection title="About Temple" initiallyExpanded>
            <p>{temple.about}</p>
          </ExpandableSection>
        )}

        {temple.history && (
          <ExpandableSection title="History & Significance">
            <p>{temple.history}</p>
          </ExpandableSection>
        )}

        {/* Video */}
        {temple.videoThumbnail && (
          <>
            <h3 className="font-semibold text-text-primary text-sm mb-2 mt-4">Our Past Puja Video Here</h3>
            <a href={temple.videoThumbnail} target="_blank" rel="noreferrer" className="relative h-48 rounded-xl overflow-hidden mb-6 flex items-center justify-center bg-black block">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-500 fill-primary-500" />
              </div>
            </a>
          </>
        )}

        {/* Stats */}
        {Number(temple.pujaCount) > 0 && (
          <div className="text-center py-8 border border-border-DEFAULT rounded-xl bg-white">
            <p className="text-4xl font-bold text-primary-500 italic">{temple.pujaCount}+</p>
            <p className="font-semibold text-text-primary mt-1">Puja Done</p>
            <p className="text-xs text-text-secondary">At {temple.name} By Savidhi</p>
          </div>
        )}
      </div>
    </div>
  );
}
