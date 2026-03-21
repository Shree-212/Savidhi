'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Share2, Play } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExpandableSection } from '@/components/shared/ExpandableSection';
import { ImageSlider } from '@/components/shared/ImageSlider';
import { pujaService } from '@/lib/services';
import { mapPuja } from '@/lib/mappers';
import type { Puja } from '@/data/models';

export default function PujaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [puja, setPuja] = useState<Puja | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pujaService.getById(id)
      .then((res) => {
        const raw = res.data?.data ?? res.data;
        if (raw) setPuja(mapPuja(raw));
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

  if (!puja) {
    return (
      <div className="section-container py-20 text-center text-text-secondary">
        Puja not found. <Link href="/puja" className="text-primary-500 underline">Go back</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Hero slider */}
      <div className="relative h-72 sm:h-96 w-full">
        <ImageSlider
          images={puja.sliderImages ?? (puja.imageUrl ? [puja.imageUrl] : [])}
          alt={puja.name}
          className="h-72 sm:h-96 w-full"
        />
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <Link href="/puja" className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <button className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center hover:bg-black/60 transition">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="section-container py-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{puja.name}</h1>
        {puja.templeName && (
          <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-1">
            <MapPin className="w-4 h-4 text-green-500" />
            {puja.templeName}{puja.templeLocation ? `, ${puja.templeLocation}` : ''}
          </div>
        )}
        {puja.date && (
          <div className="flex items-center gap-4 text-sm text-text-secondary mb-6">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {puja.date}{puja.time ? `, ${puja.time}` : ''}
            </span>
            {puja.countdown && (
              <span className="bg-primary-50 text-primary-600 px-2 py-0.5 rounded-md text-xs font-medium">
                {puja.countdown}
              </span>
            )}
          </div>
        )}

        {puja.benefits.length > 0 && (
          <ExpandableSection title="Benefits Of Puja" initiallyExpanded>
            {puja.benefits.map((b, i) => <p key={i}>• {b}</p>)}
          </ExpandableSection>
        )}

        {puja.ritualsIncluded.length > 0 && (
          <ExpandableSection title="Rituals Included">
            {puja.ritualsIncluded.map((r, i) => <p key={i}>• {r}</p>)}
          </ExpandableSection>
        )}

        {puja.howToDo.length > 0 && (
          <ExpandableSection title="How To Do Puja">
            {puja.howToDo.map((h, i) => <p key={i}>{i + 1}. {h}</p>)}
          </ExpandableSection>
        )}

        {/* Video */}
        {puja.videoThumbnail && (
          <>
            <h3 className="font-semibold text-text-primary text-sm mb-2 mt-4">Video You Will Receive</h3>
            <a href={puja.videoThumbnail} target="_blank" rel="noreferrer" className="relative h-48 rounded-xl overflow-hidden mb-6 flex items-center justify-center bg-black block">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-500 fill-primary-500" />
              </div>
            </a>
          </>
        )}

        {puja.parcelContents.length > 0 && (
          <ExpandableSection title="What's Inside Your Parcel">
            {puja.parcelContents.map((p, i) => <p key={i}>• {p}</p>)}
          </ExpandableSection>
        )}

        {puja.templeId && (
          <Link
            href={`/temples/${puja.templeId}`}
            className="flex items-center justify-between border border-border-DEFAULT rounded-xl px-4 py-3 mb-6 hover:bg-primary-50 transition"
          >
            <span className="text-sm font-medium text-text-primary">Importance Of {puja.templeName}</span>
            <span className="text-primary-500 text-sm">→</span>
          </Link>
        )}

        <div className="sticky bottom-0 bg-white border-t border-border-light py-4 -mx-4 px-4 sm:-mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:static">
          <Link href={`/puja/${puja.id}/book`}>
            <Button className="w-full" size="lg">
              Select Puja{puja.pricePerDevotee ? ` · ₹${puja.pricePerDevotee}` : ''}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
